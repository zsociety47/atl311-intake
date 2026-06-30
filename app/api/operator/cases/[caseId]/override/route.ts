import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { CaseStatus, RoutingSource } from '@/app/generated/prisma/enums'
import { getOperatorSession } from '@/lib/auth'

const VALID_DEPARTMENTS = [
  'PARKS',
  'WATERSHED',
  'DOT',
  'PERMITS',
  'SUPPORTIVE_SERVICES',
  'OTHER',
] as const

const OVERRIDABLE_STATUSES = new Set<CaseStatus>([
  CaseStatus.SUBMITTED,
  CaseStatus.ROUTED,
  CaseStatus.IN_REVIEW,
])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  if (!(await getOperatorSession())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { caseId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { department, reason } = body

  if (
    typeof department !== 'string' ||
    !(VALID_DEPARTMENTS as ReadonlyArray<string>).includes(department) ||
    typeof reason !== 'string' ||
    !reason.trim()
  ) {
    return Response.json({ error: 'Valid department and reason are required' }, { status: 400 })
  }

  const existing = await db.case.findUnique({ where: { id: caseId } })
  if (!existing) {
    return Response.json({ error: 'Case not found' }, { status: 404 })
  }

  if (!OVERRIDABLE_STATUSES.has(existing.status)) {
    return Response.json(
      { error: `Cannot override a case with status ${existing.status}` },
      { status: 422 },
    )
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.routing.create({
        data: {
          caseId,
          department,
          decisionSource: RoutingSource.MANUAL,
          reasoningSummary: reason.trim(),
        },
      })
      await tx.case.update({
        where: { id: caseId },
        data: { status: CaseStatus.APPROVED },
      })
      await tx.statusHistory.create({
        data: {
          caseId,
          fromStatus: existing.status,
          toStatus: CaseStatus.APPROVED,
          note: `Manual override: routed to ${department}`,
        },
      })
      await tx.auditLog.create({
        data: {
          caseId,
          operatorId: null,
          action: 'OVERRIDE',
          context: {
            previousStatus: existing.status,
            department,
            reason: reason.trim(),
          },
        },
      })
    })

    return Response.json({
      caseId,
      department,
      status: CaseStatus.APPROVED,
      message: `Case overridden and routed to ${department}.`,
    })
  } catch (err) {
    console.error('Override error:', err)
    return Response.json({ error: 'Failed to override case' }, { status: 500 })
  }
}
