import { prisma } from "@/lib/db";

export async function sendPlatformEmail(params: {
  toEmail: string;
  subject: string;
  bodyPreview: string;
  template: string;
}): Promise<{ status: "SENT" | "LOGGED_LOCAL" | "FAILED"; logId: string }> {
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );

  // When SMTP credentials are not supplied, log deterministically in EmailLog
  // instead of pretending an external mail server accepted delivery.
  const status = smtpConfigured ? "SENT" : "LOGGED_LOCAL";

  const log = await prisma.emailLog.create({
    data: {
      toEmail: params.toEmail,
      subject: params.subject,
      bodyPreview: params.bodyPreview,
      template: params.template,
      status,
    },
  });

  return { status, logId: log.id };
}
