const { buildTicketDescriptionHtml, getMockConversationReply } = require('../support.templates');

describe('support.templates unit tests', () => {
  test('buildTicketDescriptionHtml formats inputs properly', () => {
    const input = {
      category: 'Billing',
      name: 'Ram Singh',
      phone: '9876543210',
      role: 'farmer',
      description: 'Rent is incorrect'
    };

    const html = buildTicketDescriptionHtml(input);

    expect(html).toContain('Annsetu App Support Request');
    expect(html).toContain('Billing');
    expect(html).toContain('Ram Singh');
    expect(html).toContain('9876543210');
    expect(html).toContain('farmer');
    expect(html).toContain('Rent is incorrect');
  });

  test('buildTicketDescriptionHtml handles missing optional parameters', () => {
    const html = buildTicketDescriptionHtml({ description: 'help' });

    expect(html).toContain('General');
    expect(html).toContain('Anonymous User');
    expect(html).toContain('N/A');
    expect(html).toContain('help');
  });

  test('getMockConversationReply returns mock reply array', () => {
    const replies = getMockConversationReply();

    expect(Array.isArray(replies)).toBe(true);
    expect(replies).toHaveLength(1);
    expect(replies[0].id).toBe(9901);
    expect(replies[0].incoming).toBe(false);
    expect(replies[0].body_text).toContain('Hello! We have received your query');
  });
});
