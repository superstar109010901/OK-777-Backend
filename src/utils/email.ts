import 'dotenv/config';
import nodemailer from 'nodemailer';

const SMTP_USER: string | undefined = process.env.SMTP_USER;
const SMTP_PASSWORD: string | undefined = process.env.SMTP_PASSWORD;
const SMTP_HOST: string = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT: number = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587; // STARTTLS by default
const SMTP_SECURE: boolean = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465;
const SMTP_FROM: string | undefined = process.env.SMTP_FROM;
const SMTP_CONNECTION_TIMEOUT: number = process.env.SMTP_CONNECTION_TIMEOUT ? parseInt(process.env.SMTP_CONNECTION_TIMEOUT, 10) : 10000;
const SMTP_SOCKET_TIMEOUT: number = process.env.SMTP_SOCKET_TIMEOUT ? parseInt(process.env.SMTP_SOCKET_TIMEOUT, 10) : 20000;

export const sendEmail = async (email: string, subject: string, text: string): Promise<any> => {
  if (!SMTP_USER || !SMTP_PASSWORD) {
    throw new Error('SMTP credentials are not configured (SMTP_USER/SMTP_PASSWORD)');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT,
    socketTimeout: SMTP_SOCKET_TIMEOUT,
  });

  // Verify connection/auth for clearer deploy-time failures
  await transporter.verify();

  const mailOptions = {
    from: SMTP_FROM || `"OK777" <${SMTP_USER}>`,
    to: email,
    subject,
    text,
  };

  return transporter.sendMail(mailOptions);
};