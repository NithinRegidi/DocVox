/**
 * Image Processing Library for Smart Document Scanner
 * Provides edge detection, auto-crop, perspective correction, and image enhancement
 */

// Types
export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export interface EdgeDetectionResult {
  corners: Rectangle | null;
  confidence: number;
  edgeImage: ImageData | null;
}

export interface EnhancementOptions {
  brightness: number;      // -100 to 100
  contrast: number;        // -100 to 100
  sharpness: number;       // 0 to 100
  saturation: number;      // -100 to 100
  denoise: boolean;
  autoEnhance: boolean;
  grayscale: boolean;
  blackAndWhite: boolean;  // High contrast B&W for documents
  threshold: number;       // 0-255 for B&W threshold
}

export interface ProcessedImage {
  dataUrl: string;
  width: number;
  height: number;
}

// Default enhancement options
export const DEFAULT_ENHANCEMENT: EnhancementOptions = {
  brightness: 0,
  contrast: 10,
  sharpness: 30,
  saturation: 0,
  denoise: true,
  autoEnhance: true,
  grayscale: false,
  blackAndWhite: false,
  threshold: 128,
};

// Document enhancement preset
export const DOCUMENT_PRESET: EnhancementOptions = {
  brightness: 10,
  contrast: 25,
  sharpness: 40,
  saturation: -30,
  denoise: true,
  autoEnhance: true,
  grayscale: false,
  blackAndWhite: false,
  threshold: 128,
};

// Black & White document preset
export const BW_DOCUMENT_PRESET: EnhancementOptions = {
  brightness: 15,
  contrast: 40,
  sharpness: 50,
  saturation: -100,
  denoise: true,
  autoEnhance: false,
  grayscale: false,
  blackAndWhite: true,
  threshold: 140,
};

/**
 * Apply Gaussian blur to reduce noise
 */
function applyGaussianBlur(imageData: ImageData, radius: number = 1): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  
  // Simple 3x3 Gaussian kernel
  const kernel = [
    1, 2, 1,
    2, 4, 2,
    1, 2, 1
  ];
  const kernelSum = 16;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        output[(y * width + x) * 4 + c] = sum / kernelSum;
      }
      output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3]; // Alpha
    }
  }
  
  return new ImageData(output, width, height);
}

/**
 * Convert to grayscale
 */
function toGrayscale(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    output[i] = gray;
    output[i + 1] = gray;
    output[i + 2] = gray;
    output[i + 3] = data[i + 3];
  }
  
  return new ImageData(output, width, height);
}

/**
 * Apply Sobel edge detection
 */
function applySobel(imageData: ImageData): { magnitude: Float32Array; direction: Float32Array } {
  const { width, height, data } = imageData;
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);
  
  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = data[idx]; // Already grayscale
          gx += gray * sobelX[(ky + 1) * 3 + (kx + 1)];
          gy += gray * sobelY[(ky + 1) * 3 + (kx + 1)];
        }
      }
      
      const idx = y * width + x;
      magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
      direction[idx] = Math.atan2(gy, gx);
    }
  }
  
  return { magnitude, direction };
}

/**
 * Apply Canny edge detection
 */
