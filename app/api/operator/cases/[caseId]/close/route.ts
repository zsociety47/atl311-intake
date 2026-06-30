import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { CaseStatus } from '@/app/generated/prisma/enums'
import { sendCaseClosedNotification } from '@/lib/email'
import { getOperatorSession } from '@/lib/auth'

const CLOSE_CATEGORIES = [
  'UNINTELLIGIBLE',
  'DUPLICATE',
  'OUT_OF_JURISDICTION',
  'ALREADY_RESOLVED',
  'NEEDS_MORE_INFO',
  'OTHER',
] as const

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

  const { category, description } = body

  if (
    typeof category !== 'string' ||
    !(CLOSE_CATEGORIES as ReadonlyArray<string>).includes(category)
  ) {
    return Response.json({ error: 'Valid close category is required' }, { status: 400 })
  }

  if (typeof description !== 'string' || !description.trim()) {
    return Response.json({ error: 'Description is required' }, { status: 400 })
  }

  const existing = await db.case.findUnique({ where: { id: caseId } })
  if (!existing) {
    return Response.json({ error: 'Case not found' }, { status: 404 })
  }

  if (existing.status === CaseStatus.CLOSED) {
    return Response.json({ error: 'Case is already closed' }, { status: 422 })
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.case.update({
        where: { id: caseId },
        data: { status: CaseStatus.CLOSED },
      })
      await tx.statusHistory.create({
        data: {
          caseId,
          fromStatus: existing.status,
          toStatus: CaseStatus.CLOSED,
          note: JSON.stringify({ category, description: description.trim() }),
        },
      })
      await tx.auditLog.create({
        data: {
          caseId,
          operatorId: null,
          action: 'CLOSE',
          context: {
            previousStatus: existing.status,
            category,
            description: description.trim(),
          },
        },
      })
    })

    if (existing.residentEmail) {
      try {
        await sendCaseClosedNotification(existing.residentEmail, {
          ticketId: existing.publicId,
          category: category as string,
          description: (description as string).trim(),
        })
      } catch (err) {
        console.error('Case closed notification email failed:', err)
      }
    }

    return Response.json({ success: true, caseId })
  } catch (err) {
    console.error('Close error:', err)
    return Response.json({ error: 'Failed to close case' }, { status: 500 })
  }
}
