import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// onboarding@resend.dev is Resend's shared sandbox sender: rate-limited, and
// it only delivers to the account owner. Real sending needs MAIL_FROM pointed
// at a domain verified in the Resend dashboard.
const SANDBOX_FROM = 'Inventory Manager Pro <onboarding@resend.dev>';
const from = process.env.MAIL_FROM || SANDBOX_FROM;

if (resend && from === SANDBOX_FROM) {
  console.warn(
    'MAIL_FROM not set — using Resend sandbox sender. Mail to anyone but the ' +
    'account owner will not be delivered.'
  );
}

// Returns true only if the message was actually handed off to Resend, so
// callers that care (invites) can tell the user when delivery didn't happen.
const sendEmail = async ({ to, subject, html }) => {
  // Never guess a recipient. A missing `to` means the caller had no address,
  // and sending it somewhere else would misdeliver tenant data.
  if (!to) {
    console.warn('No recipient — skipping email:', subject);
    return false;
  }
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping email:', subject);
    return false;
  }
  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    console.log('Email sent:', data.id);
    return true;
  } catch (err) {
    console.error('Error sending email:', err.message);
    return false;
  }
};

export default sendEmail;