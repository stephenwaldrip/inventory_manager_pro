import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
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