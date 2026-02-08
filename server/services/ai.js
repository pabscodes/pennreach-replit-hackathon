const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

async function parseProfile(text) {
  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    max_completion_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `${PARSE_PROMPT}\n\nHere is the profile text to analyze:\n\n${text}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('Failed to get AI response');
  }
  return JSON.parse(responseText);
}

async function parseProfileFromFile(fileBuffer, mimeType) {
  const base64Data = fileBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const content = [
    {
      type: 'image_url',
      image_url: { url: dataUrl },
    },
    {
      type: 'text',
      text: PARSE_PROMPT,
    },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    max_completion_tokens: 800,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('Failed to get AI response');
  }
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }
  return JSON.parse(jsonMatch[0]);
}

async function generateDraft(user, contact, outreachGoal, goalDetail, availability) {
  const prompt = `You are writing a cold outreach email for an MBA student.

SENDER: ${user.preferredName || user.firstName || user.name || 'N/A'} ${user.lastName || ''}, ${user.school || 'N/A'}. Background: ${user.background || 'N/A'}. Interests: ${user.interests || 'N/A'}.

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
- End with sender's signature: ${user.emailSignature || user.preferredName || user.firstName || user.name || 'Best'}
- No "I hope this finds you well" or filler phrases

Return ONLY valid JSON, no markdown formatting or code blocks: { "subject": "...", "body": "..." }`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    max_completion_tokens: 800,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('Failed to get AI response');
  }
  return JSON.parse(responseText);
}

const RESUME_PARSE_PROMPT = `You are an expert resume parser. Extract structured information from this resume and return ONLY valid JSON:

{
  "firstName": "",
  "lastName": "",
  "workExperience": [
    { "company": "", "role": "", "years": "", "description": "" }
  ],
  "education": [
    { "institution": "", "degree": "", "year": "" }
  ],
  "skills": ["skill1", "skill2"],
  "interests": ["interest1", "interest2"]
}

Extract ALL work experience entries with company name, role/title, years/duration, and brief description.
Extract ALL education entries.
Extract skills and interests as arrays of short strings.
Return ONLY valid JSON, no markdown formatting or code blocks.`;

async function parseResume(text) {
  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    max_completion_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `${RESUME_PARSE_PROMPT}\n\nHere is the resume text:\n\n${text}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('Failed to get AI response');
  }
  return JSON.parse(responseText);
}

async function parseResumeFromFile(fileBuffer, mimeType) {
  const base64Data = fileBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const content = [
    {
      type: 'image_url',
      image_url: { url: dataUrl },
    },
    {
      type: 'text',
      text: RESUME_PARSE_PROMPT,
    },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    max_completion_tokens: 1500,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('Failed to get AI response');
  }
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }
  return JSON.parse(jsonMatch[0]);
}

async function generateBio(data) {
  const { firstName, lastName, workExperience, education, skills, interests } = data;
  const name = `${firstName || ''} ${lastName || ''}`.trim() || 'This person';

  const expSummary = (workExperience || [])
    .map(e => `${e.role} at ${e.company} (${e.years || 'N/A'})`)
    .join(', ');
  const eduSummary = (education || [])
    .map(e => `${e.degree} from ${e.institution}`)
    .join(', ');
  const skillsList = (skills || []).join(', ');
  const interestsList = (interests || []).join(', ');

  const prompt = `Generate a concise professional bio paragraph (3-4 sentences) for an MBA student based on this information:

Name: ${name}
Work Experience: ${expSummary || 'Not provided'}
Education: ${eduSummary || 'Not provided'}
Skills: ${skillsList || 'Not provided'}
Interests: ${interestsList || 'Not provided'}

Format: "[Name] is a [role/student] with [X] years of experience in [industries] at [companies]. [He/She/They] [education background]. [He/She/They] is interested in [interests] and skilled in [skills]."

Use "They/Their" for gender-neutral pronouns. Keep it professional and suitable for outreach emails.
Return ONLY valid JSON: { "bio": "..." }`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    max_completion_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error('Failed to get AI response');
  }
  return JSON.parse(responseText);
}

module.exports = {
  parseProfile,
  parseProfileFromFile,
  generateDraft,
  parseResume,
  parseResumeFromFile,
  generateBio,
};
