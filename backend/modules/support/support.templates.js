/**
 * Generates email HTML template with inline styling for Freshdesk tickets or SMTP fallbacks.
 */
function buildTicketDescriptionHtml({ category, name, phone, role, description }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #1E4032; border-bottom: 2px solid #52B788; padding-bottom: 8px;">Annsetu App Support Request</h2>
      <p>A new support request was submitted from the mobile application.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 120px;">Category:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${category || 'General'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">User Name:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${name || 'Anonymous User'}</td>
        </tr>
        <tr style="background: #f9f9f9;">
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Phone Number:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${phone || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">User Role:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${role || 'N/A'}</td>
        </tr>
      </table>
      
      <div style="background: #F5EDD6; border-left: 4px solid #D4882D; padding: 12px; margin-top: 16px;">
        <h3 style="margin-top: 0; color: #1E4032;">Message Detail / विवरण:</h3>
        <p style="white-space: pre-wrap; margin-bottom: 0;">${description}</p>
      </div>
      
      <p style="font-size: 11px; color: #777; margin-top: 24px;">Sent from Annsetu Support Module. Base URL: ${process.env.EXPO_PUBLIC_BACKEND_URL || 'N/A'}</p>
    </div>
  `;
}

/**
 * Returns mock conversations auto-reply array for demo mode.
 */
function getMockConversationReply() {
  return [
    {
      id: 9901,
      body: `<p>Hello! We have received your query regarding this issue. Our support executive will call you shortly on your registered number.</p>`,
      body_text: "Hello! We have received your query regarding this issue. Our support executive will call you shortly on your registered number.",
      incoming: false, // from agent
      created_at: new Date(Date.now() - 300000).toISOString()
    }
  ];
}

module.exports = { buildTicketDescriptionHtml, getMockConversationReply };
