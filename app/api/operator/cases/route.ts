import { db } from '@/lib/db'
import { CaseStatus } from '@/app/generated/prisma/enums'
import { getOperatorSession } from '@/lib/auth'

export async function GET() {
  if (!(await getOperatorSession())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cases = await db.case.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        routings: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    const formattedCases = cases.map((c) => {
      const latestRouting = c.routings.length > 0 ? c.routings[c.routings.length - 1] : null
      return {
        id: c.id,
        publicId: c.publicId,
        residentName: c.residentName,
        address: c.address,
        category: c.category,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        sanitizedDescription: c.sanitizedDescription,
        latestRouting: latestRouting
          ? {
              department: latestRouting.department,
              decisionSource: latestRouting.decisionSource,
              confidence:
                latestRouting.confidence !== null ? Number(latestRouting.confidence) : null,
              reasoningSummary: latestRouting.reasoningSummary,
              createdAt: latestRouting.createdAt.toISOString(),
            }
          : null,
        routingHistory: c.routings.map((r) => ({
          department: r.department,
          decisionSource: r.decisionSource,
          createdAt: r.createdAt.toISOString(),
        })),
      }
    })

    const openCases = cases.filter(
      (c) =>
        c.status === CaseStatus.SUBMITTED ||
        c.status === CaseStatus.ROUTED ||
        c.status === CaseStatus.IN_REVIEW,
    ).length

    const claudeRoutedCases = cases.filter((c) => {
      const latest = c.routings[c.routings.length - 1]
      return latest?.decisionSource === 'CLAUDE'
    }).length

    // Stored as 0–1; threshold 0.70 mirrors the system prompt's "strong match" boundary
    const lowConfidenceCases = cases.filter((c) => {
      const latest = c.routings[c.routings.length - 1]
      return (
        latest !== undefined &&
        latest.confidence !== null &&
        Number(latest.confidence) < 0.7
      )
    }).length

    const manualOverrides = cases.filter((c) =>
      c.routings.some((r) => r.decisionSource === 'MANUAL'),
    ).length

    const approvedCases = cases.filter((c) => c.status === CaseStatus.APPROVED)
    const approvedWithClaudeLatest = approvedCases.filter((c) => {
      const latest = c.routings[c.routings.length - 1]
      return latest?.decisionSource === 'CLAUDE'
    }).length
    const routingAccuracyRate =
      approvedCases.length > 0 ? approvedWithClaudeLatest / approvedCases.length : null

    return Response.json({
      cases: formattedCases,
      metrics: {
        openCases,
        claudeRoutedCases,
        lowConfidenceCases,
        manualOverrides,
        routingAccuracyRate,
      },
    })
  } catch (err) {
    console.error('Failed to fetch cases:', err)
    return Response.json({ error: 'Failed to fetch cases' }, { status: 500 })
  }
}
