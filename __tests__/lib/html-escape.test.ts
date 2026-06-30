import { escapeHtml } from '@/lib/html-escape'

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    )
  })

  it('escapes ampersands and quotes', () => {
    expect(escapeHtml(`Tom & Jerry's "house"`)).toBe(
      'Tom &amp; Jerry&#39;s &quot;house&quot;',
    )
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Large pothole on Peachtree St')).toBe('Large pothole on Peachtree St')
  })
})
