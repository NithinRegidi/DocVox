export function detectDocumentType(text: string): string {
  const lowerText = text.toLowerCase();

  // Bank-related keywords
  const bankKeywords = [
    'account', 'balance', 'transaction', 'deposit', 'withdrawal',
    'bank', 'branch', 'ifsc', 'cheque', 'credit', 'debit',
    'loan', 'interest', 'statement', 'savings'
  ];

  // Legal-related keywords
  const legalKeywords = [
    'notice', 'legal', 'court', 'hearing', 'lawsuit', 'plaintiff',
    'defendant', 'attorney', 'advocate', 'jurisdiction', 'summons',
    'litigation', 'judgment', 'decree', 'petition'
  ];

  // Government-related keywords
  const governmentKeywords = [
    'government', 'ministry', 'department', 'official', 'authority',
    'registration', 'license', 'permit', 'certificate', 'application',
    'public', 'state', 'central', 'municipal', 'civic', 'aadhaar',
    'pan', 'passport', 'voter'
  ];

  // Academic-related keywords
  const academicKeywords = [
    'university', 'college', 'school', 'student', 'degree', 'certificate',
    'marks', 'grade', 'examination', 'semester', 'academic', 'transcript',
    'education', 'course', 'faculty', 'admission'
  ];

  // Count matches for each category
  const counts = {
    bank: countKeywords(lowerText, bankKeywords),
    legal: countKeywords(lowerText, legalKeywords),
    government: countKeywords(lowerText, governmentKeywords),
    academic: countKeywords(lowerText, academicKeywords),
  };

  // Find the category with most matches
  const maxCategory = Object.entries(counts).reduce((max, [category, count]) =>
    count > max.count ? { category, count } : max,
    { category: 'general', count: 0 }
  );

  // Require at least 2 keyword matches to classify
  if (maxCategory.count < 2) {
    return 'General Document';
  }

  const typeMap: Record<string, string> = {
    bank: 'Bank Letter',
    legal: 'Legal Notice',
    government: 'Government Form',
    academic: 'Academic Document',
  };

  return typeMap[maxCategory.category] || 'General Document';
}

function countKeywords(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}
