const Anthropic = require('@anthropic-ai/sdk');

const PARSE_PROMPT = `You are an expert at analyzing professional profiles. Extract information and return ONLY valid JSON:

{
  "firstName": "",
  "lastName": "",
  "company": "current company",
  "role": "current title",
  "linkedinUrl": "if visible in the profile",
  "profileSummary": "2-3 sentence summary of their career trajectory and what makes them interesting to network with",
  "hooks": ["3-5 specific conversation hooks based on their background"]
}

IMPORTANT: Also analyze the profile deeply to identify:
- Their career trajectory and key transitions
- What they might be passionate about based on their roles
- Any Penn/Wharton connection
- Conversation hooks (shared interests, mutual connections, notable achievements)

Return ONLY valid JSON, no markdown formatting or code blocks.`;

async function parseProfile(text, anthropicApiKey) {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key is required. Please add your API key in Settings.');
  }

  const client = new Anthropic({ apiKey: anthropicApiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `${PARSE_PROMPT}\n\nHere is the profile text to analyze:\n\n${text}`,
      },
    ],
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }
  return JSON.parse(jsonMatch[0]);
}

async function parseProfileFromFile(fileBuffer, mimeType, anthropicApiKey) {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key is required. Please add your API key in Settings.');
  }

  const client = new Anthropic({ apiKey: anthropicApiKey });
  const base64Data = fileBuffer.toString('base64');

  let content;
  if (mimeType === 'application/pdf') {
    content = [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: mimeType,
          data: base64Data,
        },
      },
      {
        type: 'text',
        text: PARSE_PROMPT,
      },
    ];
  } else {
    content = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType,
          data: base64Data,
        },
      },
      {
        type: 'text',
        text: PARSE_PROMPT,
      },
    ];
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }
  return JSON.parse(jsonMatch[0]);
}

async function generateDraft(user, contact, outreachGoal, goalDetail, availability, anthropicApiKey) {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key is required. Please add your API key in Settings.');
  }

  const client = new Anthropic({ apiKey: anthropicApiKey });

  const prompt = `You are writing a cold outreach email for an MBA student.

SENDER: ${user.name || 'N/A'}, ${user.school || 'N/A'}. Background: ${user.background || 'N/A'}. Interests: ${user.interests || 'N/A'}.

RECIPIENT: ${contact.firstName || ''} ${contact.lastName || ''}, ${contact.role || 'N/A'} at ${contact.company || 'N/A'}.
Background: ${contact.profileSummary || 'N/A'}
Hooks: ${contact.hooks || 'N/A'}

GOAL: ${outreachGoal || 'coffee_chat'}
CONTEXT: ${goalDetail || 'General networking'}
AVAILABILITY: ${availability || 'not provided'}

Write a cold email. Rules:
- Subject line: short, specific, mentions their company or a shared connection
- Under 150 words body
- Open with something specific about THEM
- Connect sender's background to recipient's world
- Clear ask: 15-minute call
- Include availability if provided
- End with sender's signature: ${user.emailSignature || user.name || 'Best'}
- No "I hope this finds you well" or filler phrases

Return ONLY valid JSON, no markdown formatting or code blocks: { "subject": "...", "body": "..." }`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }
  return JSON.parse(jsonMatch[0]);
}

module.exports = {
  parseProfile,
  parseProfileFromFile,
  generateDraft,
};
