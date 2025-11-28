/**
 * Text Cleanup Utility
 * Cleans up messy OCR output and formats extracted text for better readability
 */

interface CleanupOptions {
  fixSpacing?: boolean;
  fixLineBreaks?: boolean;
  fixPunctuation?: boolean;
  removeExtraWhitespace?: boolean;
  preserveStructure?: boolean;
  fixCommonOCRErrors?: boolean;
}

const defaultOptions: CleanupOptions = {
  fixSpacing: true,
  fixLineBreaks: true,
  fixPunctuation: true,
  removeExtraWhitespace: true,
  preserveStructure: true,
  fixCommonOCRErrors: true,
};

/**
 * Main text cleanup function
 */
export function cleanupExtractedText(text: string, options: CleanupOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  let cleaned = text;

  if (!cleaned || cleaned.trim().length === 0) {
    return '';
  }

  // Step 1: Normalize Unicode and basic cleanup
  cleaned = normalizeText(cleaned);

  // Step 2: Fix common OCR errors
  if (opts.fixCommonOCRErrors) {
    cleaned = fixOCRErrors(cleaned);
  }

  // Step 3: Fix spacing issues
  if (opts.fixSpacing) {
    cleaned = fixSpacing(cleaned);
  }

  // Step 4: Fix line breaks
  if (opts.fixLineBreaks) {
    cleaned = fixLineBreaks(cleaned, opts.preserveStructure);
  }

  // Step 5: Fix punctuation
  if (opts.fixPunctuation) {
    cleaned = fixPunctuation(cleaned);
  }

  // Step 6: Remove extra whitespace
  if (opts.removeExtraWhitespace) {
    cleaned = removeExtraWhitespace(cleaned);
  }

  // Step 7: Final cleanup and formatting
  cleaned = finalCleanup(cleaned);

  return cleaned.trim();
}

/**
 * Normalize Unicode characters and basic text cleanup
 */
