export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers });
  }

  try {
    const body = await req.json();
    const { imageB64, mimeType = 'image/jpeg' } = body;

    if (!imageB64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400, headers });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageB64 }
            },
            {
              type: 'text',
              text: `You are an expert image analyst for AI image generation prompts. Analyze this frame precisely.

Output ONLY a JSON object (no other text):
{
  "scene": "Describe the background/environment in detail: space type, surfaces, materials, colors, objects visible, architectural elements, depth",
  "subject": "Describe the subject precisely: number of people, body position/pose, clothing (color, material, cut, style), accessories, expression, skin tone, hair",
  "composition": "Shot type (close-up/medium shot/full body/wide), camera angle, subject placement in frame, depth of field, foreground/background relationship",
  "lighting": "Light sources visible, direction (front/side/back/top), quality (hard/soft/diffused), shadows, highlights, color temperature effect on scene",
  "mood": "Overall visual mood, atmosphere, color palette description"
}`
            }
          ]
        }]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err?.error?.message || 'Claude API error', status: res.status }), { status: res.status, headers });
    }

    const data = await res.json();
    const txt = data.content?.[0]?.text || '';
    const clean = txt.replace(/```json|```/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');

    if (start >= 0 && end > start) {
      const result = JSON.parse(clean.slice(start, end + 1));
      return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Parse failed', raw: txt }), { status: 500, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}
