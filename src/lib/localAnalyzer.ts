// Local Document Analyzer - Analyzes actual document content
// Provides intelligent analysis based on what's actually in the document

export interface LocalAnalysis {
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
}

// Document type detection patterns
const documentTypePatterns = [
  { patterns: [/invoice|inv\s*#|bill\s*to|amount\s*due|total.*due/i], type: 'Invoice', category: 'Financial' },
  { patterns: [/bank\s*statement|account\s*summary|transaction\s*history/i], type: 'Bank Statement', category: 'Financial' },
  { patterns: [/receipt|payment\s*received|transaction\s*id/i], type: 'Receipt', category: 'Financial' },
  { patterns: [/tax\s*return|w-2|1099|tax\s*year/i], type: 'Tax Document', category: 'Financial' },
  { patterns: [/salary|pay\s*stub|payslip|earnings.*deductions/i], type: 'Salary Slip', category: 'Financial' },
  { patterns: [/contract|agreement|hereby\s*agree|terms\s*and\s*conditions/i], type: 'Contract', category: 'Legal' },
  { patterns: [/legal\s*notice|court|lawsuit|plaintiff|defendant/i], type: 'Legal Notice', category: 'Legal' },
  { patterns: [/lease|rental|landlord|tenant|monthly\s*rent/i], type: 'Lease Agreement', category: 'Legal' },
  { patterns: [/medical|diagnosis|patient|prescription|dr\.|hospital/i], type: 'Medical Document', category: 'Medical' },
  { patterns: [/resume|cv|work\s*experience|education|skills/i], type: 'Resume', category: 'Personal' },
  { patterns: [/dear\s*(?:sir|madam|hiring)|cover\s*letter|application/i], type: 'Letter', category: 'Personal' },
  { patterns: [/memo|memorandum|to:.*from:.*subject:/i], type: 'Memo', category: 'Business' },
  { patterns: [/report|analysis|findings|conclusion/i], type: 'Report', category: 'Business' },
  { patterns: [/certificate|certif|awarded|completed/i], type: 'Certificate', category: 'Official' },
];

export function analyzeDocumentLocally(text: string, detectedType: string): LocalAnalysis {
  if (!text || text.trim().length === 0) {
    return getEmptyAnalysis();
  }
  
  const cleanText = text.trim();
  const wordCount = cleanText.split(/\s+/).length;
  
  // Detect document type from content
  const { type: documentType, category } = detectDocumentType(cleanText, detectedType);
  
  // Extract actual content from the document
  const extractedContent = extractDocumentContent(cleanText);
  
  // Generate summary from actual content
  const summary = generateContentSummary(cleanText, extractedContent, documentType, wordCount);
  
  // Generate explanation based on what's in the document
  const explanation = generateContentExplanation(cleanText, extractedContent, documentType);
  
  // Extract key information actually found in the document
  const keyInformation = extractKeyInformation(cleanText, extractedContent);
  
  // Detect urgency from actual content
  const urgency = detectUrgency(cleanText);
  
  // Detect warnings from actual content
  const warnings = detectWarnings(cleanText);
  
  // Generate actions based on document content
  const suggestedActions = generateContentBasedActions(cleanText, extractedContent, documentType, urgency);
  
  // Determine confidence
  const confidence = wordCount > 100 ? 'high' : wordCount > 30 ? 'medium' : 'low';
  
  // Generate speakable summary
  const speakableSummary = `This document is ${documentType.toLowerCase()}. ${summary} ${suggestedActions[0] ? 'You should ' + suggestedActions[0].toLowerCase() : ''}`;
  
  return {
    documentType,
    confidence,
    summary,
    explanation,
    keyInformation,
    suggestedActions,
    warnings,
    urgency,
    category,
    speakableSummary,
  };
}

function getEmptyAnalysis(): LocalAnalysis {
  return {
    documentType: 'Empty Document',
    confidence: 'low',
    summary: 'The document appears to be empty or could not be read.',
    explanation: 'No text content was found in this document.',
    keyInformation: [],
    suggestedActions: ['Try uploading a different file', 'Ensure the document contains readable text'],
    warnings: ['No content detected'],
    urgency: 'low',
    category: 'Unknown',
    speakableSummary: 'This document appears to be empty.',
  };
}

function detectDocumentType(text: string, fallbackType: string): { type: string; category: string } {
  for (const { patterns, type, category } of documentTypePatterns) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return { type, category };
      }
    }
  }
  return { type: fallbackType || 'General Document', category: 'General' };
}

interface ExtractedContent {
  dates: string[];
  amounts: string[];
  names: string[];
  emails: string[];
  phones: string[];
  references: string[];
  importantPhrases: string[];
  firstParagraph: string;
  mainTopics: string[];
}

