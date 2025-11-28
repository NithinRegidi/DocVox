// Google Gemini AI Integration for Document Analysis
// Uses the Gemini API for intelligent document analysis

export interface DetectedDeadline {
  date: string;
  type: 'payment' | 'renewal' | 'deadline' | 'appointment' | 'expiry' | 'other';
  description: string;
  amount?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface GeminiAnalysis {
  documentType: string;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  explanation: string;
  keyInformation: string[];
  suggestedActions: string[];
  warnings: string[];
  urgency: 'high' | 'medium' | 'low';
  category: string;
  speakableSummary: string;
  suggestedTags: string[];
  suggestedFolder: string;
  detectedDeadlines: DetectedDeadline[];
}

// Get API key from environment
const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API;

// Debug: Log API key status on load
console.log('🔑 Gemini API Key loaded:', GEMINI_API_KEY ? `Yes (${GEMINI_API_KEY.substring(0, 10)}...)` : 'No');

/**
 * Check if Gemini API is available
 */
export function isGeminiAvailable(): boolean {
  const available = !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
  console.log('🔍 Gemini API available:', available);
  return available;
}

/**
 * Analyze document using Google Gemini AI
 */
export async function analyzeWithGemini(
  text: string,
  detectedType: string
): Promise<GeminiAnalysis | null> {
  if (!isGeminiAvailable()) {
    console.log('Gemini API key not configured');
    return null;
  }

  try {
    // Truncate very long documents to avoid token limits
    const maxLength = 15000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '... [truncated]'
      : text;

    const prompt = `You are an expert document analyzer. Your job is to extract SPECIFIC, ACTUAL information from the document - not generic descriptions.

DOCUMENT TEXT TO ANALYZE:
"""
${truncatedText}
"""

INSTRUCTIONS:
1. Read the document carefully and extract REAL data (actual names, dates, amounts, addresses, etc.)
2. Do NOT give generic responses - be SPECIFIC to this exact document
3. For keyInformation, extract ACTUAL values like "Invoice #12345", "Amount: $500.00", "Due Date: Dec 15, 2025", "From: John Smith"
4. For warnings, identify REAL deadlines, overdue items, or concerning content
5. For suggestedActions, give SPECIFIC actions based on this document's content

Respond with a JSON object (no markdown, no code blocks):
{
  "documentType": "Be specific: Invoice, Bank Statement, Utility Bill, Medical Prescription, Employment Contract, Rental Agreement, Tax Form W-2, etc.",
  "confidence": "high",
  "summary": "Write 2-3 sentences describing WHAT this specific document is about, WHO it's from/to, and WHAT it contains.",
  "explanation": "Provide a detailed paragraph explaining: What is this document? Who issued it? What is its purpose? What are the key terms/conditions? What should the reader understand?",
  "keyInformation": [
    "Extract 5-10 SPECIFIC pieces of information like:",
    "📅 Date: [actual date from document]",
    "💰 Amount: [actual amount if any]",
    "👤 From: [actual sender/company name]",
    "👤 To: [actual recipient name]",
    "📧 Reference/ID: [any reference numbers]",
    "📍 Address: [any addresses mentioned]",
    "📞 Contact: [any phone/email]",
    "⚠️ Due Date: [any deadlines]"
  ],
  "suggestedActions": [
    "Give 3-5 SPECIFIC actions like:",
    "Pay the invoice of $X by [date]",
    "Contact [company] at [number] for questions",
    "Keep this document for tax records",
    "Sign and return by [deadline]"
  ],
  "warnings": [
    "List any REAL concerns found:",
    "Payment overdue by X days",
    "Deadline approaching: [date]",
    "Missing signature required",
    "Unusual charges detected"
  ],
  "urgency": "high if there are deadlines within 7 days or overdue items, medium if within 30 days, low otherwise",
  "category": "Financial, Legal, Medical, Personal, Business, Government, Education, or Insurance",
  "speakableSummary": "Write a natural sentence like: This is a [type] from [company] dated [date], regarding [main topic]. The total amount is [amount] and it is due by [date].",
  "suggestedTags": [
    "Suggest 3-6 relevant tags for organizing this document, such as:",
    "bill", "invoice", "receipt", "bank", "insurance", "medical", "prescription",
    "legal", "contract", "tax", "employment", "salary", "utility", "electricity",
    "water", "gas", "phone", "internet", "rent", "mortgage", "loan", "credit-card",
    "education", "certificate", "id-proof", "passport", "license", "urgent", "important"
  ],
  "suggestedFolder": "Suggest ONE folder from: Bills, Medical, Legal, Financial, Personal, Work, Government, Insurance, Education, Receipts",
  "detectedDeadlines": [
    {
      "date": "YYYY-MM-DD format - extract ANY date that represents a deadline, due date, expiry, renewal, or appointment",
      "type": "payment | renewal | deadline | appointment | expiry | other",
      "description": "Brief description like 'Electricity bill payment due' or 'Insurance policy renewal' or 'Passport expiry'",
      "amount": "Include if it's a payment (e.g., '$150.00' or '₹5000')",
      "priority": "high if within 7 days or overdue, medium if within 30 days, low otherwise"
    }
  ]
}

IMPORTANT: 
- Replace all placeholder text with ACTUAL data from the document. If information is not found, omit that field or write "Not specified in document".
- For detectedDeadlines: Look for ANY dates that represent something the user needs to act on - payment due dates, renewal dates, expiry dates, appointment dates, submission deadlines, etc.
- Convert all dates to YYYY-MM-DD format for consistency.
- If no deadlines are found, return an empty array for detectedDeadlines.`;

    // Try multiple model names in order of preference
    const modelNames = [
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest', 
      'gemini-1.5-flash-001',
      'gemini-pro',
    ];
    
    let response: Response | null = null;
    let lastError: string = '';
    
    for (const model of modelNames) {
      try {
        console.log(`🔄 Trying model: ${model}...`);
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 4096,
              },
            }),
          }
        );
        
        if (response.ok) {
          console.log(`✅ Model ${model} works!`);
          break;
        } else {
          const errorData = await response.json().catch(() => ({}));
          lastError = JSON.stringify(errorData);
          console.log(`❌ Model ${model} failed: ${response.status}`);
          response = null;
        }
      } catch (err) {
        console.log(`❌ Model ${model} error:`, err);
        response = null;
      }
    }
    
    if (!response) {
      throw new Error(`All Gemini models failed. Last error: ${lastError}`);
    }

    console.log('📡 Gemini API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Gemini API error:', response.status, errorData);
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('📥 Gemini raw response received');
    
    // Extract the text response
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      console.error('❌ No text in Gemini response:', data);
      throw new Error('No response content from Gemini');
    }

    console.log('📝 Gemini text response:', textResponse.substring(0, 200) + '...');

    // Parse the JSON response
    const analysis = parseGeminiResponse(textResponse);
    
    if (!analysis) {
      console.error('❌ Failed to parse Gemini response');
      throw new Error('Failed to parse Gemini response');
    }

    console.log('✅ Gemini analysis successful:', analysis.documentType);
    return analysis;
  } catch (error) {
    console.error('❌ Gemini analysis error:', error);
    throw error; // Re-throw to let hybrid analyzer handle it
  }
}

