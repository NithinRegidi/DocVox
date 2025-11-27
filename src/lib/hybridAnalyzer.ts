// Hybrid Document Analyzer
// Tries Google Gemini AI first, falls back to local analyzer if unavailable

import { analyzeWithGemini, isGeminiAvailable, GeminiAnalysis } from './geminiAI';
import { analyzeDocumentLocally, LocalAnalysis } from './localAnalyzer';

export interface DocumentAnalysis {
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
  analysisSource: 'gemini-ai' | 'local';
}

export type AnalysisMode = 'auto' | 'ai-only' | 'local-only';

/**
 * Analyze a document using the hybrid approach
 * @param text - The extracted text from the document
 * @param detectedType - Basic document type detection from filename/content
 * @param mode - 'auto' (try AI, fallback to local), 'ai-only', or 'local-only'
 * @returns Document analysis result
 */
export async function analyzeDocumentHybrid(
  text: string,
  detectedType: string,
  mode: AnalysisMode = 'auto'
): Promise<DocumentAnalysis> {
  console.log(`🔄 Hybrid Analyzer: Starting analysis (mode: ${mode})...`);
  
  // Local-only mode
  if (mode === 'local-only') {
    console.log('📴 Using local analyzer (forced by mode)');
    return convertLocalAnalysis(analyzeDocumentLocally(text, detectedType));
  }
  
  // Check if Gemini is available
  const geminiAvailable = isGeminiAvailable();
  console.log(`🔑 Gemini API available: ${geminiAvailable}`);
  
  if (!geminiAvailable) {
    console.log('⚠️ Gemini API key not configured, using local analyzer');
    if (mode === 'ai-only') {
      throw new Error('AI analysis requested but Gemini API key is not configured');
    }
    return convertLocalAnalysis(analyzeDocumentLocally(text, detectedType));
  }
  
  // Try Gemini AI first (for 'auto' and 'ai-only' modes)
  try {
    console.log('🤖 Attempting Google Gemini AI analysis...');
    const aiAnalysis = await analyzeWithGemini(text, detectedType);
    
    if (aiAnalysis) {
      console.log('✅ Gemini AI analysis successful!');
      return convertGeminiAnalysis(aiAnalysis);
    }
    
    // AI returned null
    console.log('⚠️ Gemini AI returned no result');
    if (mode === 'ai-only') {
      throw new Error('AI analysis failed and ai-only mode was requested');
    }
  } catch (error) {
    console.warn('❌ Gemini AI error:', error);
    
    if (mode === 'ai-only') {
      throw error;
    }
    console.log('🔄 Falling back to local analyzer...');
  }
  
  // Fallback to local analyzer
  console.log('📴 Using local analyzer as fallback');
  return convertLocalAnalysis(analyzeDocumentLocally(text, detectedType));
}

/**
 * Convert Gemini AI analysis to standard format
 */
function convertGeminiAnalysis(analysis: GeminiAnalysis): DocumentAnalysis {
  return {
    documentType: analysis.documentType || 'Document',
    confidence: analysis.confidence || 'medium',
    summary: analysis.summary || '',
    explanation: analysis.explanation || '',
    keyInformation: analysis.keyInformation || [],
    suggestedActions: analysis.suggestedActions || [],
    warnings: analysis.warnings || [],
    urgency: analysis.urgency || 'low',
    category: analysis.category || 'General',
    speakableSummary: analysis.speakableSummary || analysis.summary || '',
    analysisSource: 'gemini-ai',
  };
}

/**
 * Convert local analysis to standard format
 */
function convertLocalAnalysis(analysis: LocalAnalysis): DocumentAnalysis {
  return {
    documentType: analysis.documentType || 'Document',
    confidence: analysis.confidence || 'medium',
    summary: analysis.summary || '',
    explanation: analysis.explanation || '',
    keyInformation: analysis.keyInformation || [],
    suggestedActions: analysis.suggestedActions || [],
    warnings: analysis.warnings || [],
    urgency: analysis.urgency || 'low',
    category: analysis.category || 'General',
    speakableSummary: analysis.speakableSummary || '',
    analysisSource: 'local',
  };
}
