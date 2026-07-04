const axios = require('axios');

/**
 * Sends an SMS using Twilio or a generic HTTP gateway, or falls back to console logging.
 * 
 * @param {object} params
 * @param {string} params.to - Recipient phone number
 * @param {string} params.message - SMS message content
 * @returns {Promise<{success: boolean, provider: string, providerMessageId: string}>}
 */
async function sendSMS({ to, message }) {
    // Twilio credentials
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

    // Generic HTTP SMS Gateway credentials
    const smsApiUrl = process.env.SMS_API_URL;
    const smsApiKey = process.env.SMS_API_KEY;
    const smsSenderId = process.env.SMS_SENDER_ID;

    const isTwilioConfigured = !!(twilioAccountSid && twilioAuthToken && twilioFromNumber);
    const isGenericConfigured = !!smsApiUrl;

    if (!isTwilioConfigured && !isGenericConfigured) {
        console.log(`
[MOCK SMS]
To: ${to}
Message: ${message}
-----------------------------------------`);
        return {
            success: true,
            provider: 'console',
            providerMessageId: 'mock-sms-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)
        };
    }

    if (isTwilioConfigured) {
        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
            const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
            const params = new URLSearchParams();
            params.append('To', to);
            params.append('From', twilioFromNumber);
            params.append('Body', message);

            const response = await axios.post(url, params, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            return {
                success: true,
                provider: 'twilio',
                providerMessageId: response.data.sid
            };
        } catch (error) {
            const errMsg = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
            console.error('[SMS Service] Twilio error:', errMsg);
            throw new Error(`Twilio SMS sending failed: ${errMsg}`);
        }
    }

    if (isGenericConfigured) {
        try {
            const response = await axios.post(smsApiUrl, {
                apiKey: smsApiKey,
                to,
                message,
                sender: smsSenderId
            });

            return {
                success: true,
                provider: 'generic-http',
                providerMessageId: response.data && response.data.id ? response.data.id : 'generic-' + Date.now()
            };
        } catch (error) {
            console.error('[SMS Service] Generic HTTP Gateway error:', error.message);
            throw error;
        }
    }
}

module.exports = { sendSMS };
