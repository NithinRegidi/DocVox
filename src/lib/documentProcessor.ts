import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Configure PDF.js worker - use unpkg CDN which has newer versions
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Supported file types
const SUPPORTED_TYPES = {
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'],
  word: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
  excel: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ],
  csv: ['text/csv', 'application/csv'],
  text: ['text/plain', 'text/rtf', 'application/rtf'],
};

export function getSupportedFileTypes(): string {
  return "PDF, Images (PNG, JPG, WEBP, GIF, BMP, TIFF), Word (DOC, DOCX), Excel (XLS, XLSX), CSV, Text (TXT, RTF)";
}

export function getAcceptedFileTypes(): Record<string, string[]> {
  return {
    'application/pdf': ['.pdf'],
    'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'text/csv': ['.csv'],
    'text/plain': ['.txt'],
    'text/rtf': ['.rtf'],
    'application/rtf': ['.rtf'],
  };
}

export function isFileTypeSupported(fileType: string): boolean {
  return Object.values(SUPPORTED_TYPES).flat().includes(fileType);
}

export async function processDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    // PDF files
    if (SUPPORTED_TYPES.pdf.includes(fileType)) {
      return await extractTextFromPDF(file, onProgress);
    }
    
    // Image files
    if (SUPPORTED_TYPES.image.includes(fileType) || fileType.startsWith('image/')) {
      return await extractTextFromImage(file, onProgress);
    }
    
    // Word documents (.docx, .doc)
    if (SUPPORTED_TYPES.word.includes(fileType) || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      return await extractTextFromWord(file, onProgress);
    }
    
    // Excel files (.xlsx, .xls)
    if (SUPPORTED_TYPES.excel.includes(fileType) || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return await extractTextFromExcel(file, onProgress);
    }
    
    // CSV files
    if (SUPPORTED_TYPES.csv.includes(fileType) || fileName.endsWith('.csv')) {
      return await extractTextFromCSV(file, onProgress);
    }
    
    // Plain text files
    if (SUPPORTED_TYPES.text.includes(fileType) || fileName.endsWith('.txt') || fileName.endsWith('.rtf')) {
      return await extractTextFromTextFile(file, onProgress);
    }

    throw new Error(`Unsupported file type: ${fileType || 'unknown'}. Supported: ${getSupportedFileTypes()}`);
  } catch (error) {
    console.error('Document processing error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process document. Please try again.');
  }
}

async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  let fullText = '';

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter((item): item is TextItem => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';

    if (onProgress) {
      onProgress(pageNum / numPages);
    }
  }

  // If no text extracted, try OCR on PDF images
  if (fullText.trim().length < 50) {
    console.log('PDF has minimal text, attempting OCR...');
    fullText = await extractTextFromPDFImages(file, onProgress);
  }

  return fullText.trim();
}

async function extractTextFromPDFImages(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // For scanned PDFs, we'll need to render pages as images and OCR them
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1); // Process first page for demo
  
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ 
    canvasContext: context,
    canvas: canvas,
    viewport: viewport 
  }).promise;
  
  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png');
  });

  const imageFile = new File([blob], 'page.png', { type: 'image/png' });
  return await extractTextFromImage(imageFile, onProgress);
}

async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(m.progress);
      }
    },
  });

  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();

  return text.trim();
}

async function extractTextFromWord(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (onProgress) onProgress(0.3);
  
  const arrayBuffer = await file.arrayBuffer();
  
  if (onProgress) onProgress(0.5);
  
  const result = await mammoth.extractRawText({ arrayBuffer });
  
  if (onProgress) onProgress(1);
  
  if (!result.value || result.value.trim().length === 0) {
    throw new Error('Could not extract text from Word document. The file may be empty or corrupted.');
  }
  
  return result.value.trim();
}

async function extractTextFromExcel(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (onProgress) onProgress(0.2);
  
  const arrayBuffer = await file.arrayBuffer();
  
  if (onProgress) onProgress(0.4);
  
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  if (onProgress) onProgress(0.6);
  
  let fullText = '';
  const sheetNames = workbook.SheetNames;
  
  for (let i = 0; i < sheetNames.length; i++) {
    const sheetName = sheetNames[i];
    const worksheet = workbook.Sheets[sheetName];
    
    // Add sheet name as header
    fullText += `\n=== Sheet: ${sheetName} ===\n\n`;
    
    // Convert to array of arrays
    const data = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
    
    // Format as readable text
    for (const row of data) {
      if (row && row.length > 0) {
        const rowText = row
          .map(cell => (cell !== null && cell !== undefined) ? String(cell) : '')
          .filter(cell => cell.trim() !== '')
          .join(' | ');
        if (rowText.trim()) {
          fullText += rowText + '\n';
        }
      }
    }
    
    if (onProgress) {
      onProgress(0.6 + (0.4 * (i + 1) / sheetNames.length));
    }
  }
  
  if (!fullText.trim()) {
    throw new Error('Could not extract text from Excel file. The file may be empty.');
  }
  
  return fullText.trim();
}

async function extractTextFromCSV(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (onProgress) onProgress(0.3);
  
  const text = await file.text();
  
  if (onProgress) onProgress(0.5);
  
  // Parse CSV
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  });
  
  if (onProgress) onProgress(0.7);
  
  if (result.errors.length > 0) {
    console.warn('CSV parsing warnings:', result.errors);
  }
  
  // Format as readable text
  let fullText = '';
  const headers = result.data[0];
  
  // Add headers
  if (headers && headers.length > 0) {
    fullText += '=== CSV Data ===\n\n';
    fullText += 'Columns: ' + headers.join(' | ') + '\n\n';
  }
  
  // Add data rows
  for (let i = 1; i < result.data.length; i++) {
    const row = result.data[i];
    if (row && row.length > 0) {
      // Create labeled entries using headers
      const rowParts: string[] = [];
      for (let j = 0; j < row.length; j++) {
        const header = headers?.[j] || `Column ${j + 1}`;
        const value = row[j];
        if (value && value.trim()) {
          rowParts.push(`${header}: ${value}`);
        }
      }
      if (rowParts.length > 0) {
        fullText += `Row ${i}: ${rowParts.join(', ')}\n`;
      }
    }
  }
  
  if (onProgress) onProgress(1);
  
  if (!fullText.trim()) {
    throw new Error('Could not extract text from CSV file. The file may be empty.');
  }
  
  return fullText.trim();
}

async function extractTextFromTextFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (onProgress) onProgress(0.5);
  
  const text = await file.text();
  
  if (onProgress) onProgress(1);
  
  if (!text || text.trim().length === 0) {
    throw new Error('The text file appears to be empty.');
  }
  
  return text.trim();
}