function cannyEdgeDetection(imageData: ImageData, lowThreshold: number = 50, highThreshold: number = 150): ImageData {
  const { width, height } = imageData;
  
  // Step 1: Gaussian blur
  const blurred = applyGaussianBlur(imageData);
  
  // Step 2: Grayscale
  const gray = toGrayscale(blurred);
  
  // Step 3: Sobel
  const { magnitude, direction } = applySobel(gray);
  
  // Step 4: Non-maximum suppression
  const suppressed = new Float32Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = direction[idx] * (180 / Math.PI);
      const mag = magnitude[idx];
      
      let neighbor1 = 0, neighbor2 = 0;
      
      // Round angle to nearest 45 degrees
      if ((angle >= -22.5 && angle < 22.5) || (angle >= 157.5 || angle < -157.5)) {
        neighbor1 = magnitude[idx - 1];
        neighbor2 = magnitude[idx + 1];
      } else if ((angle >= 22.5 && angle < 67.5) || (angle >= -157.5 && angle < -112.5)) {
        neighbor1 = magnitude[(y - 1) * width + x + 1];
        neighbor2 = magnitude[(y + 1) * width + x - 1];
      } else if ((angle >= 67.5 && angle < 112.5) || (angle >= -112.5 && angle < -67.5)) {
        neighbor1 = magnitude[(y - 1) * width + x];
        neighbor2 = magnitude[(y + 1) * width + x];
      } else {
        neighbor1 = magnitude[(y - 1) * width + x - 1];
        neighbor2 = magnitude[(y + 1) * width + x + 1];
      }
      
      suppressed[idx] = (mag >= neighbor1 && mag >= neighbor2) ? mag : 0;
    }
  }
  
  // Step 5: Double threshold & edge tracking
  const output = new Uint8ClampedArray(width * height * 4);
  
  for (let i = 0; i < suppressed.length; i++) {
    const val = suppressed[i] >= highThreshold ? 255 : 
                suppressed[i] >= lowThreshold ? 128 : 0;
    output[i * 4] = val;
    output[i * 4 + 1] = val;
    output[i * 4 + 2] = val;
    output[i * 4 + 3] = 255;
  }
  
  return new ImageData(output, width, height);
}

/**
 * Hough Transform for line detection
 */
function houghTransform(edgeData: ImageData): { rho: number; theta: number; votes: number }[] {
  const { width, height, data } = edgeData;
  const diagonal = Math.sqrt(width * width + height * height);
  const rhoMax = Math.ceil(diagonal);
  const thetaSteps = 180;
  
  // Accumulator
  const accumulator = new Int32Array(rhoMax * 2 * thetaSteps);
  
  // Precompute sin/cos
  const sinTable = new Float32Array(thetaSteps);
  const cosTable = new Float32Array(thetaSteps);
  
  for (let t = 0; t < thetaSteps; t++) {
    const theta = (t * Math.PI) / thetaSteps;
    sinTable[t] = Math.sin(theta);
    cosTable[t] = Math.cos(theta);
  }
  
  // Vote
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4] > 200) { // Edge pixel
        for (let t = 0; t < thetaSteps; t++) {
          const rho = Math.round(x * cosTable[t] + y * sinTable[t]) + rhoMax;
          accumulator[rho * thetaSteps + t]++;
        }
      }
    }
  }
  
  // Find peaks
  const lines: { rho: number; theta: number; votes: number }[] = [];
  const threshold = Math.max(width, height) * 0.3;
  
  for (let r = 0; r < rhoMax * 2; r++) {
    for (let t = 0; t < thetaSteps; t++) {
      const votes = accumulator[r * thetaSteps + t];
      if (votes > threshold) {
        lines.push({
          rho: r - rhoMax,
          theta: (t * Math.PI) / thetaSteps,
          votes
        });
      }
    }
  }
  
  // Sort by votes
  lines.sort((a, b) => b.votes - a.votes);
  
  return lines.slice(0, 20); // Top 20 lines
}

/**
 * Find document corners from detected lines
 */
