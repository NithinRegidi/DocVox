/**
 * Multi-Model AI Service
 * Provides fallback support across multiple AI providers:
 * 1. Google Gemini (Primary)
 * 2. OpenAI GPT-4o (Fallback 1)
 * 3. Meta Llama 3.1 via GitHub Models (Fallback 2)
 * 
 * This ensures high availability and reliability for document analysis
 */

// API Keys from environment
const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API || '';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || '';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

// Model endpoints
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export interface AIResponse {
  text: string;
  model: string;
  success: boolean;
  error?: string;
}

export interface DocumentAnalysisResult {
  documentType: string;
  summary: string;
  explanation: string;
  keyInformation: string[];
  suggestedActions: string[];
  warnings: string[];
  speakableSummary: string;
  confidence: number;
  model: string;
}

/**
 * Check which AI services are available
 */
export function getAvailableModels(): string[] {
  const models: string[] = [];
  if (GEMINI_API_KEY) models.push('gemini-2.0-flash');
  if (OPENAI_API_KEY) models.push('gpt-4o');
  if (GITHUB_TOKEN) models.push('llama-3.1-70b');
  return models;
}

/**
 * Call Google Gemini API
 */
async function callGemini(prompt: string, imageBase64?: string): Promise<AIResponse> {
  if (!GEMINI_API_KEY) {
    return { text: '', model: 'gemini', success: false, error: 'Gemini API key not configured' };
  }

  try {
    const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [{ text: prompt }];
    
    if (imageBase64) {
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: imageBase64
        }
      });
    }

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return { text, model: 'gemini-2.0-flash', success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Gemini Error:', errMsg);
    return { text: '', model: 'gemini', success: false, error: errMsg };
  }
}

/**
 * Call OpenAI GPT-4o API
 */
async function callOpenAI(prompt: string, imageBase64?: string): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    return { text: '', model: 'gpt-4o', success: false, error: 'OpenAI API key not configured' };
  }

  try {
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];
    
    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.3,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    return { text, model: 'gpt-4o', success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ OpenAI Error:', errMsg);
    return { text: '', model: 'gpt-4o', success: false, error: errMsg };
  }
}

/**
 * Call Meta Llama 3.1 via GitHub Models
 */
async function callLlama(prompt: string): Promise<AIResponse> {
  if (!GITHUB_TOKEN) {
    return { text: '', model: 'llama-3.1', success: false, error: 'GitHub token not configured' };
  }

  try {
    const response = await fetch(GITHUB_MODELS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`
      },
      body: JSON.stringify({
        model: 'meta-llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: 'You are a helpful document analysis assistant. Always respond in valid JSON format when asked.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'GitHub Models API error');
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    return { text, model: 'llama-3.1-70b', success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Llama Error:', errMsg);
    return { text: '', model: 'llama-3.1', success: false, error: errMsg };
  }
}

/**
 * Multi-model AI call with automatic fallback
 * Tries: Gemini → GPT-4o → Llama 3.1
 */
export async function callAIWithFallback(
  prompt: string, 
  imageBase64?: string,
  preferredModel?: 'gemini' | 'gpt-4o' | 'llama'
): Promise<AIResponse> {
  const models = [
    { name: 'gemini', fn: () => callGemini(prompt, imageBase64) },
    { name: 'gpt-4o', fn: () => callOpenAI(prompt, imageBase64) },
    { name: 'llama', fn: () => callLlama(prompt) } // Llama doesn't support images via GitHub Models
  ];

  // Reorder based on preference
  if (preferredModel) {
    const preferredIndex = models.findIndex(m => m.name === preferredModel);
    if (preferredIndex > 0) {
      const [preferred] = models.splice(preferredIndex, 1);
      models.unshift(preferred);
    }
  }

  const errors: string[] = [];

  for (const model of models) {
    console.log(`🤖 Trying ${model.name}...`);
    const result = await model.fn();
    
    if (result.success && result.text) {
      console.log(`✅ ${model.name} succeeded`);
      return result;
    }
    
    errors.push(`${model.name}: ${result.error}`);
    console.log(`⚠️ ${model.name} failed, trying next...`);
  }

  return {
    text: '',
    model: 'none',
    success: false,
    error: `All models failed: ${errors.join('; ')}`
  };
}

/**
 * Analyze document with multi-model fallback
 */
export async function analyzeDocumentMultiModel(
  text: string,
  imageBase64?: string,
  fileName?: string
): Promise<DocumentAnalysisResult> {
  const prompt = `Analyze this document and provide a JSON response with the following structure:
{
  "documentType": "type of document (e.g., Invoice, Medical Report, Legal Document, etc.)",
  "summary": "brief 2-3 sentence summary",
  "explanation": "detailed explanation in simple language that anyone can understand",
  "keyInformation": ["array of key facts/numbers/dates extracted"],
  "suggestedActions": ["array of recommended actions the user should take"],
  "warnings": ["array of important warnings or things to be careful about"],
  "speakableSummary": "Write a friendly, conversational introduction in 4-6 sentences. Start with 'So, I have looked at this document for you...' then explain what type of document it is, who it's from, what it's about in simple terms, and what the person should do. Make it natural like talking to a friend.",
  "confidence": 0.95
}

Document content:
${text.substring(0, 8000)}

${fileName ? `File name: ${fileName}` : ''}

Respond ONLY with valid JSON, no markdown or explanation.`;

  const result = await callAIWithFallback(prompt, imageBase64);

  if (!result.success) {
    throw new Error(result.error || 'Failed to analyze document');
  }

  try {
    // Clean up response - remove markdown code blocks if present
    let jsonText = result.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const analysis = JSON.parse(jsonText);
    return {
      ...analysis,
      model: result.model
    };
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    // Return a basic analysis if parsing fails
    return {
      documentType: 'Document',
      summary: result.text.substring(0, 200),
      explanation: result.text,
      keyInformation: [],
      suggestedActions: ['Review the document carefully'],
      warnings: [],
      speakableSummary: result.text.substring(0, 300),
      confidence: 0.5,
      model: result.model
    };
  }
}

/**
 * Translate text with multi-model fallback
 */
export async function translateWithFallback(
  text: string,
  targetLanguage: string,
  targetLanguageName: string
): Promise<{ text: string; model: string }> {
  const prompt = `Translate the following text to ${targetLanguageName} (${targetLanguage}). 
Keep the meaning accurate and use natural, conversational language.
Only respond with the translated text, nothing else.

Text to translate:
${text}`;

  const result = await callAIWithFallback(prompt);

  if (!result.success) {
    throw new Error(result.error || 'Translation failed');
  }

  return { text: result.text, model: result.model };
}

/**
 * Chat about document with multi-model fallback
 */
export async function chatAboutDocumentMultiModel(
  question: string,
  documentText: string,
  documentType: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  language: string = 'English'
): Promise<{ answer: string; model: string }> {
  const historyText = chatHistory
    .slice(-6) // Last 6 messages for context
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `You are a helpful document assistant. Answer questions about the document in ${language}.
Be conversational, helpful, and explain things simply.

Document Type: ${documentType}
Document Content:
${documentText.substring(0, 6000)}

${historyText ? `Previous conversation:\n${historyText}\n` : ''}

User's question: ${question}

Respond in ${language}. Be helpful and concise.`;

  const result = await callAIWithFallback(prompt);

  if (!result.success) {
    throw new Error(result.error || 'Failed to get response');
  }

  return { answer: result.text, model: result.model };
}

// Export individual model functions for direct access
export { callGemini, callOpenAI, callLlama };
