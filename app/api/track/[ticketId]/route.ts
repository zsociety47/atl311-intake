import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params
  const normalized = ticketId.trim().toUpperCase()

  const c = await db.case.findUnique({
    where: { publicId: normalized },
    include: {
      routings: { orderBy: { createdAt: 'asc' } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!c) {
    return Response.json({ error: 'Case not found' }, { status: 404 })
  }

  return Response.json({
    publicId: c.publicId,
    category: c.category,
    address: c.address,
    status: c.status,
    sanitizedDescription: c.sanitizedDescription,
    createdAt: c.createdAt.toISOString(),
    routingHistory: c.routings.map((r) => ({
      department: r.department,
      decisionSource: r.decisionSource,
      confidence: r.confidence !== null ? Number(r.confidence) : null,
      reasoningSummary: r.reasoningSummary,
      createdAt: r.createdAt.toISOString(),
    })),
    statusTimeline: c.statusHistory.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
  })
}
