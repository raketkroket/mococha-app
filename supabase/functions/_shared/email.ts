export const MOCOCHA_EMAIL = "info@mococha.nl";
export const MOCOCHA_FROM = "MOCOCHA <noreply@mococha.nl>";

type SecretClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => { maybeSingle: () => Promise<{ data: { value?: string } | null }> };
    };
  };
};

export type EmailContent = {
  previewText: string;
  title: string;
  greeting?: string;
  contentHtml: string;
  contentText: string;
  buttonText?: string;
  buttonUrl?: string;
  footerText?: string;
  lang?: "nl" | "en";
};

export type SentEmail = {
  ok: boolean;
  messageId: string | null;
  error: string | null;
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getLanguage(value: unknown): "nl" | "en" {
  return value === "en" ? "en" : "nl";
}

export function getAppBaseUrl(): string {
  const configured = Deno.env.get("APP_BASE_URL") || "https://mococha.nl";
  try {
    const url = new URL(configured);
    return url.protocol === "https:" || url.hostname === "localhost" ? url.origin : "https://mococha.nl";
  } catch {
    return "https://mococha.nl";
  }
}

export function getSafeRedirectUrl(value: unknown, fallbackPath: string): string {
  const baseUrl = getAppBaseUrl();
  const fallback = new URL(fallbackPath, baseUrl).toString();
  if (typeof value !== "string") return fallback;
  try {
    const candidate = new URL(value);
    return candidate.origin === baseUrl ? candidate.toString() : fallback;
  } catch {
    return fallback;
  }
}

export async function getResendApiKey(client?: SecretClient): Promise<string | undefined> {
  const configured = Deno.env.get("RESEND_API_KEY");
  if (configured) return configured;
  if (!client) return undefined;
  try {
    const { data } = await client.from("server_secrets").select("value").eq("key", "RESEND_API_KEY").maybeSingle();
    return data?.value || undefined;
  } catch {
    return undefined;
  }
}

export function createMocochaEmail(content: EmailContent): { html: string; text: string } {
  const baseUrl = getAppBaseUrl();
  const logoUrl = `${baseUrl}/mocochalogo.webp`;
  const button = content.buttonText && content.buttonUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;"><tr><td align="center" bgcolor="#4A3936" style="border-radius:8px;"><a href="${escapeHtml(content.buttonUrl)}" style="display:inline-block;padding:14px 28px;color:#FAF8F5;font-family:Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(content.buttonText)}</a></td></tr></table>`
    : "";
  const greeting = content.greeting
    ? `<p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.35;color:#4A3936;">${escapeHtml(content.greeting)}</p>`
    : "";
  const footer = content.footerText || (content.lang === "en"
    ? "You are receiving this email because of your activity on mococha.nl."
    : "Je ontvangt deze e-mail vanwege je activiteit op mococha.nl.");
  const text = [content.title, "", content.greeting || null, content.contentText, content.buttonText && content.buttonUrl ? `\n${content.buttonText}: ${content.buttonUrl}` : null, "", content.lang === "en" ? "Kind regards," : "Met vriendelijke groet,", "MOCOCHA", "", footer]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  return {
    text,
    html: `<!doctype html><html lang="${content.lang || "nl"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.title)}</title></head><body style="margin:0;padding:0;background-color:#F5F1EB;-webkit-text-size-adjust:100%;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F1EB;font-size:1px;line-height:1px;">${escapeHtml(content.previewText)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1EB;"><tr><td align="center" style="padding:24px 16px 8px;"><img src="${logoUrl}" alt="MOCOCHA" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0;"></td></tr><tr><td align="center" style="padding:8px 16px 24px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:8px;"><tr><td style="padding:40px 32px;"><p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#8B7E6B;">MOCOCHA</p><h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;line-height:1.25;color:#4A3936;">${escapeHtml(content.title)}</h1>${greeting}<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:#4A3936;">${content.contentHtml}</div>${button}<p style="margin:28px 0 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A3936;">${content.lang === "en" ? "Kind regards," : "Met vriendelijke groet,"}<br><strong>MOCOCHA</strong></p></td></tr></table></td></tr><tr><td align="center" style="padding:0 24px 40px;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;color:#8B7E6B;">${escapeHtml(footer)}</td></tr></table></body></html>`,
  };
}

export async function sendEmail(apiKey: string | undefined, options: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  bcc?: string[];
}): Promise<SentEmail> {
  if (!apiKey) return { ok: false, messageId: null, error: "Email service is not configured." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: MOCOCHA_FROM, to: Array.isArray(options.to) ? options.to : [options.to], subject: options.subject, html: options.html, text: options.text, reply_to: options.replyTo, bcc: options.bcc }),
  });
  if (!response.ok) {
    console.error("Resend rejected email", response.status);
    return { ok: false, messageId: null, error: `Email provider rejected the message (${response.status}).` };
  }
  const result = await response.json().catch(() => ({}));
  return { ok: true, messageId: typeof result.id === "string" ? result.id : null, error: null };
}