'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

type FormState = {
  residentName: string
  residentEmail: string
  address: string
  isPublic: boolean
  ownerOrTenant: string
  category: string
  description: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

type Confirmation = {
  ticketId: string
  message: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Contact' },
  { id: 2, label: 'Property' },
  { id: 3, label: 'Issue' },
  { id: 4, label: 'Review' },
]

const CATEGORY_OPTIONS = [
  { value: 'PARKS', label: 'Parks & Recreation' },
  { value: 'WATERSHED', label: 'Watershed Management' },
  { value: 'DOT', label: 'Transportation' },
  { value: 'PERMITS', label: 'Permits & Buildings' },
  { value: 'SUPPORTIVE_SERVICES', label: 'Supportive Services' },
  { value: 'OTHER', label: 'Other' },
]

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(({ value, label }) => [value, label]),
)

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step: Step, form: FormState): FieldErrors {
  const errors: FieldErrors = {}

  if (step === 1) {
    if (!form.residentName.trim()) errors.residentName = 'Full name is required'
    if (!form.residentEmail.trim()) {
      errors.residentEmail = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.residentEmail)) {
      errors.residentEmail = 'Enter a valid email address'
    }
  }

  if (step === 2) {
    if (!form.address.trim()) errors.address = 'Address is required'
    if (!form.isPublic && !form.ownerOrTenant) {
      errors.ownerOrTenant = 'Please select Owner or Tenant'
    }
  }

  if (step === 3) {
    if (!form.category) errors.category = 'Please select a category'
    if (!form.description.trim()) {
      errors.description = 'Description is required'
    } else if (form.description.trim().length < 20) {
      errors.description = `At least 20 characters required (${form.description.trim().length}/20)`
    }
  }

  return errors
}

// ─── Review sub-components ────────────────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#E5E5E2] overflow-hidden">
      <div className="bg-[#F5F5F3] px-4 py-2 border-b border-[#E5E5E2]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{title}</h3>
      </div>
      <div className="divide-y divide-[#F0F0EE]">{children}</div>
    </div>
  )
}