function normalizeText(text: string): string {
  return text
    // Normalize Unicode
    .normalize('NFKC')
    // Replace various dash types with standard hyphen/dash
    .replace(/[­−–—―]/g, '-')
    // Replace various quote types with standard quotes
    .replace(/[""„‟]/g, '"')
    .replace(/[''‚‛]/g, "'")
    // Replace various space characters with regular space
    .replace(/[\u00A0\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Replace tabs with spaces
    .replace(/\t/g, '  ');
}

/**
 * Fix common OCR recognition errors
 */
function fixOCRErrors(text: string): string {
  let fixed = text;

  // Common character substitutions
  const substitutions: [RegExp, string][] = [
    // Letter O vs number 0 in specific contexts
    [/\b0([a-zA-Z])/g, 'O$1'], // 0 followed by letter -> O
    [/([a-zA-Z])0\b/g, '$1O'], // letter followed by 0 at word end -> O
    
    // Letter I vs number 1 in specific contexts
    [/\b1([a-z])/g, 'I$1'], // 1 followed by lowercase -> I
    [/([A-Z])1([A-Z])/g, '$1I$2'], // 1 between uppercase -> I
    
    // Letter l vs number 1
    [/([0-9])l([0-9])/g, '$11$2'], // l between numbers -> 1
    
    // Letter S vs number 5
    [/([a-zA-Z])5([a-zA-Z])/g, '$1S$2'], // 5 between letters -> S
    
    // rn -> m (common OCR error)
    [/\brn\b/g, 'm'], // isolated rn -> m
    
    // cl -> d (common OCR error) - be careful with this one
    // [/\bcl\b/g, 'd'],
    
    // vv -> w
    [/vv/g, 'w'],
    
    // Fix common word errors
    [/\btbe\b/gi, 'the'],
    [/\btlie\b/gi, 'the'],
    [/\bwitb\b/gi, 'with'],
    [/\bfrorn\b/gi, 'from'],
    [/\bRs\.\s*(\d)/g, 'Rs. $1'], // Fix currency format
    [/\b₹\s*(\d)/g, '₹$1'], // Fix rupee format
  ];

  for (const [pattern, replacement] of substitutions) {
    fixed = fixed.replace(pattern, replacement);
  }

  return fixed;
}

/**
 * Fix spacing issues
 */
function fixSpacing(text: string): string {
  let fixed = text;

  // Fix words that are broken apart (c o m m o n -> common)
  // Only fix if there's a pattern of single letters separated by spaces
  fixed = fixed.replace(/\b([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\b/g, (match) => {
    const letters = match.replace(/\s+/g, '');
    // Only combine if it looks like a broken word (all lowercase or proper case)
    if (letters.length >= 4 && letters.length <= 12) {
      return letters;
    }
    return match;
  });

  // Fix missing spaces after punctuation
  fixed = fixed.replace(/([.!?,:;])([A-Za-z])/g, '$1 $2');

  // Fix missing spaces between words stuck together (camelCase-like in middle of text)
  fixed = fixed.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Fix extra spaces before punctuation
  fixed = fixed.replace(/\s+([.!?,:;])/g, '$1');

  // Fix spaces around currency symbols
  fixed = fixed.replace(/₹\s+/g, '₹');
  fixed = fixed.replace(/Rs\s*\.\s*/gi, 'Rs. ');
  fixed = fixed.replace(/\$\s+/g, '$');

  // Fix spaces in numbers (1 000 -> 1000 or 1,000)
  fixed = fixed.replace(/(\d)\s+(\d{3})(?!\d)/g, '$1,$2');

  // Fix date formatting
  fixed = fixed.replace(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/g, '$1/$2/$3');
  fixed = fixed.replace(/(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{2,4})/g, '$1-$2-$3');

  return fixed;
}

/**
 * Fix line break issues
 */
function fixLineBreaks(text: string, preserveStructure: boolean = true): string {
  let fixed = text;

  // Split into lines for processing
  const lines = fixed.split('\n');
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';

    if (!line) {
      // Keep paragraph breaks (empty lines)
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }
      continue;
    }

    // Check if this line should be joined with the next
    const shouldJoin = shouldJoinLines(line, nextLine, preserveStructure);

    if (shouldJoin && nextLine) {
      // Don't add line break, will be joined
      processedLines.push(line);
    } else {
      processedLines.push(line);
      // Add a newline if this looks like end of paragraph/section
      if (isEndOfSection(line, nextLine)) {
        processedLines.push('');
      }
    }
  }

  // Join lines intelligently
  fixed = '';
  for (let i = 0; i < processedLines.length; i++) {
    const line = processedLines[i];
    const prevLine = i > 0 ? processedLines[i - 1] : '';
    const nextLine = i < processedLines.length - 1 ? processedLines[i + 1] : '';

    if (line === '') {
      fixed += '\n\n';
    } else if (prevLine && prevLine !== '' && shouldJoinLines(prevLine, line, preserveStructure)) {
      // Join with previous line
      fixed = fixed.trimEnd() + ' ' + line;
    } else {
      if (fixed && !fixed.endsWith('\n')) {
        fixed += '\n';
      }
      fixed += line;
    }
  }

  return fixed;
}

/**
 * Determine if two lines should be joined
 */
function shouldJoinLines(line: string, nextLine: string, preserveStructure: boolean): boolean {
  if (!line || !nextLine) return false;

  // Don't join if current line ends with sentence-ending punctuation
  if (/[.!?:]\s*$/.test(line)) return false;

  // Don't join if next line starts with bullet, number, or special char
  if (/^[\d•\-*►▪○●→]\s/.test(nextLine)) return false;
  if (/^[A-Z][.):]\s/.test(nextLine)) return false; // A. B. etc.

  // Don't join if next line looks like a heading (all caps or short)
  if (nextLine === nextLine.toUpperCase() && nextLine.length < 50) return false;

  // Don't join if line is very short (likely a heading or label)
  if (line.length < 20 && !line.endsWith(',')) return false;

  // Join if line ends with comma, hyphen, or conjunction
  if (/[,-]$/.test(line)) return true;
  if (/\b(and|or|the|a|an|of|to|in|for|with|that|is|are|was|were)$/i.test(line)) return true;

  // Join if next line starts with lowercase
  if (/^[a-z]/.test(nextLine)) return true;

  // Join if line ends mid-word (hyphenated)
  if (/-$/.test(line)) return true;

  return !preserveStructure;
}

/**
 * Check if line is end of a section
 */
function isEndOfSection(line: string, nextLine: string): boolean {
  // End of section if:
  // - Line ends with period/colon and next is empty or heading
  // - Line is short (likely heading) and next exists
  // - Next line starts with number or bullet

  if (!nextLine) return true;
  if (/^[\d•\-*►▪○●→]\s/.test(nextLine)) return true;
  if (nextLine === nextLine.toUpperCase() && nextLine.length > 3) return true;
  if (/^[A-Z][.):]\s/.test(nextLine)) return true;

  return false;
}

