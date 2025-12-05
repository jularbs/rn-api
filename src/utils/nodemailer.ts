import * as nodemailer from "nodemailer";
import { config } from "dotenv";

config();

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email options interface
interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
}

// Default email configuration from environment variables
const defaultEmailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true" || false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
};

// Create transporter with configuration
const createTransporter = (config: EmailConfig = defaultEmailConfig) => {
  if (!config.auth.user || !config.auth.pass) {
    throw new Error("SMTP credentials are required. Please set SMTP_USER and SMTP_PASS environment variables.");
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
    // Additional options for better compatibility
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Default transporter instance
const transporter = createTransporter();

// Main function to send emails
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const { to, subject, body, isHtml = false, from = process.env.SMTP_USER, cc, bcc, attachments } = options;

    // Validate required fields
    if (!to || !subject || !body) {
      throw new Error("Recipient (to), subject, and body are required fields");
    }

    if (!from) {
      throw new Error("Sender email is required. Please set SMTP_USER environment variable.");
    }

    // Prepare email options
    const mailOptions = {
      from: { name: process.env.SMTP_NAME || "MBC Media Group", address: from },
      to: Array.isArray(to) ? to.join(", ") : to,
      subject: subject,
      ...(isHtml ? { html: body } : { text: body }),
      ...(cc && { cc: Array.isArray(cc) ? cc.join(", ") : cc }),
      ...(bcc && { bcc: Array.isArray(bcc) ? bcc.join(", ") : bcc }),
      ...(attachments && { attachments }),
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", {
      messageId: info.messageId,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Function to verify SMTP connection
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log("SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("SMTP connection verification failed:", error);
    return false;
  }
};

// Function to send welcome email template
export const sendWelcomeEmail = async (to: string, userName: string): Promise<boolean> => {
  const subject = "Welcome to Radyo Natin!";

  const body = `
    <h2>Welcome to Radyo Natin, ${userName}!</h2>
    <p>Thank you for registering with Radyo Natin. We're thrilled to have you on board.</p>
    <p>You're account has already been approved and can now proceed to login on our Radyo Natin CMS Portal at <a href="${
      process.env.MANAGE_DOMAIN || "http://localhost:3001"
    }/auth/login">${process.env.MANAGE_DOMAIN || "http://localhost:3001"}</a></p>
    <p>We're excited to have you as part of our team.</p>
    <p>Best regards,<br>The Radyo Natin Team</p>
  `;

  return sendEmail({to, subject, body, isHtml: true });
};

// Function to send password reset email
export const sendPasswordResetEmail = async (to: string, userName: string, token: string): Promise<boolean> => {
  const subject = "Password Reset Request - Radyo Natin";

  const resetLink = `${process.env.MANAGE_DOMAIN || "http://localhost:3001"}/auth/reset-password?e=${encodeURIComponent(to)}&t=${encodeURIComponent(token)}`;
  const body = `
    <h2>Password Reset Request</h2>
    <p>Hello ${userName},</p>
    <p>We received a request to reset your password for your Radyo Natin account.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
    <p>If the button doesn't work, copy and paste this link into your browser: ${resetLink}</p>
    <p><strong>This link will expire in 2 hours for security reasons.</strong></p>
    <p>If you didn't request this password reset, please ignore this email.</p>
    <p>Best regards,<br>The Radyo Natin Team</p>
  `;

  return sendEmail({to, subject, body, isHtml: true });
};

export const sendPasswordChangeNotificationEmail = async (to: string, userName: string): Promise<boolean> => {
  const subject = "Your Password Has Been Changed - Radyo Natin";

  const body = `
    <h2>Password Change Notification</h2>
    <p>Hello ${userName},</p>
    <p>This is a confirmation that the password for your Radyo Natin account has been successfully changed.</p>
    <p>If you did not make this change, please contact our support team immediately.</p>
    <p>Best regards,<br>The Radyo Natin Team</p>
  `;

  return sendEmail({to, subject, body, isHtml: true});
};

// Function to send general notification email
export const sendNotificationEmail = async (
  to: string | string[],
  title: string,
  message: string,
  isUrgent: boolean = false
): Promise<boolean> => {
  const urgentPrefix = isUrgent ? "[URGENT] " : "";
  const subject = `${urgentPrefix}${title} - Radyo Natin`;

  const body = `
    <h2>${title}</h2>
    <div style="${isUrgent ? "border-left: 4px solid #dc3545; padding-left: 15px; background-color: #f8f9fa;" : ""}">
      <p>${message}</p>
    </div>
    <p>Best regards,<br>The Radyo Natin Team</p>
  `;

  return sendEmail({to, subject, body, isHtml: true });
};

// Export the transporter for advanced usage
export { transporter, createTransporter };

// Export types for external usage
export type { EmailOptions, EmailConfig };