function ReviewRow({
  label,
  value,
  multiline,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className={`px-4 py-3 ${multiline ? '' : 'flex items-baseline gap-4'}`}>
      <span className="text-xs text-[#6B7280] shrink-0 w-28">{label}</span>
      <span className={`text-sm text-[#1B1E2B] ${multiline ? 'mt-1 block whitespace-pre-wrap' : ''}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Chrome components ────────────────────────────────────────────────────────

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
        {/* ATL311 seal placeholder */}
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
          <p className="text-white/75 text-xs mt-0.5">Open a request — we&#39;ll take it from here.</p>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({
    residentName: '',
    residentEmail: '',
    address: '',
    isPublic: true,
    ownerOrTenant: '',
    category: '',
    description: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function advance() {
    const stepErrors = validateStep(step, form)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s))
  }

  function back() {
    setErrors({})
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s))
  }

  async function submit() {
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/submit-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentName: form.residentName,
          residentEmail: form.residentEmail,
          address: form.address,
          isPublic: form.isPublic,
          ownerOrTenant: form.isPublic ? '' : form.ownerOrTenant,
          category: form.category,
          description: form.description,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setConfirmation({ ticketId: data.ticketId, message: data.message })
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Confirmation screen ──────────────────────────────────────────────────────

  if (confirmation) {
    return (
      <div className="flex flex-col min-h-full bg-[#F5F5F3]">
        <OfficialStrip />
        <SiteHeader />
        <main className="flex-1 px-4 py-8 flex items-start justify-center">
          <div className="w-full max-w-[560px]">
            <div
              className="bg-white rounded-xl p-6 sm:p-8 text-center"
              style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#1B3A6B] mb-2">Request Submitted</h2>
              <p className="text-[#5A5A5A] mb-6 text-sm leading-relaxed">
                Your request has been submitted. Expected response within 48–72 hours.
              </p>
              <div className="bg-[#F5F5F3] rounded-lg border border-[#E5E5E2] p-5 mb-6">
                <p className="text-xs font-medium uppercase tracking-wide text-[#9A9A9A] mb-1">
                  Ticket ID
                </p>
                <p className="text-3xl font-mono font-bold text-[#1B3A6B] tracking-widest">
                  {confirmation.ticketId}
                </p>
              </div>
              <p className="text-xs text-[#9A9A9A]">
                Save this ticket ID to track your request status.
              </p>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  // ── Shared field styles ──────────────────────────────────────────────────────

  const inputCls = (field: keyof FormState) =>
    [
      'w-full rounded-md px-3 py-2.5 text-sm text-[#1B1E2B] placeholder-[#9A9A9A]',
      'border transition-colors focus:outline-none focus:bg-white focus:border-[#1B3A6B]',
      errors[field] ? 'border-red-400 bg-red-50' : 'bg-[#F5F5F3] border-[#F5F5F3]',
    ].join(' ')

  const labelCls = 'block text-sm font-semibold text-[#1B3A6B] mb-1.5'
  const errorCls = 'mt-1.5 text-xs text-red-600'

  // ── Step content ─────────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <label htmlFor="residentName" className={labelCls}>
                Full Name
              </label>
              <input
                id="residentName"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                value={form.residentName}
                onChange={(e) => update('residentName', e.target.value)}
                className={inputCls('residentName')}
              />
              {errors.residentName && <p className={errorCls}>{errors.residentName}</p>}
            </div>
            <div>
              <label htmlFor="residentEmail" className={labelCls}>
                Email Address
              </label>
              <input
                id="residentEmail"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                value={form.residentEmail}
                onChange={(e) => update('residentEmail', e.target.value)}
                className={inputCls('residentEmail')}
              />
              {errors.residentEmail && <p className={errorCls}>{errors.residentEmail}</p>}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <label htmlFor="address" className={labelCls}>
                Property Address
              </label>
              <input
                id="address"
                type="text"
                autoComplete="street-address"
                placeholder="467 Auburn Ave NE, Atlanta, GA 30312"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                className={inputCls('address')}
              />
              {errors.address && <p className={errorCls}>{errors.address}</p>}
            </div>

            <fieldset>
              <legend className={labelCls}>Property Type</legend>
              <div className="flex rounded-md border border-[#E5E5E2] overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    update('isPublic', true)
                    update('ownerOrTenant', '')
                  }}
                  className={[
                    'flex-1 py-2.5 text-sm font-medium transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1B3A6B]',
                    form.isPublic
                      ? 'bg-[#1B3A6B] text-white'
                      : 'bg-white text-[#5A5A5A] hover:bg-[#F5F5F3]',
                  ].join(' ')}
                >
                  Public Property
                </button>
                <button
                  type="button"
                  onClick={() => update('isPublic', false)}
                  className={[
                    'flex-1 py-2.5 text-sm font-medium border-l border-[#E5E5E2] transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1B3A6B]',
                    !form.isPublic
                      ? 'bg-[#1B3A6B] text-white'
                      : 'bg-white text-[#5A5A5A] hover:bg-[#F5F5F3]',
                  ].join(' ')}
                >
                  Private Property
                </button>
              </div>
            </fieldset>

            {!form.isPublic && (
              <fieldset>
                <legend className={labelCls}>Are you the owner or tenant?</legend>
                <div className="flex gap-3">
                  {(['Owner', 'Tenant'] as const).map((opt) => (
                    <label
                      key={opt}
                      className={[
                        'flex items-center gap-2.5 flex-1 rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                        form.ownerOrTenant === opt
                          ? 'border-[#1B3A6B] bg-[#EEF1F8]'
                          : 'border-[#E5E5E2] bg-white hover:bg-[#F5F5F3]',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="ownerOrTenant"
                        value={opt}
                        checked={form.ownerOrTenant === opt}
                        onChange={() => update('ownerOrTenant', opt)}
                        className="w-4 h-4 accent-[#1B3A6B]"
                      />
                      <span className="text-sm font-medium text-[#1B1E2B]">{opt}</span>
                    </label>
                  ))}
                </div>
                {errors.ownerOrTenant && <p className={errorCls}>{errors.ownerOrTenant}</p>}
              </fieldset>
            )}
          </div>
        )

      case 3: {
        const charCount = form.description.trim().length
        return (
          <div className="space-y-5">
            <div>
              <label htmlFor="category" className={labelCls}>
                Issue Category
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className={inputCls('category')}
              >
                <option value="">Select a category…</option>
                {CATEGORY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.category && <p className={errorCls}>{errors.category}</p>}
            </div>
            <div>
              <label htmlFor="description" className={labelCls}>
                Description{' '}
                <span
                  className={`text-xs font-normal ${charCount >= 20 ? 'text-green-600' : 'text-[#9A9A9A]'}`}
                >
                  ({charCount}/20 min)
                </span>
              </label>
              <textarea
                id="description"
                rows={5}
                placeholder="Describe the issue in detail — location, how long it has been present, and any relevant context."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className={inputCls('description')}
              />
              {errors.description && <p className={errorCls}>{errors.description}</p>}
            </div>
          </div>
        )
      }

      case 4:
        return (
          <div className="space-y-4">
            <ReviewSection title="Contact">
              <ReviewRow label="Name" value={form.residentName} />
              <ReviewRow label="Email" value={form.residentEmail} />
            </ReviewSection>
            <ReviewSection title="Property">
              <ReviewRow
                label="Address"
                value={form.address}
              />
              <ReviewRow
                label="Type"
                value={form.isPublic ? 'Public Property' : 'Private Property'}
              />
              {!form.isPublic && (
                <ReviewRow label="Relationship" value={form.ownerOrTenant} />
              )}
            </ReviewSection>
            <ReviewSection title="Issue">
              <ReviewRow
                label="Category"
                value={CATEGORY_LABEL[form.category] ?? form.category}
              />
              <ReviewRow label="Description" value={form.description} multiline />
            </ReviewSection>
            {submitError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {submitError}
              </div>
            )}
          </div>
        )
    }
  }

  const stepTitles: Record<Step, string> = {
    1: 'Contact Information',
    2: 'Property Details',
    3: 'Describe the Issue',
    4: 'Review & Submit',
  }

  // ── Progress tabs ─────────────────────────────────────────────────────────────

  const progressTabs = (
    <nav aria-label="Form progress" className="mb-6">
      <ol className="flex border-b border-[#E5E5E2]">
        {STEPS.map(({ id, label }) => {
          const completed = step > id
          const active = step === id
          return (
            <li key={id} className="flex-1">
              <div
                aria-current={active ? 'step' : undefined}
                className={[
                  'pb-3 flex items-center justify-center gap-1.5 border-b-2 -mb-px transition-all text-xs',
                  active
                    ? 'border-[#E8642F] text-[#1B3A6B] font-bold'
                    : completed
                      ? 'border-transparent text-[#1B3A6B] font-medium'
                      : 'border-transparent text-[#9A9A9A]',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors',
                    active || completed
                      ? 'bg-[#1B3A6B] text-white'
                      : 'bg-[#D5D5D2] text-[#7A7A7A]',
                  ].join(' ')}
                >
                  {completed ? (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    id
                  )}
                </span>
                <span className="hidden sm:block">{label}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full bg-[#F5F5F3]">
      <OfficialStrip />
      <SiteHeader />

      <main className="flex-1 px-4 py-8">
        <div className="max-w-[560px] mx-auto">
          {/* Hero */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#1B3A6B]">Let&#39;s get this sorted.</h2>
            <p className="mt-1.5 text-sm text-[#5A5A5A]">
              A few quick questions and you&#39;re done — about 3 minutes.
            </p>
          </div>

          {/* Form card */}
          <div
            className="bg-white rounded-xl p-6 sm:p-8"
            style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
          >
            {progressTabs}

            <h3 className="text-base font-semibold text-[#1B3A6B] mb-5">{stepTitles[step]}</h3>

            {renderStep()}

            <div className="mt-8 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={back}
                  disabled={loading}
                  className="flex-1 rounded-md border border-[#D5D5D2] px-4 py-2.5 text-sm font-medium text-[#5A5A5A] bg-white hover:bg-[#F5F5F3] focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] transition disabled:opacity-50"
                >
                  Back
                </button>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={advance}
                  className="flex-1 rounded-md px-4 py-2.5 text-sm font-semibold text-white bg-[#E8642F] hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-[#E8642F] focus:ring-offset-2 transition"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading}
                  className="flex-1 rounded-md px-4 py-2.5 text-sm font-semibold text-white bg-[#E8642F] hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-[#E8642F] focus:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting…' : 'Submit Request'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
