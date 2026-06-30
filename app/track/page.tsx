import Link from 'next/link'
import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

type Routing = {
  department: string
  decisionSource: string
  confidence: number | null
  reasoningSummary: string | null
  createdAt: string
}

type StatusEntry = {
  fromStatus: string | null
  toStatus: string
  note: string | null
  createdAt: string
}

type CaseData = {
  publicId: string
  category: string
  address: string
  status: string
  sanitizedDescription: string
  createdAt: string
  routingHistory: Routing[]
  statusTimeline: StatusEntry[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_LABEL: Record<string, string> = {
  PARKS: 'Parks & Recreation',
  WATERSHED: 'Watershed Management',
  DOT: 'Transportation',
  PERMITS: 'Permits & Buildings',
  SUPPORTIVE_SERVICES: 'Supportive Services',
  OTHER: 'City Services',
}

const CATEGORY_LABEL: Record<string, string> = {
  PARKS: 'Parks & Recreation',
  WATERSHED: 'Watershed Management',
  DOT: 'Transportation',
  PERMITS: 'Permits & Buildings',
  SUPPORTIVE_SERVICES: 'Supportive Services',
  OTHER: 'Other',
}

const CLOSE_LABELS: Record<string, string> = {
  UNINTELLIGIBLE: 'We were unable to process your request',
  DUPLICATE: 'This appears to be a duplicate of an existing request',
  OUT_OF_JURISDICTION: 'This request is outside Atlanta city jurisdiction',
  ALREADY_RESOLVED: 'This issue appears to have already been resolved',
  NEEDS_MORE_INFO: 'We need more information to process your request',
  OTHER: 'Your request has been closed',
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: 'Submitted', cls: 'bg-[#F0F0EE] text-[#5A5A5A]' },
  ROUTED: { label: 'Routed', cls: 'bg-blue-100 text-blue-700' },
  IN_REVIEW: { label: 'In Review', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'Closed', cls: 'bg-[#F0F0EE] text-[#5A5A5A]' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function parseCloseNote(note: string): { label: string; description: string } | null {
  try {
    const parsed = JSON.parse(note) as Record<string, unknown>
    if (typeof parsed.category === 'string' && typeof parsed.description === 'string') {
      return {
        label: CLOSE_LABELS[parsed.category] ?? parsed.category,
        description: parsed.description,
      }
    }
  } catch {
    // not JSON — fall through
  }
  return null
}

async function fetchCase(ticketId: string): Promise<CaseData | null> {
  const c = await db.case.findUnique({
    where: { publicId: ticketId.trim().toUpperCase() },
    include: {
      routings: { orderBy: { createdAt: 'asc' } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!c) return null

  return {
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
  }
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
      <div className="max-w-[560px] mx-auto flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-full border-2 border-white/30 flex flex-col items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.10)' }}
          aria-hidden="true"
        >
          <span className="text-white text-[8px] font-bold tracking-widest leading-none">ATL</span>
          <span className="text-white text-sm font-extrabold leading-tight">311</span>
        </div>
        <div>
          <p className="text-white font-bold text-base leading-snug">ATL311 Resident Services</p>
          <p className="text-white/75 text-xs mt-0.5">Track the status of your request.</p>
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

// ─── Search form state ────────────────────────────────────────────────────────

function SearchForm() {
  return (
    <div className="flex flex-col min-h-full bg-[#F5F5F3]">
      <OfficialStrip />
      <SiteHeader />
      <main className="flex-1 px-4 py-8 flex items-start justify-center">
        <div className="w-full max-w-[560px]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#1B3A6B]">Track your request</h2>
            <p className="mt-1.5 text-sm text-[#5A5A5A]">
              Enter your ticket ID to see the current status of your submission.
            </p>
          </div>
          <div
            className="bg-white rounded-xl p-6 sm:p-8"
            style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
          >
            <form action="/track" method="get" className="space-y-4">
              <div>
                <label
                  htmlFor="id"
                  className="block text-sm font-semibold text-[#1B3A6B] mb-1.5"
                >
                  Ticket ID
                </label>
                <input
                  id="id"
                  name="id"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. AB12CD"
                  className="w-full rounded-md px-3 py-2.5 text-sm text-[#1B1E2B] placeholder-[#9A9A9A] bg-[#F5F5F3] border border-[#F5F5F3] focus:outline-none focus:bg-white focus:border-[#1B3A6B] transition-colors uppercase"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white bg-[#E8642F] hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-[#E8642F] focus:ring-offset-2 transition"
              >
                Look up request
              </button>
            </form>
          </div>
          <p className="mt-4 text-center text-xs text-[#9A9A9A]">
            Your ticket ID was included in your confirmation email.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

// ─── Not-found state ──────────────────────────────────────────────────────────

function NotFound({ ticketId }: { ticketId: string }) {
  return (
    <div className="flex flex-col min-h-full bg-[#F5F5F3]">
      <OfficialStrip />
      <SiteHeader />
      <main className="flex-1 px-4 py-8 flex items-start justify-center">
        <div className="w-full max-w-[560px]">
          <div
            className="bg-white rounded-xl p-8 text-center"
            style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
          >
            <div className="w-14 h-14 rounded-full bg-[#F5F5F3] flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-7 h-7 text-[#9A9A9A]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#1B3A6B] mb-2">Request not found</h2>
            <p className="text-sm text-[#5A5A5A] mb-2 leading-relaxed">
              We couldn&#39;t find a case with ticket ID{' '}
              <span className="font-mono font-bold text-[#1B3A6B]">{ticketId.toUpperCase()}</span>.
            </p>
            <p className="text-sm text-[#5A5A5A] mb-6 leading-relaxed">
              Double-check the ticket ID from your confirmation email.
            </p>
            <a
              href="/track"
              className="inline-block rounded-md px-5 py-2.5 text-sm font-semibold text-white bg-[#1B3A6B] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] focus:ring-offset-2 transition"
            >
              Try again
            </a>
            <p className="mt-4 text-xs text-[#9A9A9A]">
              <Link href="/" className="text-[#E8642F] font-medium hover:underline transition-colors">
                Submit a new request →
              </Link>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

// ─── Case detail state ────────────────────────────────────────────────────────

function CaseDetail({ c }: { c: CaseData }) {
  const statusCfg = STATUS_CONFIG[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' }
  const latestRouting = c.routingHistory.length > 0 ? c.routingHistory[c.routingHistory.length - 1] : null
  const hasMultipleRoutings = c.routingHistory.length > 1

  return (
    <div className="flex flex-col min-h-full bg-[#F5F5F3]">
      <OfficialStrip />
      <SiteHeader />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-[560px] mx-auto space-y-4">

          {/* Header card */}
          <div
            className="bg-white rounded-xl p-5 sm:p-6"
            style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-[#1B3A6B] bg-[#EEF1F8] px-2.5 py-1 rounded">
                  #{c.publicId}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-xs text-[#9A9A9A] shrink-0">
                Submitted {formatDate(c.createdAt)}
              </p>
            </div>
          </div>

          {/* Complaint summary */}
          <div
            className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
          >
            <div className="bg-[#F5F5F3] px-5 py-2.5 border-b border-[#E5E5E2]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Your Request
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-[#1B1E2B] leading-relaxed">{c.sanitizedDescription}</p>
              <div className="flex gap-4 flex-wrap pt-1 border-t border-[#F0F0EE]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">
                    Address
                  </p>
                  <p className="text-xs text-[#1B1E2B] mt-0.5">{c.address}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">
                    Category
                  </p>
                  <p className="text-xs text-[#1B1E2B] mt-0.5">
                    {CATEGORY_LABEL[c.category] ?? c.category}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI routing card */}
          {latestRouting && (
            <div
              className="bg-white rounded-xl overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
            >
              <div className="bg-[#F5F5F3] px-5 py-2.5 border-b border-[#E5E5E2]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Routing Decision
                </p>
              </div>
              <div className="px-5 py-4">
                <div className="rounded-lg border border-[#E5E5E2] bg-[#F8F9FC] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#9A9A9A]">
                          Routed to
                        </p>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                            latestRouting.decisionSource === 'CLAUDE'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-[#FDE8DF] text-[#C0441B]'
                          }`}
                        >
                          {latestRouting.decisionSource}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#1B3A6B]">
                        {DEPT_LABEL[latestRouting.department] ?? latestRouting.department}
                      </p>
                      {latestRouting.reasoningSummary && (
                        <p className="mt-1.5 text-xs text-[#5A5A5A] leading-relaxed">
                          {latestRouting.reasoningSummary}
                        </p>
                      )}
                    </div>
                    {latestRouting.confidence !== null && (
                      <div className="shrink-0 text-right">
                        <p className="text-2xl font-bold text-[#1B3A6B] leading-none">
                          {Math.round(latestRouting.confidence * 100)}%
                        </p>
                        <p className="text-[10px] text-[#9A9A9A] uppercase tracking-wide mt-1">
                          Confidence
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {hasMultipleRoutings && (
                  <details className="mt-3">
                    <summary className="text-xs font-semibold text-[#6B7280] cursor-pointer hover:text-[#1B3A6B] transition-colors list-none flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      View routing history ({c.routingHistory.length} decisions)
                    </summary>
                    <div className="mt-3 space-y-2">
                      {c.routingHistory.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between gap-2 text-xs py-2 border-t border-[#F0F0EE]"
                        >
                          <div>
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                                r.decisionSource === 'CLAUDE'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-[#FDE8DF] text-[#C0441B]'
                              }`}
                            >
                              {r.decisionSource}
                            </span>{' '}
                            <span className="text-[#1B1E2B] font-medium">
                              {DEPT_LABEL[r.department] ?? r.department}
                            </span>
                          </div>
                          <span className="text-[#9A9A9A] shrink-0">{formatDate(r.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Status timeline */}
          <div
            className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
          >
            <div className="bg-[#F5F5F3] px-5 py-2.5 border-b border-[#E5E5E2]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Status Timeline
              </p>
            </div>
            <div className="px-5 py-4">
              <ol className="relative border-l border-[#E5E5E2] space-y-5 ml-2">
                {c.statusTimeline.map((entry, i) => {
                  const cfg = STATUS_CONFIG[entry.toStatus] ?? {
                    label: entry.toStatus,
                    cls: 'bg-gray-100 text-gray-600',
                  }
                  const closeNote = entry.note ? parseCloseNote(entry.note) : null
                  const isLast = i === c.statusTimeline.length - 1

                  return (
                    <li key={i} className="ml-4">
                      <span
                        className={`absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ${
                          isLast ? 'bg-[#1B3A6B]' : 'bg-[#D5D5D2]'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}
                          >
                            {cfg.label}
                          </span>
                          {closeNote && (
                            <div className="mt-1.5 space-y-0.5">
                              <p className="text-xs font-medium text-[#1B1E2B]">
                                {closeNote.label}
                              </p>
                              {closeNote.description && (
                                <p className="text-xs text-[#5A5A5A]">{closeNote.description}</p>
                              )}
                            </div>
                          )}
                          {!closeNote && entry.note && (
                            <p className="mt-1 text-xs text-[#5A5A5A]">{entry.note}</p>
                          )}
                        </div>
                        <p className="text-[11px] text-[#9A9A9A] shrink-0 mt-0.5">
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>

          {/* Back link */}
          <p className="text-center text-xs text-[#9A9A9A] pb-2 space-x-4">
            <a href="/track" className="hover:underline hover:text-[#1B3A6B] transition-colors">
              ← Look up a different ticket
            </a>
            <Link href="/" className="text-[#E8642F] font-medium hover:underline transition-colors">
              Submit a new request →
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams
  const ticketId = id?.trim() ?? ''

  if (!ticketId) {
    return <SearchForm />
  }

  const caseData = await fetchCase(ticketId)

  if (!caseData) {
    return <NotFound ticketId={ticketId} />
  }

  return <CaseDetail c={caseData} />
}
