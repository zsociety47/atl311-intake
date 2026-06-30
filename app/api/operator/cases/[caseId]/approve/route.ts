import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { CaseStatus } from '@/app/generated/prisma/enums'
import { getOperatorSession } from '@/lib/auth'

const APPROVABLE_STATUSES = new Set<CaseStatus>([
  CaseStatus.SUBMITTED,
  CaseStatus.ROUTED,
  CaseStatus.IN_REVIEW,
])

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  if (!(await getOperatorSession())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { caseId } = await params

  const existing = await db.case.findUnique({ where: { id: caseId } })
  if (!existing) {
    return Response.json({ error: 'Case not found' }, { status: 404 })
  }

  if (!APPROVABLE_STATUSES.has(existing.status)) {
    return Response.json(
      { error: `Cannot approve a case with status ${existing.status}` },
      { status: 422 },
    )
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.case.update({
        where: { id: caseId },
        data: { status: CaseStatus.APPROVED },
      })
      await tx.statusHistory.create({
        data: {
          caseId,
          fromStatus: existing.status,
          toStatus: CaseStatus.APPROVED,
        },
      })
      await tx.auditLog.create({
        data: {
          caseId,
          operatorId: null,
          action: 'APPROVE',
          context: { previousStatus: existing.status },
        },
      })
    })

    return Response.json({
      caseId,
      status: CaseStatus.APPROVED,
      message: 'Case approved successfully.',
    })
  } catch (err) {
    console.error('Approve error:', err)
    return Response.json({ error: 'Failed to approve case' }, { status: 500 })
  }
}
