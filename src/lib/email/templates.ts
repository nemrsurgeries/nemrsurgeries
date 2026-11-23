import type { EmailMessage } from "./index";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapEmailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:32px;">
    <div style="font-size:14px;font-weight:600;color:#1e3a8a;letter-spacing:0.02em;margin-bottom:20px;">
      ORTHOCASE CLINICAL
    </div>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;" />
    <p style="font-size:12px;color:#64748b;margin:0;line-height:1.5;">
      This is an automated security notification. Do not reply to this message.
    </p>
  </div>
</body>
</html>`;
}

export function buildInvitationEmail(params: {
  to: string;
  inviterName: string;
  inviterHospital?: string | null;
  inviteUrl: string;
  expiresAt: Date;
  includesSharedCase?: boolean;
}): EmailMessage {
  const safeInviter = escapeHtml(params.inviterName);
  const hospitalNote = params.inviterHospital
    ? ` (${escapeHtml(params.inviterHospital)})`
    : "";
  const expiresLabel = params.expiresAt.toUTCString();
  const shareNotice = params.includesSharedCase
    ? `<p style="font-size:14px;line-height:1.6;color:#334155;">A surgical case has been prepared to be shared with you once you create your personal account.</p>`
    : `<p style="font-size:14px;line-height:1.6;color:#334155;">Registering creates your own private, independent surgical case library.</p>`;

  const html = wrapEmailLayout(
    "You have been invited to OrthoCase",
    `<h1 style="font-size:20px;font-weight:600;margin:0 0 12px;color:#0f172a;">Invitation to OrthoCase</h1>
     <p style="font-size:14px;line-height:1.6;color:#334155;">
       <strong>${safeInviter}</strong>${hospitalNote} has invited you to join OrthoCase, a private orthopedic surgical case management platform.
     </p>
     ${shareNotice}
     <p style="margin:24px 0;">
       <a href="${escapeHtml(params.inviteUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:500;font-size:14px;padding:10px 20px;border-radius:6px;">
         Accept Invitation &amp; Register
       </a>
     </p>
     <p style="font-size:12px;color:#64748b;line-height:1.5;">
       This single-use invitation expires on ${escapeHtml(expiresLabel)}. If you did not expect this invitation, you can safely ignore this email.
     </p>`,
  );

  const text = [
    `${params.inviterName} has invited you to join OrthoCase.`,
    params.includesSharedCase
      ? "A surgical case has been prepared to be shared with you once you register."
      : "Registering creates your own private, independent surgical case library.",
    `Accept invitation: ${params.inviteUrl}`,
    `Expires: ${expiresLabel}`,
  ].join("\n\n");

  return {
    to: params.to,
    subject: `${params.inviterName} invited you to OrthoCase`,
    html,
    text,
  };
}

export function buildEmailVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
}): EmailMessage {
  const html = wrapEmailLayout(
    "Verify your email address",
    `<h1 style="font-size:20px;font-weight:600;margin:0 0 12px;color:#0f172a;">Verify your email</h1>
     <p style="font-size:14px;line-height:1.6;color:#334155;">
       Hello ${escapeHtml(params.name)}, please confirm your email address to activate full access to your OrthoCase account.
     </p>
     <p style="margin:24px 0;">
       <a href="${escapeHtml(params.verifyUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:500;font-size:14px;padding:10px 20px;border-radius:6px;">
         Verify Email Address
       </a>
     </p>`,
  );

  return {
    to: params.to,
    subject: "Verify your OrthoCase email address",
    html,
    text: `Hello ${params.name},\n\nVerify your email address: ${params.verifyUrl}`,
  };
}

export function buildPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): EmailMessage {
  const html = wrapEmailLayout(
    "Reset your password",
    `<h1 style="font-size:20px;font-weight:600;margin:0 0 12px;color:#0f172a;">Password Reset Request</h1>
     <p style="font-size:14px;line-height:1.6;color:#334155;">
       Hello ${escapeHtml(params.name)}, we received a request to reset your OrthoCase password.
     </p>
     <p style="margin:24px 0;">
       <a href="${escapeHtml(params.resetUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:500;font-size:14px;padding:10px 20px;border-radius:6px;">
         Reset Password
       </a>
     </p>
     <p style="font-size:12px;color:#64748b;line-height:1.5;">
       If you did not request a password reset, you can safely ignore this email.
     </p>`,
  );

  return {
    to: params.to,
    subject: "Reset your OrthoCase password",
    html,
    text: `Hello ${params.name},\n\nReset your password: ${params.resetUrl}`,
  };
}
