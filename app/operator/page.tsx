'use client'

import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type LatestRouting = {
  department: string
  decisionSource: string
  confidence: number | null
  reasoningSummary: string | null
  createdAt: string
}

type CaseItem = {
  id: string
  publicId: string
  residentName: string
  address: string
  category: string
  status: string
  createdAt: string
  sanitizedDescription: string
  latestRouting: LatestRouting | null
  routingHistory: { department: string; decisionSource: string; createdAt: string }[]
}

type Metrics = {
  openCases: number
  claudeRoutedCases: number
  lowConfidenceCases: number
  manualOverrides: number
  routingAccuracyRate: number | null
}

type DashboardData = { cases: CaseItem[]; metrics: Metrics }

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { value: 'PARKS', label: 'Parks & Recreation' },
  { value: 'WATERSHED', label: 'Watershed Management' },
  { value: 'DOT', label: 'Transportation' },
  { value: 'PERMITS', label: 'Permits & Buildings' },
  { value: 'SUPPORTIVE_SERVICES', label: 'Supportive Services' },
  { value: 'OTHER', label: 'Other' },
]

const DEPT_LABEL: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map(({ value, label }) => [value, label]),
)

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: 'Submitted', cls: 'bg-[#F0F0EE] text-[#5A5A5A]' },
  ROUTED: { label: 'Routed', cls: 'bg-blue-100 text-blue-700' },
  IN_REVIEW: { label: 'In Review', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'Closed', cls: 'bg-[#F0F0EE] text-[#5A5A5A]' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Chrome ───────────────────────────────────────────────────────────────────

function OfficialStrip() {
  return (
    <div className="bg-[#EEECEA] border-b border-[#D8D8D4] py-1.5 px-4">
      <p className="text-center text-xs text-[#5A5A5A] font-medium">
        An official website of the City of Atlanta
      </p>
    </div>
  )
}

function SiteHeader() {
  return (
    <header className="bg-[#1B3A6B] px-4 py-4">
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-full border-2 border-white/30 flex flex-col items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.10)' }}
          aria-hidden="true"
        >
          <span className="text-white text-[8px] font-bold tracking-widest leading-none">ATL</span>
          <span className="text-white text-sm font-extrabold leading-tight">311</span>
        </div>
        <div>
          <p className="text-white font-bold text-base leading-snug">ATL311 Operator Dashboard</p>
          <p className="text-white/75 text-xs mt-0.5">
            Review AI routing decisions and take action.
          </p>
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="py-8 px-4 text-center">
      <p className="text-xs text-[#9A9A9A]">
        An official City of Atlanta service · Contact us at 311 · Privacy
      </p>
    </footer>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9A9A9A]">{label}</p>
      <p className="mt-1.5 text-3xl font-bold text-[#1B3A6B]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#6B7280]">{sub}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OperatorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<{ caseId: string; msg: string } | null>(null)
  const [overrideOpen, setOverrideOpen] = useState<string | null>(null)
  const [overrideDept, setOverrideDept] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

  // All setState inside the effect runs in Promise callbacks (async), satisfying the lint rule.
  useEffect(() => {
    let active = true
    fetch('/api/operator/cases')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json: DashboardData) => {
        if (active) {
          setData(json)
          setPageError(null)
        }
      })
      .catch(() => {
        if (active) setPageError('Failed to load dashboard data. Please refresh.')
      })
      .finally(() => {
        if (active) setPageLoading(false)
      })
    return () => {
      active = false
    }
  }, [refreshKey])

  function refresh() {
    setPageLoading(true)
    setRefreshKey((k) => k + 1)
  }

  async function handleApprove(caseId: string) {
    setActionLoading(caseId)
    setActionError(null)
    try {
      const res = await fetch(`/api/operator/cases/${caseId}/approve`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        setActionError({ caseId, msg: json.error ?? 'Failed to approve case.' })
        return
      }
      refresh()
    } catch {
      setActionError({ caseId, msg: 'Network error. Please try again.' })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleOverrideSubmit(caseId: string) {
    setActionLoading(caseId)
    setActionError(null)
    try {
      const res = await fetch(`/api/operator/cases/${caseId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: overrideDept, reason: overrideReason.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        setActionError({ caseId, msg: json.error ?? 'Failed to override case.' })
        return
      }
      setOverrideOpen(null)
      setOverrideDept('')
      setOverrideReason('')
      refresh()
    } catch {
      setActionError({ caseId, msg: 'Network error. Please try again.' })
    } finally {
      setActionLoading(null)
    }
  }

  function openOverride(caseId: string) {
    setOverrideOpen(caseId)
    setOverrideDept('')
    setOverrideReason('')
    setActionError(null)
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="flex flex-col min-h-full bg-[#F5F5F3]">
        <OfficialStrip />
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-[#5A5A5A] text-sm">Loading cases…</p>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (pageError) {
    return (
      <div className="flex flex-col min-h-full bg-[#F5F5F3]">
        <OfficialStrip />
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-red-600 text-sm mb-4">{pageError}</p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white bg-[#1B3A6B] hover:brightness-110 transition"
            >
              Retry
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const { cases, metrics } = data!
  const accuracyDisplay =
    metrics.routingAccuracyRate !== null
      ? `${Math.round(metrics.routingAccuracyRate * 100)}%`
      : 'No data yet'

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-[#F5F5F3]">
      <OfficialStrip />
      <SiteHeader />

      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Metrics */}
          <section aria-label="Dashboard metrics">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard label="Open Cases" value={metrics.openCases} />
              <MetricCard label="Claude Routed" value={metrics.claudeRoutedCases} />
              <MetricCard label="Low Confidence" value={metrics.lowConfidenceCases} sub="below 70%" />
              <MetricCard label="Manual Overrides" value={metrics.manualOverrides} />
              <MetricCard label="Claude Accuracy" value={accuracyDisplay} />
            </div>
          </section>

          {/* Case list */}
          <section aria-label="Case list">
            <h2 className="text-lg font-bold text-[#1B3A6B] mb-4">
              All Cases
              <span className="ml-2 text-sm font-normal text-[#9A9A9A]">({cases.length})</span>
            </h2>

            {cases.length === 0 ? (
              <div
                className="bg-white rounded-xl p-12 text-center"
                style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
              >
                <p className="text-[#5A5A5A] text-sm">
                  No cases yet. Submit a request from the resident form to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cases.map((c) => {
                  const statusCfg = STATUS_CONFIG[c.status] ?? {
                    label: c.status,
                    cls: 'bg-gray-100 text-gray-600',
                  }
                  const isActioning = actionLoading === c.id
                  const caseError = actionError?.caseId === c.id ? actionError.msg : null
                  const isOverrideOpen = overrideOpen === c.id
                  const canAct = c.status === 'ROUTED'

                  return (
                    <div
                      key={c.id}
                      className="bg-white rounded-xl overflow-hidden"
                      style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
                    >
                      {/* Case header */}
                      <div className="px-5 py-4 border-b border-[#F0F0EE]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#1B3A6B] bg-[#EEF1F8] px-2 py-0.5 rounded">
                                #{c.publicId}
                              </span>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.cls}`}
                              >
                                {statusCfg.label}
                              </span>
                            </div>
                            <p className="mt-1.5 font-semibold text-[#1B1E2B] text-sm">
                              {c.residentName}
                            </p>
                            <p className="text-xs text-[#6B7280] mt-0.5">{c.address}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-[#9A9A9A]">{relativeTime(c.createdAt)}</p>
                            <p className="text-xs text-[#6B7280] mt-0.5">{c.category}</p>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="px-5 py-4 space-y-4">

                        {/* Complaint */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#9A9A9A] mb-1.5">
                            Complaint
                          </p>
                          <p className="text-sm text-[#1B1E2B] leading-relaxed">
                            {c.sanitizedDescription}
                          </p>
                        </div>

                        {/* AI Routing card */}
                        {c.latestRouting ? (
                          <div className="rounded-lg border border-[#E5E5E2] bg-[#F8F9FC] p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-[#9A9A9A]">
                                    Routed to
                                  </p>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                      c.latestRouting.decisionSource === 'CLAUDE'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-[#FDE8DF] text-[#C0441B]'
                                    }`}
                                  >
                                    {c.latestRouting.decisionSource}
                                  </span>
                                </div>
                                <p className="text-sm font-bold text-[#1B3A6B]">
                                  {DEPT_LABEL[c.latestRouting.department] ??
                                    c.latestRouting.department}
                                </p>
                                {c.latestRouting.reasoningSummary && (
                                  <p className="mt-1.5 text-xs text-[#5A5A5A] leading-relaxed">
                                    {c.latestRouting.reasoningSummary}
                                  </p>
                                )}
                              </div>
                              {c.latestRouting.confidence !== null && (
                                <div className="shrink-0 text-right">
                                  <p className="text-2xl font-bold text-[#1B3A6B] leading-none">
                                    {Math.round(c.latestRouting.confidence * 100)}%
                                  </p>
                                  <p className="text-[10px] text-[#9A9A9A] uppercase tracking-wide mt-1">
                                    Confidence
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#9A9A9A] italic">No routing decision yet.</p>
                        )}

                        {/* Action error */}
                        {caseError && (
                          <p role="alert" className="text-xs text-red-600">
                            {caseError}
                          </p>
                        )}

                        {/* Action buttons */}
                        {canAct && !isOverrideOpen && (
                          <div className="flex gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApprove(c.id)}
                              disabled={isActioning}
                              className="flex-1 rounded-md px-3 py-2.5 text-sm font-semibold text-white bg-[#1B3A6B] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] transition disabled:opacity-50"
                            >
                              {isActioning ? 'Approving…' : 'Approve Routing'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openOverride(c.id)}
                              disabled={isActioning}
                              className="flex-1 rounded-md px-3 py-2.5 text-sm font-semibold text-[#C0441B] bg-[#FDE8DF] hover:bg-[#FBCFBE] focus:outline-none focus:ring-2 focus:ring-[#E8642F] transition disabled:opacity-50"
                            >
                              Override Department
                            </button>
                          </div>
                        )}

                        {/* Override form */}
                        {isOverrideOpen && (
                          <div className="rounded-lg border border-[#E5E5E2] p-4 space-y-4">
                            <p className="text-sm font-semibold text-[#1B3A6B]">
                              Override Department
                            </p>
                            <div>
                              <label className="block text-xs font-semibold text-[#1B3A6B] mb-1.5">
                                Department
                              </label>
                              <select
                                value={overrideDept}
                                onChange={(e) => setOverrideDept(e.target.value)}
                                className="w-full rounded-md px-3 py-2.5 text-sm text-[#1B1E2B] bg-[#F5F5F3] border border-[#F5F5F3] focus:outline-none focus:bg-white focus:border-[#1B3A6B] transition-colors"
                              >
                                <option value="">Select department…</option>
                                {DEPARTMENTS.map(({ value, label }) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#1B3A6B] mb-1.5">
                                Reason
                              </label>
                              <textarea
                                rows={3}
                                placeholder="Explain why you're overriding the AI routing decision."
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                className="w-full rounded-md px-3 py-2.5 text-sm text-[#1B1E2B] placeholder-[#9A9A9A] bg-[#F5F5F3] border border-[#F5F5F3] focus:outline-none focus:bg-white focus:border-[#1B3A6B] transition-colors resize-none"
                              />
                            </div>
                            {caseError && (
                              <p role="alert" className="text-xs text-red-600">
                                {caseError}
                              </p>
                            )}
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => handleOverrideSubmit(c.id)}
                                disabled={
                                  isActioning || !overrideDept || !overrideReason.trim()
                                }
                                className="flex-1 rounded-md px-3 py-2.5 text-sm font-semibold text-white bg-[#E8642F] hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-[#E8642F] transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isActioning ? 'Submitting…' : 'Submit Override'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOverrideOpen(null)
                                  setOverrideDept('')
                                  setOverrideReason('')
                                }}
                                disabled={isActioning}
                                className="rounded-md px-4 py-2.5 text-sm font-medium border border-[#D5D5D2] text-[#5A5A5A] bg-white hover:bg-[#F5F5F3] transition disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
