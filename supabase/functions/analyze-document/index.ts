import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, detectedType } = await req.json();
    
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No text found in document. The file may be empty or unreadable." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service is not configured. Document saved without AI analysis." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert document analyst and personal assistant. Your job is to help users understand documents clearly and guide them on what to do next.

Analyze the provided document and return a comprehensive analysis in JSON format:

{
  "documentType": "precise document type (e.g., Bank Statement, Medical Report, Legal Notice, Invoice, Contract, Resume, Government Form, Insurance Claim, Tax Document, etc.)",
  "confidence": "high/medium/low",
  "summary": "A clear 2-3 sentence explanation of what this document is about, written in simple language that anyone can understand. Avoid jargon.",
  "explanation": "A detailed paragraph (4-6 sentences) explaining the document's purpose, what it means for the reader, and any important context they should know.",
  "keyInformation": ["List 4-6 of the most critical facts, dates, amounts, names, or deadlines found in the document. Be specific with numbers and dates."],
  "suggestedActions": ["List 4-6 clear, specific action steps the user should take. Each step should be actionable and include timeframes where relevant. Start each with a verb like 'Call...', 'Submit...', 'Review...', 'Save...', 'Pay...', etc."],
  "warnings": ["Any important warnings, deadlines, or things the user should be careful about. Leave empty array if none."],
  "urgency": "high/medium/low (high = needs immediate attention within 24-48 hours, medium = needs attention within a week, low = informational or no time pressure)",
  "category": "Financial/Legal/Personal/Business/Medical/Government/Insurance/Employment/Other",
  "speakableSummary": "A conversational 3-4 sentence summary optimized for text-to-speech. Use natural language as if you're explaining this to a friend. Include the most important action the user should take."
}

Guidelines:
- Write for someone who may not understand complex terminology
- Be specific with dates, amounts, and names when found in the document
- Prioritize actionable advice
- If there are deadlines, always mention them prominently
- For financial documents, always highlight key amounts and due dates
- For legal documents, emphasize any required responses or deadlines
- For medical documents, note important dates and follow-up requirements`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Analyze this document:\n\nInitial Type Detection: ${detectedType}\n\nDocument Text:\n${text.substring(0, 4000)}`
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service is busy. Please try again in a few moments." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Document saved without AI analysis." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis temporarily unavailable. Document saved without analysis." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-document:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to analyze document. The document was saved but AI analysis is unavailable." 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
