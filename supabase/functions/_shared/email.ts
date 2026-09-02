export const MOCOCHA_EMAIL = "info@mococha.nl";
export const MOCOCHA_FROM = "MOCOCHA <noreply@mococha.nl>";
const DEFAULT_APP_BASE_URL = "https://mococha-app.vercel.app";

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
  fallbackLinkText?: string;
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
  const configured = Deno.env.get("APP_BASE_URL") || DEFAULT_APP_BASE_URL;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" || url.hostname === "localhost" ? url.origin : DEFAULT_APP_BASE_URL;
  } catch {
    return DEFAULT_APP_BASE_URL;
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

function getSafeEmailActionUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
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
  const logoUrl = `${baseUrl}/mocochaoriginal.png`;
  const isEn = content.lang === "en";
  const buttonUrl = getSafeEmailActionUrl(content.buttonUrl);
  const fallbackLinkText = content.fallbackLinkText || (isEn ? "Having trouble with the button? Open this link." : "Werkt de knop niet? Open deze link.");
  const button = content.buttonText && buttonUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;"><tr><td bgcolor="#3A332D" style="border-radius:8px;"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:14px 26px;color:#FCFBF8;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;text-decoration:none;border-radius:8px;">${escapeHtml(content.buttonText)}</a></td></tr></table><p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#9A8877;">${escapeHtml(fallbackLinkText)}<br><a href="${escapeHtml(buttonUrl)}" style="color:#6B5D52;word-break:break-all;text-decoration:underline;">${escapeHtml(buttonUrl)}</a></p>`
    : "";
  const greeting = content.greeting
    ? `<p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:29px;color:#3A332D;">${escapeHtml(content.greeting)}</p>`
    : "";
  const footer = content.footerText || (isEn
    ? "You are receiving this email because of your activity on mococha.nl."
    : "Je ontvangt deze e-mail vanwege je activiteit op mococha.nl.");
  const text = [content.title, "", content.greeting || null, content.contentText, content.buttonText && buttonUrl ? `${content.buttonText}: ${buttonUrl}` : null, "", isEn ? "Kind regards," : "Met vriendelijke groet,", "MOCOCHA", "", footer]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  return {
    text,
    html: `<!doctype html><html lang="${content.lang || "nl"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escapeHtml(content.title)}</title><!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]--></head><body style="margin:0;padding:0;background-color:#F3F0EB;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F3F0EB;opacity:0;">${escapeHtml(content.previewText)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#F3F0EB;"><tr><td align="center" style="padding:32px 16px 16px;"><img src="${logoUrl}" alt="MOCOCHA" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;"></td></tr><tr><td align="center" style="padding:0 16px 24px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid #E7E0D8;border-radius:8px;"><tr><td style="padding:40px 32px;"><p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;line-height:16px;color:#9A8877;">MOCOCHA</p><h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;line-height:35px;color:#3A332D;">${escapeHtml(content.title)}</h1>${greeting}<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#3A332D;">${content.contentHtml}</div>${button}<p style="margin:30px 0 0;padding-top:24px;border-top:1px solid #E7E0D8;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#5C4F42;">${isEn ? "Kind regards," : "Met vriendelijke groet,"}<br><strong style="color:#3A332D;">MOCOCHA</strong></p></td></tr></table></td></tr><tr><td align="center" style="padding:0 24px 36px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#9A8877;">${escapeHtml(footer)}<br><a href="mailto:${MOCOCHA_EMAIL}" style="color:#6B5D52;text-decoration:none;">${MOCOCHA_EMAIL}</a></td></tr></table></body></html>`,
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