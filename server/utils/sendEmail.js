import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping email:', subject);
    return;
  }
  try {
    const data = await resend.emails.send({
      from: 'Inventory Manager Pro <onboarding@resend.dev>',
      to: to || 'stephenwaldrip90@gmail.com',
      subject,
      html,
    });
    console.log('Email sent:', data.id);
  } catch (err) {
    console.error('Error sending email:', err.message);
  }
};

export default sendEmail;