function findCorners(lines: { rho: number; theta: number; votes: number }[], width: number, height: number): Rectangle | null {
  if (lines.length < 4) return null;
  
  // Separate horizontal and vertical lines
  const horizontalLines: typeof lines = [];
  const verticalLines: typeof lines = [];
  
  for (const line of lines) {
    const angleDeg = (line.theta * 180) / Math.PI;
    if (angleDeg > 70 && angleDeg < 110) {
      verticalLines.push(line);
    } else if (angleDeg < 20 || angleDeg > 160) {
      horizontalLines.push(line);
    }
  }
  
  if (horizontalLines.length < 2 || verticalLines.length < 2) return null;
  
  // Find intersections
  function lineIntersection(l1: typeof lines[0], l2: typeof lines[0]): Point | null {
    const cos1 = Math.cos(l1.theta);
    const sin1 = Math.sin(l1.theta);
    const cos2 = Math.cos(l2.theta);
    const sin2 = Math.sin(l2.theta);
    
    const det = cos1 * sin2 - cos2 * sin1;
    if (Math.abs(det) < 0.001) return null;
    
    const x = (l1.rho * sin2 - l2.rho * sin1) / det;
    const y = (l2.rho * cos1 - l1.rho * cos2) / det;
    
    return { x, y };
  }
  
  // Find 4 corners from best lines
  const corners: Point[] = [];
  
  for (const hLine of horizontalLines.slice(0, 4)) {
    for (const vLine of verticalLines.slice(0, 4)) {
      const intersection = lineIntersection(hLine, vLine);
      if (intersection && 
          intersection.x >= -width * 0.1 && intersection.x <= width * 1.1 &&
          intersection.y >= -height * 0.1 && intersection.y <= height * 1.1) {
        corners.push(intersection);
      }
    }
  }
  
  if (corners.length < 4) return null;
  
  // Sort corners: top-left, top-right, bottom-right, bottom-left
  const centerX = corners.reduce((sum, p) => sum + p.x, 0) / corners.length;
  const centerY = corners.reduce((sum, p) => sum + p.y, 0) / corners.length;
  
  const sortedCorners = corners.sort((a, b) => {
    const angleA = Math.atan2(a.y - centerY, a.x - centerX);
    const angleB = Math.atan2(b.y - centerY, b.x - centerX);
    return angleA - angleB;
  });
  
  // Find the four extreme corners
  let topLeft = sortedCorners[0];
  let topRight = sortedCorners[0];
  let bottomLeft = sortedCorners[0];
  let bottomRight = sortedCorners[0];
  
  for (const corner of sortedCorners) {
    if (corner.x + corner.y < topLeft.x + topLeft.y) topLeft = corner;
    if (corner.x - corner.y > topRight.x - topRight.y) topRight = corner;
    if (corner.y - corner.x > bottomLeft.y - bottomLeft.x) bottomLeft = corner;
    if (corner.x + corner.y > bottomRight.x + bottomRight.y) bottomRight = corner;
  }
  
  return { topLeft, topRight, bottomLeft, bottomRight };
}

/**
 * Simple contour-based corner detection for documents
 */
function findDocumentContour(edgeData: ImageData): Rectangle | null {
  const { width, height, data } = edgeData;
  
  // Find bounding edges
  let minX = width, maxX = 0, minY = height, maxY = 0;
  const edgePoints: Point[] = [];
  
  // Sample edge points
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      if (data[(y * width + x) * 4] > 100) {
        edgePoints.push({ x, y });
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  if (edgePoints.length < 100) return null;
  
  // Find extreme points in each quadrant
  const margin = Math.min(width, height) * 0.1;
  
  // Top-left region
  const topLeftCandidates = edgePoints.filter(p => 
    p.x < width * 0.4 && p.y < height * 0.4
  );
  
  // Top-right region
  const topRightCandidates = edgePoints.filter(p => 
    p.x > width * 0.6 && p.y < height * 0.4
  );
  
  // Bottom-left region
  const bottomLeftCandidates = edgePoints.filter(p => 
    p.x < width * 0.4 && p.y > height * 0.6
  );
  
  // Bottom-right region
  const bottomRightCandidates = edgePoints.filter(p => 
    p.x > width * 0.6 && p.y > height * 0.6
  );
  
  if (!topLeftCandidates.length || !topRightCandidates.length || 
      !bottomLeftCandidates.length || !bottomRightCandidates.length) {
    // Fallback to simple bounding box with margins
    return {
      topLeft: { x: Math.max(margin, minX), y: Math.max(margin, minY) },
      topRight: { x: Math.min(width - margin, maxX), y: Math.max(margin, minY) },
      bottomLeft: { x: Math.max(margin, minX), y: Math.min(height - margin, maxY) },
      bottomRight: { x: Math.min(width - margin, maxX), y: Math.min(height - margin, maxY) }
    };
  }
  
  // Find most extreme point in each region
  const topLeft = topLeftCandidates.reduce((best, p) => 
    p.x + p.y < best.x + best.y ? p : best
  );
  const topRight = topRightCandidates.reduce((best, p) => 
    p.x - p.y > best.x - best.y ? p : best
  );
  const bottomLeft = bottomLeftCandidates.reduce((best, p) => 
    p.y - p.x > best.y - best.x ? p : best
  );
  const bottomRight = bottomRightCandidates.reduce((best, p) => 
    p.x + p.y > best.x + best.y ? p : best
  );
  
  return { topLeft, topRight, bottomLeft, bottomRight };
}

/**
 * Detect document edges and find corners
 */
export async function detectDocumentEdges(image: HTMLImageElement | HTMLCanvasElement): Promise<EdgeDetectionResult> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return { corners: null, confidence: 0, edgeImage: null };
  }
  
  // Resize for faster processing
  const maxSize = 800;
  let width = image.width;
  let height = image.height;
  
  if (width > maxSize || height > maxSize) {
    const scale = maxSize / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);
  
  const imageData = ctx.getImageData(0, 0, width, height);
  
  // Apply edge detection
  const edgeData = cannyEdgeDetection(imageData, 30, 100);
  
  // Try Hough transform first
  const lines = houghTransform(edgeData);
  let corners = findCorners(lines, width, height);
  
  // If Hough fails, try contour detection
  if (!corners) {
    corners = findDocumentContour(edgeData);
  }
  
  // Calculate confidence based on detected features
  let confidence = 0;
  if (corners) {
    // Check if corners form a reasonable quadrilateral
    const area = calculateQuadArea(corners);
    const imageArea = width * height;
    const areaRatio = area / imageArea;
    
    // Good document should cover 10-95% of image
    if (areaRatio > 0.1 && areaRatio < 0.95) {
      confidence = Math.min(0.9, areaRatio * 1.5);
    } else {
      confidence = 0.3;
    }
    
    // Scale corners back to original size
    const scaleX = image.width / width;
    const scaleY = image.height / height;
    
    corners = {
      topLeft: { x: corners.topLeft.x * scaleX, y: corners.topLeft.y * scaleY },
      topRight: { x: corners.topRight.x * scaleX, y: corners.topRight.y * scaleY },
      bottomLeft: { x: corners.bottomLeft.x * scaleX, y: corners.bottomLeft.y * scaleY },
      bottomRight: { x: corners.bottomRight.x * scaleX, y: corners.bottomRight.y * scaleY }
    };
  }
  
  return { corners, confidence, edgeImage: edgeData };
}

