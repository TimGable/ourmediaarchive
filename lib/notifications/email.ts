import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_OWNER_EMAIL = process.env.NOTIFY_OWNER_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL;

function hasEmailConfig() {
  return Boolean(RESEND_API_KEY && NOTIFY_OWNER_EMAIL && FROM_EMAIL);
}

export function isEmailNotificationsEnabled() {
  return hasEmailConfig();
}

export async function sendInviteRequestNotification(params: {
  requesterEmail: string;
  message: string;
  requestId: string;
  createdAt: string;
}) {
  if (!hasEmailConfig()) return;

  const resend = new Resend(RESEND_API_KEY);

  const subject = `New invite request: ${params.requesterEmail}`;
  const text = [
    "You received a new invite request.",
    "",
    `Request ID: ${params.requestId}`,
    `Submitted: ${params.createdAt}`,
    `Email: ${params.requesterEmail}`,
    "",
    "Message:",
    params.message,
  ].join("\n");

  await resend.emails.send({
    from: FROM_EMAIL as string,
    to: [NOTIFY_OWNER_EMAIL as string],
    subject,
    text,
  });
}

export async function sendApprovedInviteLinkEmail(params: {
  recipientEmail: string;
  actionLink: string;
}) {
  if (!hasEmailConfig()) return;

  const resend = new Resend(RESEND_API_KEY);

  const subject = "Your invite was approved - set your password";
  const text = [
    "Your invite request for Our Media Archive has been approved.",
    "",
    "Use the secure link below to create your password and activate your account:",
    params.actionLink,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  await resend.emails.send({
    from: FROM_EMAIL as string,
    to: [params.recipientEmail],
    subject,
    text,
  });
}

export async function sendDeniedInviteEmail(params: {
  recipientEmail: string;
  reason: string;
}) {
  if (!hasEmailConfig()) return;

  const resend = new Resend(RESEND_API_KEY);

  const subject = "Your invite request was not approved";
  const text = [
    "Thanks for your interest in Our Media Archive.",
    "",
    "At this time, your invite request was not approved.",
    "",
    "Reason from the admin team:",
    params.reason,
    "",
    "You can submit another request in the future if your circumstances change.",
  ].join("\n");

  await resend.emails.send({
    from: FROM_EMAIL as string,
    to: [params.recipientEmail],
    subject,
    text,
  });
}
