const nodemailer = require("nodemailer");

let transporter;

// Create the Gmail SMTP transport once, on first use, from the .env settings
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

// Escape user-supplied text before placing it in the email's HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// US-01: Send the confirmation link a new student must click before logging in
async function sendVerificationEmail(to, firstName, link) {
  const name = escapeHtml(firstName);

  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Confirm your BookLink account",
    text: `Hi ${firstName},\n\nConfirm your email to activate your BookLink account:\n${link}\n\nThis link expires in 24 hours. If you didn't sign up for BookLink, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #2563eb;">Welcome to BookLink, ${name}!</h2>
        <p>Confirm your email address to activate your account.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Confirm email</a>
        </p>
        <p style="font-size: 13px; color: #64748b;">Or paste this link into your browser:<br>${link}</p>
        <p style="font-size: 13px; color: #64748b;">This link expires in 24 hours. If you didn't sign up for BookLink, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = {
  sendVerificationEmail,
};
