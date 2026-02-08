async function findEmail(firstName, lastName, company, apiKey) {
  if (!apiKey) {
    throw new Error('Hunter.io API key is required. Please add your API key in Settings.');
  }

  if (!company) {
    throw new Error('Company name is required to search for email.');
  }

  try {
    const domainRes = await fetch(
      `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(company)}&api_key=${apiKey}`
    );
    const domainData = await domainRes.json();

    if (domainData.errors) {
      throw new Error(domainData.errors[0].details || 'Hunter.io API error');
    }

    const domain = domainData.data?.domain;
    if (!domain) {
      return {
        email: null,
        confidence: 0,
        suggestions: [
          `No domain found for "${company}" on Hunter.io`,
          'Try checking their LinkedIn for a personal email',
          'Try searching with a different company name variation',
        ],
      };
    }

    const finderRes = await fetch(
      `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName || '')}&last_name=${encodeURIComponent(lastName || '')}&api_key=${apiKey}`
    );
    const finderData = await finderRes.json();

    if (finderData.errors) {
      throw new Error(finderData.errors[0].details || 'Hunter.io API error');
    }

    const email = finderData.data?.email;
    const confidence = finderData.data?.confidence || 0;

    if (email) {
      return { email, confidence };
    }

    return {
      email: null,
      confidence: 0,
      suggestions: [
        `Domain found (${domain}) but no email match for ${firstName} ${lastName}`,
        'Try checking their LinkedIn for a personal email',
        `Try common patterns: ${(firstName || '')[0]?.toLowerCase() || ''}${(lastName || '').toLowerCase()}@${domain}`,
      ],
    };
  } catch (err) {
    if (err.message.includes('Hunter.io API key')) throw err;
    if (err.message.includes('Hunter.io API error')) throw err;
    throw new Error(`Failed to search for email: ${err.message}`);
  }
}

module.exports = { findEmail };
