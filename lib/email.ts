const E4A_API = 'https://api.emails4agents.com/v1/messages/send'
const E4A_INBOX_ID = process.env.E4A_INBOX_ID ?? '08fb192d-a3e3-4717-87d2-2bd2ac212b02' // agent@emails4agents.com

export async function sendMagicLinkEmail(to: string, magicLinkUrl: string): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#111">Sign in to Vidgenatar</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px">Click the button below to sign in. This link expires in 15 minutes and can only be used once.</p>
      <a href="${magicLinkUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:500">Sign in</a>
      <p style="margin:24px 0 0;color:#999;font-size:13px">If you didn't request this, you can ignore this email.</p>
    </div>
  `
  const text = `Sign in to Vidgenatar\n\nClick this link (expires in 15 minutes):\n${magicLinkUrl}\n\nIf you didn't request this, ignore this email.`

  const res = await fetch(E4A_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.E4A_API_KEY!,
    },
    body: JSON.stringify({
      from_inbox_id: E4A_INBOX_ID,
      to,
      subject: 'Sign in to Vidgenatar',
      html,
      text,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`emails4agents error ${res.status}: ${body}`)
  }
}
