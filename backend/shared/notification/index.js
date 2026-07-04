const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { logOutboundNotification } = require('../notifications/notifications');

/**
 * Sends an email and registers a log in the database.
 * 
 * @param {object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} [params.text] - Plain text body
 * @param {string} [params.html] - HTML body
 * @param {string} [params.coldStorageId] - Optional cold storage ID associated with this message
 * @param {string} [params.eventType] - Event name/type (default 'SYSTEM_ALERT')
 * @param {string} [params.recipientName] - Recipient name
 * @param {string} [params.relatedModel] - Related model name
 * @param {string} [params.relatedId] - Related record ID
 * @param {object} [params.metadata] - Extra metadata object
 * @returns {Promise<object>}
 */
async function sendEmailWithLog({
    to,
    subject,
    text = null,
    html = null,
    coldStorageId = null,
    eventType = 'SYSTEM_ALERT',
    recipientName = null,
    relatedModel = null,
    relatedId = null,
    metadata = null
}) {
    try {
        const result = await sendEmail({ to, subject, text, html });
        await logOutboundNotification({
            coldStorageId,
            channel: 'EMAIL',
            eventType,
            recipientEmail: to,
            recipientName,
            subject,
            message: text || html || '',
            status: 'SENT',
            provider: result.provider,
            providerMessageId: result.providerMessageId,
            relatedModel,
            relatedId,
            metadata
        });
        return result;
    } catch (error) {
        const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
        await logOutboundNotification({
            coldStorageId,
            channel: 'EMAIL',
            eventType,
            recipientEmail: to,
            recipientName,
            subject,
            message: text || html || '',
            status: 'FAILED',
            provider: isConfigured ? 'smtp' : 'console',
            errorMessage: error.message,
            relatedModel,
            relatedId,
            metadata
        });
        throw error;
    }
}

/**
 * Sends an SMS and registers a log in the database.
 * 
 * @param {object} params
 * @param {string} params.to - Recipient phone number
 * @param {string} params.message - SMS message text
 * @param {string} [params.coldStorageId] - Optional cold storage ID associated with this message
 * @param {string} [params.eventType] - Event name/type (default 'SYSTEM_ALERT')
 * @param {string} [params.recipientName] - Recipient name
 * @param {string} [params.relatedModel] - Related model name
 * @param {string} [params.relatedId] - Related record ID
 * @param {object} [params.metadata] - Extra metadata object
 * @returns {Promise<object>}
 */
async function sendSMSWithLog({
    to,
    message,
    coldStorageId = null,
    eventType = 'SYSTEM_ALERT',
    recipientName = null,
    relatedModel = null,
    relatedId = null,
    metadata = null
}) {
    try {
        const result = await sendSMS({ to, message });
        await logOutboundNotification({
            coldStorageId,
            channel: 'SMS',
            eventType,
            recipientPhone: to,
            recipientName,
            message,
            status: 'SENT',
            provider: result.provider,
            providerMessageId: result.providerMessageId,
            relatedModel,
            relatedId,
            metadata
        });
        return result;
    } catch (error) {
        const isSmsConfigured = !!(
            (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) ||
            process.env.SMS_API_URL
        );
        await logOutboundNotification({
            coldStorageId,
            channel: 'SMS',
            eventType,
            recipientPhone: to,
            recipientName,
            message,
            status: 'FAILED',
            provider: isSmsConfigured ? 'sms-api' : 'console',
            errorMessage: error.message,
            relatedModel,
            relatedId,
            metadata
        });
        throw error;
    }
}

module.exports = {
    sendEmail: sendEmailWithLog,
    sendSMS: sendSMSWithLog
};