/**
 * Parse Gemini response to extract JSON
 */
function parseGeminiResponse(response: string): GeminiAnalysis | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // Validate and return with defaults
    return {
      documentType: parsed.documentType || 'Document',
      confidence: validateConfidence(parsed.confidence),
      summary: parsed.summary || '',
      explanation: parsed.explanation || '',
      keyInformation: Array.isArray(parsed.keyInformation) ? parsed.keyInformation : [],
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      urgency: validateUrgency(parsed.urgency),
      category: parsed.category || 'General',
      speakableSummary: parsed.speakableSummary || parsed.summary || '',
      suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
      suggestedFolder: parsed.suggestedFolder || 'Personal',
      detectedDeadlines: Array.isArray(parsed.detectedDeadlines) 
        ? parsed.detectedDeadlines.map((d: any) => ({
            date: d.date || '',
            type: validateDeadlineType(d.type),
            description: d.description || '',
            amount: d.amount,
            priority: validateUrgency(d.priority),
          }))
        : [],
    };
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
}

function validateConfidence(value: string): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

function validateUrgency(value: string): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'low';
}

function validateDeadlineType(value: string): 'payment' | 'renewal' | 'deadline' | 'appointment' | 'expiry' | 'other' {
  const validTypes = ['payment', 'renewal', 'deadline', 'appointment', 'expiry', 'other'];
  if (validTypes.includes(value)) {
    return value as 'payment' | 'renewal' | 'deadline' | 'appointment' | 'expiry' | 'other';
  }
  return 'other';
}
