// Lightweight Resend client (REST). No extra deps – uses global fetch (Node 18+).
// Required env: RESEND_API_KEY, RESEND_FROM
// Optional env: APP_URL

export async function sendMail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!key || !from) {
    throw new Error('Mail nie jest skonfigurowany (RESEND_API_KEY / RESEND_FROM)')
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Resend error ${res.status}: ${text}`)
  }
  return res.json().catch(() => ({}))
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