/**
 * Calculate area of quadrilateral
 */
function calculateQuadArea(rect: Rectangle): number {
  // Shoelace formula
  const { topLeft, topRight, bottomRight, bottomLeft } = rect;
  return Math.abs(
    (topLeft.x * topRight.y - topRight.x * topLeft.y) +
    (topRight.x * bottomRight.y - bottomRight.x * topRight.y) +
    (bottomRight.x * bottomLeft.y - bottomLeft.x * bottomRight.y) +
    (bottomLeft.x * topLeft.y - topLeft.x * bottomLeft.y)
  ) / 2;
}

/**
 * Apply perspective correction (crop to corners)
 */
export async function perspectiveCrop(
  image: HTMLImageElement | HTMLCanvasElement, 
  corners: Rectangle,
  outputWidth?: number,
  outputHeight?: number
): Promise<ProcessedImage> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Calculate output dimensions based on the larger sides
  const topWidth = Math.sqrt(
    Math.pow(corners.topRight.x - corners.topLeft.x, 2) +
    Math.pow(corners.topRight.y - corners.topLeft.y, 2)
  );
  const bottomWidth = Math.sqrt(
    Math.pow(corners.bottomRight.x - corners.bottomLeft.x, 2) +
    Math.pow(corners.bottomRight.y - corners.bottomLeft.y, 2)
  );
  const leftHeight = Math.sqrt(
    Math.pow(corners.bottomLeft.x - corners.topLeft.x, 2) +
    Math.pow(corners.bottomLeft.y - corners.topLeft.y, 2)
  );
  const rightHeight = Math.sqrt(
    Math.pow(corners.bottomRight.x - corners.topRight.x, 2) +
    Math.pow(corners.bottomRight.y - corners.topRight.y, 2)
  );
  
  const width = outputWidth || Math.round(Math.max(topWidth, bottomWidth));
  const height = outputHeight || Math.round(Math.max(leftHeight, rightHeight));
  
  canvas.width = width;
  canvas.height = height;
  
  // Simple perspective transformation using bilinear interpolation
  const srcCanvas = document.createElement('canvas');
  const srcCtx = srcCanvas.getContext('2d');
  
  if (!srcCtx) {
    throw new Error('Could not get source canvas context');
  }
  
  srcCanvas.width = image.width;
  srcCanvas.height = image.height;
  srcCtx.drawImage(image, 0, 0);
  
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const dstData = ctx.createImageData(width, height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Bilinear interpolation for source coordinates
      const u = x / width;
      const v = y / height;
      
      // Interpolate source position
      const topX = corners.topLeft.x + u * (corners.topRight.x - corners.topLeft.x);
      const topY = corners.topLeft.y + u * (corners.topRight.y - corners.topLeft.y);
      const bottomX = corners.bottomLeft.x + u * (corners.bottomRight.x - corners.bottomLeft.x);
      const bottomY = corners.bottomLeft.y + u * (corners.bottomRight.y - corners.bottomLeft.y);
      
      const srcX = topX + v * (bottomX - topX);
      const srcY = topY + v * (bottomY - topY);
      
      // Sample source pixel (nearest neighbor for speed)
      const sx = Math.round(srcX);
      const sy = Math.round(srcY);
      
      if (sx >= 0 && sx < srcCanvas.width && sy >= 0 && sy < srcCanvas.height) {
        const srcIdx = (sy * srcCanvas.width + sx) * 4;
        const dstIdx = (y * width + x) * 4;
        
        dstData.data[dstIdx] = srcData.data[srcIdx];
        dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1];
        dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2];
        dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3];
      }
    }
  }
  
  ctx.putImageData(dstData, 0, 0);
  
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width,
    height
  };
}

