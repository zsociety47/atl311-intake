import { Resend } from 'resend'

let _resend: Resend | null = null
function client(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@atl311.gov'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://atl311-intake.vercel.app'

const DEPT_LABELS: Record<string, string> = {
  PARKS: 'Parks & Recreation',
  WATERSHED: 'Watershed Management',
  DOT: 'Transportation',
  PERMITS: 'Permits & Buildings',
  SUPPORTIVE_SERVICES: 'Supportive Services',
  OTHER: 'City Services',
}

const CLOSE_CATEGORY_LABELS: Record<string, string> = {
  UNINTELLIGIBLE: 'We were unable to process your request',
  DUPLICATE: 'This appears to be a duplicate of an existing request',
  OUT_OF_JURISDICTION: 'This request is outside Atlanta city jurisdiction',
  ALREADY_RESOLVED: 'This issue appears to have already been resolved',
  NEEDS_MORE_INFO: 'We need more information to process your request',
  OTHER: 'Your request has been reviewed and closed',
}

function header() {
  return `
    <div style="background:#1B3A6B;padding:16px 24px;border-radius:8px 8px 0 0;">
      <span style="color:white;font-weight:700;font-size:20px;letter-spacing:0.02em;">ATL311</span>
      <span style="color:rgba(255,255,255,0.65);font-size:13px;margin-left:10px;">Resident Services</span>
    </div>
  `
}

function footer() {
  return `
    <div style="padding:16px 24px;background:#F5F5F3;border-radius:0 0 8px 8px;border:1px solid #E5E5E2;border-top:none;">
      <p style="margin:0;font-size:12px;color:#9A9A9A;text-align:center;">
        An official City of Atlanta service &nbsp;·&nbsp; <a href="tel:311" style="color:#1B3A6B;text-decoration:none;">Call 311</a> &nbsp;·&nbsp; Privacy
      </p>
    </div>
  `
}

export async function sendSubmissionConfirmation(
  to: string,
  { ticketId, department }: { ticketId: string; department: string },
): Promise<void> {
  const deptLabel = DEPT_LABELS[department] ?? department.replace(/_/g, ' ')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1B1E2B;">
  <div style="max-width:560px;margin:0 auto;">
    ${header()}
    <div style="background:white;padding:32px 24px;border:1px solid #E5E5E2;border-top:none;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#1B3A6B;">Request received</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#5A5A5A;line-height:1.6;">
        Thank you for reaching out. Your service request has been received and routed to
        <strong style="color:#1B1E2B;">${deptLabel}</strong>. A city representative will
        follow up within <strong>48–72 hours</strong>.
      </p>
      <div style="background:#F5F5F3;border-radius:8px;padding:20px 24px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:11px;color:#9A9A9A;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Your Ticket ID</p>
        <p style="margin:0;font-size:30px;font-weight:700;font-family:monospace;color:#1B3A6B;letter-spacing:0.25em;">${ticketId}</p>
      </div>
      <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">
        Keep this ID handy — you can reference it if you call 311 or need to follow up on your request.
      </p>
    </div>
    ${footer()}
  </div>
</body>
</html>`

  await client().emails.send({
    from: FROM,
    to: [to],
    subject: `Your ATL311 request has been received — #${ticketId}`,
    html,
  })
}

export async function sendCaseClosedNotification(
  to: string,
  { ticketId, category, description }: { ticketId: string; category: string; description: string },
): Promise<void> {
  const categoryLabel = CLOSE_CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ')

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#F5F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1B1E2B;">
  <div style="max-width:560px;margin:0 auto;">
    ${header()}
    <div style="background:white;padding:32px 24px;border:1px solid #E5E5E2;border-top:none;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#1B3A6B;">Update on your request</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#5A5A5A;line-height:1.6;">
        We have an update on your ATL311 service request <strong style="color:#1B1E2B;">#${ticketId}</strong>.
      </p>
      <div style="border-left:3px solid #E8642F;padding:12px 16px;background:#FFF8F5;border-radius:0 6px 6px 0;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:11px;color:#9A9A9A;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Status</p>
        <p style="margin:0;font-size:15px;color:#1B1E2B;font-weight:600;">${categoryLabel}</p>
      </div>
      <p style="margin:0 0 24px;font-size:15px;color:#5A5A5A;line-height:1.6;">${description}</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
        If your issue is still ongoing or this doesn't resolve your concern, you're welcome to submit a new request.
      </p>
      <a href="${BASE_URL}" style="display:inline-block;background:#E8642F;color:white;font-weight:600;font-size:14px;padding:12px 24px;border-radius:6px;text-decoration:none;">
        Resubmit a request
      </a>
      <p style="margin:16px 0 0;font-size:13px;color:#9A9A9A;">
        Or call <strong>311</strong> to speak with a city representative.
      </p>
    </div>
    ${footer()}
  </div>
</body>
</html>`

  await client().emails.send({
    from: FROM,
    to: [to],
    subject: `Update on your ATL311 request #${ticketId}`,
    html,
  })
}