function extractDocumentContent(text: string): ExtractedContent {
  // Extract dates
  const datePatterns = [
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g,
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/gi,
    /\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}/gi,
  ];
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) dates.push(...matches);
  }
  
  // Extract money amounts
  const amountPattern = /[$€£₹]\s*[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|USD|EUR|GBP|INR)/gi;
  const amounts = text.match(amountPattern) || [];
  
  // Extract email addresses
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailPattern) || [];
  
  // Extract phone numbers
  const phonePattern = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phonePattern) || [];
  
  // Extract reference numbers
  const refPattern = /(?:ref|reference|invoice|order|account|id|no|number)[.:#\s]*([A-Z0-9\-]{4,})/gi;
  const references: string[] = [];
  let match;
  while ((match = refPattern.exec(text)) !== null) {
    references.push(match[1]);
  }
  
  // Extract names (capitalized words that look like names)
  const namePattern = /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g;
  const names = text.match(namePattern) || [];
  
  // Get first paragraph
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  const firstParagraph = paragraphs[0]?.trim().substring(0, 300) || '';
  
  // Extract important phrases (sentences with key words)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const importantWords = /important|urgent|deadline|payment|action|required|please|must|should|notice|warning|attention/i;
  const importantPhrases = sentences
    .filter(s => importantWords.test(s))
    .slice(0, 3)
    .map(s => s.trim().substring(0, 150));
  
  // Extract main topics (most frequently mentioned meaningful words)
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const stopWords = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'will', 'would', 'could', 'should', 'there', 'where', 'when', 'what', 'which', 'about', 'into', 'more', 'some', 'such', 'than', 'then', 'these', 'only', 'other', 'also', 'your', 'please']);
  const wordCounts: Record<string, number> = {};
  for (const word of words) {
    if (!stopWords.has(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }
  const mainTopics = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  
  return { dates, amounts, names, emails, phones, references, importantPhrases, firstParagraph, mainTopics };
}

function generateContentSummary(text: string, content: ExtractedContent, docType: string, wordCount: number): string {
  const parts: string[] = [];
  
  // Get the most meaningful opening
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
  
  // Find the most informative sentence (not just first one)
  let bestSentence = '';
  for (const sentence of sentences.slice(0, 5)) {
    const cleaned = sentence.trim();
    // Skip sentences that are too generic
    if (cleaned.length > 30 && 
        !cleaned.toLowerCase().startsWith('dear') &&
        !cleaned.toLowerCase().startsWith('hi') &&
        !cleaned.toLowerCase().startsWith('hello') &&
        !cleaned.toLowerCase().match(/^(this|the|a|an)\s+(is|document|letter|file)/i)) {
      bestSentence = cleaned.substring(0, 200);
      break;
    }
  }
  
  if (bestSentence) {
    parts.push(bestSentence);
  } else if (content.firstParagraph) {
    parts.push(content.firstParagraph.substring(0, 150));
  }
  
  // Add specific details found
  const details: string[] = [];
  
  if (content.amounts.length > 0) {
    details.push(`Amount: ${content.amounts[0]}`);
  }
  
  if (content.dates.length > 0) {
    details.push(`Date: ${content.dates[0]}`);
  }
  
  if (content.references.length > 0) {
    details.push(`Ref: ${content.references[0]}`);
  }
  
  if (details.length > 0) {
    parts.push(`Key details - ${details.join(', ')}`);
  }
  
  // Add context about document length
  if (wordCount > 500) {
    parts.push(`This is a detailed document with ${wordCount} words`);
  } else if (wordCount > 100) {
    parts.push(`Document length: ${wordCount} words`);
  }
  
  return parts.join('. ').trim() + (parts.length > 0 ? '.' : '');
}

function generateContentExplanation(text: string, content: ExtractedContent, docType: string): string {
  const parts: string[] = [];
  const textLower = text.toLowerCase();
  
  // Start with document-specific explanation
  if (docType === 'Invoice') {
    parts.push('This is a billing document requesting payment for goods or services');
    if (content.amounts.length > 0) {
      parts.push(`The total amount due is ${content.amounts[0]}`);
    }
  } else if (docType === 'Contract' || docType === 'Lease Agreement') {
    parts.push('This is a legal agreement that may be binding once signed');
    parts.push('Review all terms carefully before agreeing');
  } else if (docType === 'Medical Document') {
    parts.push('This contains medical or health-related information');
    parts.push('Consult with your healthcare provider about any findings');
  } else if (docType === 'Receipt') {
    parts.push('This is proof of a completed transaction or payment');
  } else if (docType === 'Letter') {
    parts.push('This is a formal communication');
  } else if (docType === 'Report') {
    parts.push('This document presents findings or analysis');
  } else {
    // Generic but content-aware explanation
    if (content.amounts.length > 0) {
      parts.push('This document contains financial information that may require your attention');
    }
    if (content.dates.length > 0) {
      parts.push('There are important dates mentioned that you should note');
    }
    if (textLower.includes('please') || textLower.includes('request') || textLower.includes('require')) {
      parts.push('Action or response may be required from you');
    }
  }
  
  // Add specific findings
  if (content.importantPhrases.length > 0) {
    const phrase = content.importantPhrases[0];
    if (phrase.length > 20 && phrase.length < 100) {
      parts.push(`Notable point: "${phrase.trim()}"`);
    }
  }
  
  // Contact information available
  if (content.emails.length > 0 || content.phones.length > 0) {
    parts.push('Contact information is provided for follow-up questions');
  }
  
  if (parts.length === 0) {
    parts.push('Review this document carefully to understand its full content and any required actions');
  }
  
  return parts.join('. ').trim() + '.';
}

function extractKeyInformation(text: string, content: ExtractedContent): string[] {
  const keyInfo: string[] = [];
  
  // Add extracted details as key information
  if (content.dates.length > 0) {
    keyInfo.push(`📅 Date: ${content.dates[0]}`);
  }
  
  if (content.amounts.length > 0) {
    keyInfo.push(`💰 Amount: ${content.amounts[0]}`);
  }
  
  if (content.references.length > 0) {
    keyInfo.push(`🔢 Reference: ${content.references[0]}`);
  }
  
  if (content.emails.length > 0) {
    keyInfo.push(`📧 Email: ${content.emails[0]}`);
  }
  
  if (content.phones.length > 0) {
    keyInfo.push(`📞 Phone: ${content.phones[0]}`);
  }
  
  if (content.names.length > 0) {
    keyInfo.push(`👤 Contact: ${content.names[0]}`);
  }
  
  // If no structured data found, extract key sentences
  if (keyInfo.length === 0 && content.importantPhrases.length > 0) {
    keyInfo.push(...content.importantPhrases.map(p => `📌 ${p}`));
  }
  
  // Still nothing? Get first few sentences
  if (keyInfo.length === 0) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
    keyInfo.push(...sentences.slice(0, 3).map(s => `📄 ${s.trim().substring(0, 100)}`));
  }
  
  return keyInfo.slice(0, 6);
}