/**
 * Apply image enhancement
 */
export async function enhanceImage(
  image: HTMLImageElement | HTMLCanvasElement,
  options: EnhancementOptions = DEFAULT_ENHANCEMENT
): Promise<ProcessedImage> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  
  // Auto-enhance: calculate histogram for adaptive adjustments
  if (options.autoEnhance) {
    const histogram = new Int32Array(256);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      histogram[gray]++;
    }
    
    // Find 5th and 95th percentile for contrast stretching
    const totalPixels = (data.length / 4);
    let sum = 0;
    let low = 0, high = 255;
    
    for (let i = 0; i < 256; i++) {
      sum += histogram[i];
      if (sum < totalPixels * 0.05) low = i;
      if (sum < totalPixels * 0.95) high = i;
    }
    
    // Adjust brightness/contrast based on histogram
    const range = high - low;
    if (range < 200) {
      options = { ...options, contrast: options.contrast + (200 - range) / 4 };
    }
    if (low > 30) {
      options = { ...options, brightness: options.brightness + (low - 30) / 2 };
    }
  }
  
  // Apply brightness and contrast
  const brightnessOffset = options.brightness * 2.55;
  const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));
  
  // Apply saturation
  const saturationFactor = 1 + options.saturation / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Apply brightness
    r += brightnessOffset;
    g += brightnessOffset;
    b += brightnessOffset;
    
    // Apply contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;
    
    // Apply saturation
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    r = gray + saturationFactor * (r - gray);
    g = gray + saturationFactor * (g - gray);
    b = gray + saturationFactor * (b - gray);
    
    // Clamp values
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
  
  // Apply grayscale if needed
  if (options.grayscale) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }
  
  // Apply black & white threshold
  if (options.blackAndWhite) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const bw = gray > options.threshold ? 255 : 0;
      data[i] = bw;
      data[i + 1] = bw;
      data[i + 2] = bw;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Apply sharpening using convolution
  if (options.sharpness > 0) {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const sharpened = applySharpening(imageData, options.sharpness / 100);
    ctx.putImageData(sharpened, 0, 0);
  }
  
  // Apply denoising
  if (options.denoise) {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const denoised = applyMedianFilter(imageData);
    ctx.putImageData(denoised, 0, 0);
  }
  
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: canvas.width,
    height: canvas.height
  };
}

/**
 * Apply sharpening using unsharp mask
 */
function applySharpening(imageData: ImageData, amount: number): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  
  // Unsharp mask kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        
        const idx = (y * width + x) * 4 + c;
        // Blend original with sharpened based on amount
        output[idx] = Math.max(0, Math.min(255, data[idx] * (1 - amount) + sum * amount));
      }
      output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }
  
  // Copy edges
  for (let x = 0; x < width; x++) {
    for (let c = 0; c < 4; c++) {
      output[x * 4 + c] = data[x * 4 + c];
      output[((height - 1) * width + x) * 4 + c] = data[((height - 1) * width + x) * 4 + c];
    }
  }
  for (let y = 0; y < height; y++) {
    for (let c = 0; c < 4; c++) {
      output[(y * width) * 4 + c] = data[(y * width) * 4 + c];
      output[(y * width + width - 1) * 4 + c] = data[(y * width + width - 1) * 4 + c];
    }
  }
  
  return new ImageData(output, width, height);
}

