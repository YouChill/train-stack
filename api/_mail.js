// Gmail SMTP via nodemailer.
// Required env:
//   GMAIL_USER          – Twój adres Gmail (np. you@gmail.com)
//   GMAIL_APP_PASSWORD  – 16-znakowe App Password z https://myaccount.google.com/apppasswords
// Optional env:
//   MAIL_FROM_NAME      – wyświetlana nazwa nadawcy (default: "TRAINstack")
//   APP_URL             – baza dla linków resetujących
import nodemailer from 'nodemailer'

let transporter

function getTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('Mail nie jest skonfigurowany (GMAIL_USER / GMAIL_APP_PASSWORD)')
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    })
  }
  return transporter
}

export async function sendMail({ to, subject, html }) {
  const t = getTransporter()
  const fromName = process.env.MAIL_FROM_NAME || 'TRAINstack'
  const from = `${fromName} <${process.env.GMAIL_USER}>`
  return t.sendMail({ from, to, subject, html })
}

export function resetEmailHtml({ name, link }) {
  const safeName = (name || '').replace(/[<>]/g, '')
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#0b0f14;color:#e6edf3;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#11161d;border:1px solid #1f2630;border-radius:12px;padding:24px">
    <h2 style="margin:0 0 12px">Reset hasła – TRAINstack</h2>
    <p>Cześć ${safeName || ''},</p>
    <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Kliknij przycisk poniżej, aby ustawić nowe hasło. Link jest ważny przez 60 minut.</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${link}" style="background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Ustaw nowe hasło</a>
    </p>
    <p style="font-size:12px;color:#9aa4b2">Jeśli to nie Ty – po prostu zignoruj tę wiadomość.</p>
    <p style="font-size:12px;color:#9aa4b2;word-break:break-all">Link: ${link}</p>
  </div>
</body></html>`
}
