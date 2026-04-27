import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({
  region: process.env.AWS_SES_REGION ?? 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const FROM = process.env.EMAIL_FROM ?? 'noreply@vidgenatar.com'

export async function sendMagicLinkEmail(to: string, magicLinkUrl: string): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:20px;color:#111">Sign in to Vidgenatar</h2>
      <p style="margin:0 0 24px;color:#555;font-size:15px">Click the button below to sign in. This link expires in 15 minutes and can only be used once.</p>
      <a href="${magicLinkUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:500">Sign in</a>
      <p style="margin:24px 0 0;color:#999;font-size:13px">If you didn't request this, you can ignore this email.</p>
    </div>
  `
  const text = `Sign in to Vidgenatar\n\nClick this link to sign in (expires in 15 minutes):\n${magicLinkUrl}\n\nIf you didn't request this, ignore this email.`

  await ses.send(new SendEmailCommand({
    Source: FROM,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: 'Sign in to Vidgenatar' },
      Body: { Html: { Data: html }, Text: { Data: text } },
    },
  }))
}