/**
 * Apply median filter for denoising
 */
function applyMedianFilter(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const values: number[] = [];
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            values.push(data[idx]);
          }
        }
        values.sort((a, b) => a - b);
        output[(y * width + x) * 4 + c] = values[4]; // Median
      }
      output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }
  
  // Copy edges
  for (let x = 0; x < width; x++) {
    for (let c = 0; c < 4; c++) {
      output[x * 4 + c] = data[x * 4 + c];
      output[((height - 1) * width + x) * 4 + c] = data[((height - 1) * width + x) * 4 + c];
    }
  }
  for (let y = 0; y < height; y++) {
    for (let c = 0; c < 4; c++) {
      output[(y * width) * 4 + c] = data[(y * width) * 4 + c];
      output[(y * width + width - 1) * 4 + c] = data[(y * width + width - 1) * 4 + c];
    }
  }
  
  return new ImageData(output, width, height);
}

/**
 * Load image from data URL
 */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Create a canvas from image
 */
export function imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(image, 0, 0);
  }
  return canvas;
}

/**
 * Rotate image by degrees
 */
export async function rotateImage(image: HTMLImageElement | HTMLCanvasElement, degrees: number): Promise<ProcessedImage> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  const radians = (degrees * Math.PI) / 180;
  
  // Calculate new dimensions
  if (degrees === 90 || degrees === 270 || degrees === -90) {
    canvas.width = image.height;
    canvas.height = image.width;
  } else {
    canvas.width = image.width;
    canvas.height = image.height;
  }
  
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: canvas.width,
    height: canvas.height
  };
}

/**
 * Combine multiple images into a single PDF-style image (vertical stack)
 */
export async function combinePages(images: string[]): Promise<ProcessedImage> {
  if (images.length === 0) {
    throw new Error('No images to combine');
  }
  
  // Load all images
  const loadedImages = await Promise.all(images.map(loadImage));
  
  // Calculate total height and max width
  let totalHeight = 0;
  let maxWidth = 0;
  const gap = 20; // Gap between pages
  
  for (const img of loadedImages) {
    totalHeight += img.height + gap;
    maxWidth = Math.max(maxWidth, img.width);
  }
  
  totalHeight -= gap; // Remove last gap
  
  // Create combined canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  
  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw each image
  let currentY = 0;
  for (const img of loadedImages) {
    const x = (maxWidth - img.width) / 2; // Center horizontally
    ctx.drawImage(img, x, currentY);
    currentY += img.height + gap;
  }
  
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: canvas.width,
    height: totalHeight
  };
}

/**
 * Calculate document detection confidence score
 */
export function calculateConfidence(corners: Rectangle, imageWidth: number, imageHeight: number): number {
  // Check if corners form a valid quadrilateral
  const area = calculateQuadArea(corners);
  const imageArea = imageWidth * imageHeight;
  const areaRatio = area / imageArea;
  
  // Area should be between 10% and 95% of image
  if (areaRatio < 0.1 || areaRatio > 0.95) {
    return 0.2;
  }
  
  // Check if it's roughly rectangular (all angles close to 90 degrees)
  function angle(p1: Point, p2: Point, p3: Point): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    return Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
  }
  
  const angles = [
    angle(corners.bottomLeft, corners.topLeft, corners.topRight),
    angle(corners.topLeft, corners.topRight, corners.bottomRight),
    angle(corners.topRight, corners.bottomRight, corners.bottomLeft),
    angle(corners.bottomRight, corners.bottomLeft, corners.topLeft)
  ];
  
  // All angles should be close to 90 degrees
  const angleDeviation = angles.reduce((sum, a) => sum + Math.abs(a - 90), 0) / 4;
  const angleScore = Math.max(0, 1 - angleDeviation / 45);
  
  // Combined score
  return Math.min(0.95, areaRatio * 0.5 + angleScore * 0.5);
}