function detectUrgency(text: string): 'high' | 'medium' | 'low' {
  const highUrgency = /urgent|immediate|asap|emergency|final\s*notice|overdue|past\s*due|action\s*required|deadline\s*(?:today|tomorrow)|expires?\s*(?:today|tomorrow|soon)/i;
  const mediumUrgency = /important|attention|reminder|pending|awaiting|please\s*(?:respond|reply)|within\s*\d+\s*days/i;
  
  if (highUrgency.test(text)) return 'high';
  if (mediumUrgency.test(text)) return 'medium';
  return 'low';
}

function detectWarnings(text: string): string[] {
  const warnings: string[] = [];
  
  // Check for specific warning conditions in the actual text
  if (/deadline|due\s*date|expires?|by\s*\d{1,2}/i.test(text)) {
    const dateMatch = text.match(/(?:deadline|due|expires?)[:\s]*([^.]+)/i);
    warnings.push(`⏰ Time-sensitive: ${dateMatch ? dateMatch[1].trim().substring(0, 50) : 'Check dates carefully'}`);
  }
  
  if (/penalty|fine|late\s*fee|interest\s*(?:charge|rate)/i.test(text)) {
    warnings.push('💸 Penalties or fees may apply - review terms carefully');
  }
  
  if (/legal|court|lawyer|attorney|lawsuit/i.test(text)) {
    warnings.push('⚖️ Legal matters mentioned - consider professional advice');
  }
  
  if (/sign|signature\s*required/i.test(text)) {
    warnings.push('✍️ Signature may be required');
  }
  
  if (/confidential|private|do\s*not\s*share/i.test(text)) {
    warnings.push('🔒 Contains confidential information');
  }
  
  if (/payment|pay\s*(?:by|before)|amount\s*due/i.test(text)) {
    const amountMatch = text.match(/(?:amount|total|pay)[:\s]*[$€£₹]?\s*([\d,]+(?:\.\d{2})?)/i);
    warnings.push(`💳 Payment required${amountMatch ? ': ' + amountMatch[0].trim() : ''}`);
  }
  
  return warnings.slice(0, 4);
}

function generateContentBasedActions(text: string, content: ExtractedContent, docType: string, urgency: string): string[] {
  const actions: string[] = [];
  
  // Add urgency action first
  if (urgency === 'high') {
    actions.push('⚠️ Take immediate action - this document is time-sensitive');
  }
  
  // Actions based on what's actually in the document
  if (content.amounts.length > 0) {
    actions.push(`Verify the amount ${content.amounts[0]} is correct`);
    if (/payment|pay|due/i.test(text)) {
      actions.push('Process payment before the due date');
    }
  }
  
  if (content.dates.length > 0) {
    actions.push(`Mark important date (${content.dates[0]}) in your calendar`);
  }
  
  if (content.emails.length > 0 || content.phones.length > 0) {
    const contact = content.emails[0] || content.phones[0];
    actions.push(`Contact ${contact} if you have questions`);
  }
  
  if (/sign|signature/i.test(text)) {
    actions.push('Review and sign where indicated');
  }
  
  if (/reply|respond|confirm/i.test(text)) {
    actions.push('Send a response or confirmation');
  }
  
  // Generic helpful actions
  actions.push('Read through the entire document carefully');
  actions.push('Save a copy for your records');
  
  // Remove duplicates and limit
  return [...new Set(actions)].slice(0, 6);
}
