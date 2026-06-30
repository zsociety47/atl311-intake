import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { anthropic } from '@/lib/anthropic'
import { CaseStatus, RoutingSource } from '@/app/generated/prisma/enums'
import { sendSubmissionConfirmation } from '@/lib/email'

const DEPARTMENTS = [
  'PARKS',
  'WATERSHED',
  'DOT',
  'PERMITS',
  'SUPPORTIVE_SERVICES',
  'OTHER',
] as const

type Department = (typeof DEPARTMENTS)[number]

type RoutingDecision = {
  department: Department
  confidence: number
  reason: string
}

const SYSTEM_PROMPT = `You are a routing engine for ATL 311, Atlanta's non-emergency city services platform.

Given a resident's service request, route it to the correct city department using the route_case tool.

Department definitions:
- PARKS: Atlanta Parks & Recreation — tree removal/trimming on public land, park maintenance, broken playground equipment, athletic fields, greenspace issues
- WATERSHED: Atlanta Department of Watershed Management — water main breaks, sewage backups, stormwater flooding, water quality complaints, drainage issues
- DOT: Atlanta Department of Transportation — potholes, road damage, cracked sidewalks, broken traffic signals, missing street signs, broken streetlights
- PERMITS: Atlanta Office of Buildings — unpermitted construction, building code violations, abandoned/unsafe structures, zoning violations, illegal dumping
- SUPPORTIVE_SERVICES: Atlanta Human Services — unhoused individuals needing services, encampment concerns, social service referrals
- OTHER: Use only when the request clearly does not match any department above

Confidence scoring:
- 90–100: Clearly fits one department, no ambiguity
- 70–89: Strong match, minor ambiguity
- 50–69: Reasonable match with some overlap possible
- 0–49: Unclear; prefer OTHER over a low-confidence specific department

Route based primarily on the description. Override the resident's suggested category if the description clearly indicates a different department.`

function sanitizeDescription(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
    .trim()
}

async function routeWithClaude(category: string, sanitizedDescription: string): Promise<RoutingDecision> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Resident-selected category: ${category}\nDescription: ${sanitizedDescription}`,
      },
    ],
    tools: [
      {
        name: 'route_case',
        description: 'Route the service request to the appropriate Atlanta city department',
        input_schema: {
          type: 'object' as const,
          properties: {
            department: {
              type: 'string',
              enum: [...DEPARTMENTS],
              description: 'The department to route this case to',
            },
            confidence: {
              type: 'number',
              description: 'Routing confidence score from 0 to 100',
            },
            reason: {
              type: 'string',
              description: 'One sentence explaining the routing decision',
            },
          },
          required: ['department', 'confidence', 'reason'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'route_case' },
  })

  const toolUse = response.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude returned no routing decision')
  }

  const decision = toolUse.input as RoutingDecision
  if (!(DEPARTMENTS as ReadonlyArray<string>).includes(decision.department)) {
    decision.department = 'OTHER'
  }
  return decision
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { residentName, residentEmail, residentPhone, address, isPublic, ownerOrTenant, category, description } = body

  const requiresOwnerOrTenant = isPublic === false
  const hasEmail = typeof residentEmail === 'string' && residentEmail.trim().length > 0
  const hasPhone = typeof residentPhone === 'string' && residentPhone.trim().length > 0

  if (
    typeof residentName !== 'string' || !residentName.trim() ||
    (!hasEmail && !hasPhone) ||
    typeof address !== 'string' || !address.trim() ||
    typeof isPublic !== 'boolean' ||
    typeof category !== 'string' || !category.trim() ||
    typeof description !== 'string' || !description.trim() ||
    (requiresOwnerOrTenant && (typeof ownerOrTenant !== 'string' || !ownerOrTenant.trim()))
  ) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
  }

  const effectiveOwnerOrTenant = requiresOwnerOrTenant
    ? (ownerOrTenant as string)
    : 'Public Property'
  const sanitizedDescription = sanitizeDescription(description)

  let routing: RoutingDecision
  try {
    routing = await routeWithClaude(category, sanitizedDescription)
  } catch (err) {
    console.error('Claude routing error:', err)
    return Response.json({ error: 'Routing service unavailable' }, { status: 503 })
  }

  // Pre-generate ID so publicId can be derived before the INSERT
  const id = crypto.randomUUID()
  const ticketId = id.replace(/-/g, '').slice(0, 6).toUpperCase()

  try {
    await db.$transaction(async (tx) => {
      await tx.case.create({
        data: {
          id,
          publicId: ticketId,
          residentName,
          residentEmail: hasEmail ? (residentEmail as string).trim() : undefined,
          phone: hasPhone ? (residentPhone as string).trim() : undefined,
          address,
          isPublic,
          ownerOrTenant: effectiveOwnerOrTenant,
          category,
          description,
          sanitizedDescription,
          status: CaseStatus.SUBMITTED,
        },
      })

      await tx.statusHistory.create({
        data: {
          caseId: id,
          fromStatus: null,
          toStatus: CaseStatus.SUBMITTED,
        },
      })

      await tx.routing.create({
        data: {
          caseId: id,
          department: routing.department,
          decisionSource: RoutingSource.CLAUDE,
          confidence: routing.confidence / 100,
          reasoningSummary: routing.reason,
        },
      })

      await tx.case.update({
        where: { id },
        data: { status: CaseStatus.ROUTED },
      })

      await tx.statusHistory.create({
        data: {
          caseId: id,
          fromStatus: CaseStatus.SUBMITTED,
          toStatus: CaseStatus.ROUTED,
        },
      })
    })
  } catch (err) {
    console.error('Database error:', err)
    return Response.json({ error: 'Failed to save case' }, { status: 500 })
  }

  if (hasEmail) {
    try {
      await sendSubmissionConfirmation((residentEmail as string).trim(), {
        ticketId,
        department: routing.department,
      })
    } catch (err) {
      console.error('Submission confirmation email failed:', err)
    }
  }

  const deptLabel = routing.department.replace(/_/g, ' ')
  return Response.json({
    caseId: id,
    ticketId,
    message: `Your request has been submitted and routed to ${deptLabel}.`,
  })
}
