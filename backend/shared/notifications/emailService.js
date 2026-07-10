const nodemailer = require('nodemailer');

/**
 * Sends an email using SMTP if configured, or falls back to console logging.
 * 
 * @param {object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} [params.text] - Plain text body
 * @param {string} [params.html] - HTML body
 * @returns {Promise<{success: boolean, provider: string, providerMessageId: string, message: string}>}
 */
async function sendEmail({ to, subject, text, html }) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'no-reply@annsetu.local';

    const isConfigured = !!(host && user && pass);

    if (!isConfigured) {
        const bodyContent = text || html || '';
        console.log(`
[MOCK EMAIL]
To: ${to}
Subject: ${subject}
Body: ${bodyContent}
-----------------------------------------`);
        return {
            success: true,
            provider: 'console',
            providerMessageId: 'mock-email-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            message: bodyContent
        };
    }

    try {
        const transporter = nodemailer.createTransport({
            host,
            port: Number.parseInt(port, 10),
            secure: port === '465', // True for port 465, false for others
            auth: {
                user,
                pass
            }
        });

        const info = await transporter.sendMail({
            from,
            to,
            subject,
            text,
            html
        });

        return {
            success: true,
            provider: 'smtp',
            providerMessageId: info.messageId,
            message: text || html || ''
        };
    } catch (error) {
        console.error('[SMTP Email Service] Error sending email:', error.message);
        throw error;
    }
}

module.exports = { sendEmail };
