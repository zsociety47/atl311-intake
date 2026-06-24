import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { CaseStatus } from '@/app/generated/prisma/enums'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params

  const existing = await db.case.findUnique({ where: { id: caseId } })
  if (!existing) {
    return Response.json({ error: 'Case not found' }, { status: 404 })
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
