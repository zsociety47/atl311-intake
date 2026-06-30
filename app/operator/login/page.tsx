'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function OperatorLoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Invalid credentials')
    } else {
      router.push('/operator')
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-[#F5F5F3]">
      {/* Official strip */}
      <div className="bg-[#EEECEA] border-b border-[#D8D8D4] py-1.5 px-4">
        <p className="text-center text-xs text-[#5A5A5A] font-medium">
          An official website of the City of Atlanta
        </p>
      </div>

      {/* Header */}
      <header className="bg-[#1B3A6B] px-4 py-4">
        <div className="max-w-[400px] mx-auto flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full border-2 border-white/30 flex flex-col items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.10)' }}
            aria-hidden="true"
          >
            <span className="text-white text-[8px] font-bold tracking-widest leading-none">ATL</span>
            <span className="text-white text-sm font-extrabold leading-tight">311</span>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-snug">ATL311 Operator Portal</p>
            <p className="text-white/75 text-xs mt-0.5">Sign in to access the dashboard.</p>
          </div>
        </div>
      </header>

      {/* Login card */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          <div
            className="bg-white rounded-xl p-8"
            style={{ boxShadow: '0 1px 3px rgba(20,30,50,0.07)' }}
          >
            <h2 className="text-xl font-bold text-[#1B3A6B] mb-6">Operator Sign In</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#1B3A6B] mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-md px-3 py-2.5 text-sm text-[#1B1E2B] bg-[#F5F5F3] border border-[#F5F5F3] focus:outline-none focus:bg-white focus:border-[#1B3A6B] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[#1B3A6B] mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-md px-3 py-2.5 text-sm text-[#1B1E2B] bg-[#F5F5F3] border border-[#F5F5F3] focus:outline-none focus:bg-white focus:border-[#1B3A6B] transition-colors"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white bg-[#E8642F] hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-[#E8642F] focus:ring-offset-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="py-8 px-4 text-center">
        <p className="text-xs text-[#9A9A9A]">
          An official City of Atlanta service · Contact us at 311 · Privacy
        </p>
      </footer>
    </div>
  )
}