/**
 * Fix punctuation issues
 */
function fixPunctuation(text: string): string {
  let fixed = text;

  // Fix double punctuation
  fixed = fixed.replace(/([.!?]){2,}/g, '$1');
  fixed = fixed.replace(/,,+/g, ',');
  fixed = fixed.replace(/;;+/g, ';');
  fixed = fixed.replace(/::+/g, ':');

  // Fix space before punctuation
  fixed = fixed.replace(/\s+([.!?,;:])/g, '$1');

  // Ensure space after punctuation (except decimals)
  fixed = fixed.replace(/([.!?,;:])([A-Za-z])/g, '$1 $2');

  // Fix quotes
  fixed = fixed.replace(/"\s+/g, '"');
  fixed = fixed.replace(/\s+"/g, '"');

  // Fix parentheses spacing
  fixed = fixed.replace(/\(\s+/g, '(');
  fixed = fixed.replace(/\s+\)/g, ')');

  // Fix common Indian document punctuation
  fixed = fixed.replace(/Rs\s*\./gi, 'Rs.');
  fixed = fixed.replace(/No\s*\./gi, 'No.');
  fixed = fixed.replace(/Sr\s*\./gi, 'Sr.');
  fixed = fixed.replace(/Dr\s*\./gi, 'Dr.');
  fixed = fixed.replace(/Mr\s*\./gi, 'Mr.');
  fixed = fixed.replace(/Mrs\s*\./gi, 'Mrs.');
  fixed = fixed.replace(/Ms\s*\./gi, 'Ms.');

  return fixed;
}

/**
 * Remove extra whitespace
 */
function removeExtraWhitespace(text: string): string {
  return text
    // Multiple spaces to single space
    .replace(/  +/g, ' ')
    // Multiple newlines to max 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing spaces on lines
    .replace(/ +\n/g, '\n')
    // Remove leading spaces on lines (except indentation)
    .replace(/\n +/g, '\n');
}

/**
 * Final cleanup and formatting
 */
function finalCleanup(text: string): string {
  let cleaned = text;

  // Capitalize first letter after sentence endings
  cleaned = cleaned.replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) => punct + letter.toUpperCase());

  // Capitalize first letter of text
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Fix common formatting for Indian documents
  // Date formats
  cleaned = cleaned.replace(/date\s*:\s*/gi, 'Date: ');
  cleaned = cleaned.replace(/name\s*:\s*/gi, 'Name: ');
  cleaned = cleaned.replace(/address\s*:\s*/gi, 'Address: ');
  cleaned = cleaned.replace(/amount\s*:\s*/gi, 'Amount: ');
  cleaned = cleaned.replace(/total\s*:\s*/gi, 'Total: ');
  cleaned = cleaned.replace(/balance\s*:\s*/gi, 'Balance: ');
  cleaned = cleaned.replace(/account\s*(no\.?|number)\s*:\s*/gi, 'Account No: ');
  cleaned = cleaned.replace(/reference\s*(no\.?|number)\s*:\s*/gi, 'Reference No: ');
  cleaned = cleaned.replace(/invoice\s*(no\.?|number)\s*:\s*/gi, 'Invoice No: ');
  cleaned = cleaned.replace(/bill\s*(no\.?|number)\s*:\s*/gi, 'Bill No: ');
  cleaned = cleaned.replace(/receipt\s*(no\.?|number)\s*:\s*/gi, 'Receipt No: ');
  cleaned = cleaned.replace(/phone\s*(no\.?|number)?\s*:\s*/gi, 'Phone: ');
  cleaned = cleaned.replace(/mobile\s*(no\.?|number)?\s*:\s*/gi, 'Mobile: ');
  cleaned = cleaned.replace(/email\s*:\s*/gi, 'Email: ');

  return cleaned;
}

/**
 * Quick cleanup for display (lighter processing)
 */
export function quickCleanup(text: string): string {
  if (!text) return '';
  
  return text
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
    .replace(/  +/g, ' ') // Multiple spaces to single
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .trim();
}

/**
 * Format text for display with proper paragraphs
 */
export function formatForDisplay(text: string): string {
  const cleaned = cleanupExtractedText(text);
  
  // Split into paragraphs
  const paragraphs = cleaned.split(/\n\n+/);
  
  // Format each paragraph
  return paragraphs
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .join('\n\n');
}

export default cleanupExtractedText;
