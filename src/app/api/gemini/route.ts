import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { apiKey, prompt, model } = await request.json();

    const resolvedApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!resolvedApiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    let targetModel = model || 'gemini-2.5-flash';
    console.log(`Routing request to Gemini API for model: ${targetModel}`);

    const makeRequest = async (mdl: string) => {
      return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${resolvedApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
        })
      });
    };

    let response = await makeRequest(targetModel);

    // Fallback to gemini-1.5-flash if 429 Resource Exhausted on 2.5
    if (response.status === 429 && targetModel === 'gemini-2.5-flash') {
      console.warn('Gemini 2.5 Flash quota exceeded. Falling back to Gemini 1.5 Flash...');
      targetModel = 'gemini-1.5-flash-latest';
      response = await makeRequest(targetModel);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API request failed on model ${targetModel}: ${errorText}`);
      return NextResponse.json(
        { error: `Gemini API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Gemini proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
