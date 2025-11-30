import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Camera,
  X,
  RotateCcw,
  Check,
  SwitchCamera,
  Loader2,
  ZoomIn,
  ZoomOut,
  FlashlightOff,
  Flashlight,
  ImageIcon,
  Crop,
  Wand2,
  RotateCw,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileStack,
  Download,
  Eye,
  Settings2,
  ScanLine,
  Sparkles,
  Square,
  Maximize2,
  Grid3X3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  detectDocumentEdges,
  perspectiveCrop,
  enhanceImage,
  loadImage,
  rotateImage,
  combinePages,
  type Rectangle,
  type Point,
  type EnhancementOptions,
  DEFAULT_ENHANCEMENT,
  DOCUMENT_PRESET,
  BW_DOCUMENT_PRESET,
} from "@/lib/imageProcessing";

interface SmartDocumentScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (file: File) => void;
  isProcessing?: boolean;
}

interface ScannedPage {
  id: string;
  originalImage: string;
  processedImage: string;
  corners: Rectangle | null;
  confidence: number;
  rotation: number;
  enhancement: EnhancementOptions;
}

type ScanMode = "camera" | "review" | "edit" | "multipage";

const SmartDocumentScanner = ({
  open,
  onOpenChange,
  onComplete,
  isProcessing = false,
}: SmartDocumentScannerProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Camera state
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);

  // Scanning state
  const [mode, setMode] = useState<ScanMode>("camera");
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Edge detection state
  const [autoDetect, setAutoDetect] = useState(true);
  const [detectedCorners, setDetectedCorners] = useState<Rectangle | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [isDraggingCorner, setIsDraggingCorner] = useState<string | null>(null);

  // Enhancement state
  const [enhancementPreset, setEnhancementPreset] = useState<string>("document");
  const [customEnhancement, setCustomEnhancement] = useState<EnhancementOptions>(DOCUMENT_PRESET);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const currentPage = pages[currentPageIndex];

  // Check for available cameras
  const checkCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      setHasMultipleCameras(videoDevices.length > 1);
      return videoDevices.length > 0;
    } catch (error) {
      console.error("Error checking cameras:", error);
      return false;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setIsInitializing(true);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const hasCameras = await checkCameras();
      if (!hasCameras) {
        setHasCamera(false);
        setIsInitializing(false);
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      setHasFlash(!!capabilities?.torch);

      setHasCamera(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCamera(false);

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          toast({
            title: "Camera Permission Denied",
            description: "Please allow camera access in your browser settings.",
            variant: "destructive",
          });
        } else if (error.name === "NotFoundError") {
          toast({
            title: "No Camera Found",
            description: "No camera device was found.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode, checkCameras, toast]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet],
      });
      setFlashEnabled(!flashEnabled);
    } catch (error) {
      console.error("Error toggling flash:", error);
    }
  }, [flashEnabled]);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  // Handle zoom
  const handleZoom = useCallback((direction: "in" | "out") => {
    setZoom((prev) => {
      if (direction === "in") return Math.min(prev + 0.5, 3);
      return Math.max(prev - 0.5, 1);
    });
  }, []);

  // Real-time edge detection
  const detectEdgesInFrame = useCallback(async () => {
    if (!videoRef.current || !overlayCanvasRef.current || mode !== "camera" || !autoDetect) {
      return;
    }

    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;
    const ctx = overlay.getContext("2d");

    if (!ctx || video.videoWidth === 0) return;

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    // Create temp canvas for detection
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext("2d");

    if (!tempCtx) return;
    tempCtx.drawImage(video, 0, 0);

    try {
      const result = await detectDocumentEdges(tempCanvas);
      setDetectedCorners(result.corners);
      setDetectionConfidence(result.confidence);

      // Draw overlay
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      if (result.corners && result.confidence > 0.3) {
        const { topLeft, topRight, bottomLeft, bottomRight } = result.corners;

        // Draw detected quadrilateral
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(bottomLeft.x, bottomLeft.y);
        ctx.closePath();

        // Fill with semi-transparent overlay
        ctx.fillStyle = `rgba(59, 130, 246, ${result.confidence * 0.2})`;
        ctx.fill();

        // Draw border
        ctx.strokeStyle = result.confidence > 0.6 ? "#22c55e" : "#f59e0b";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw corner handles
        const corners = [topLeft, topRight, bottomRight, bottomLeft];
        corners.forEach((corner) => {
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, 12, 0, Math.PI * 2);
          ctx.fillStyle = result.confidence > 0.6 ? "#22c55e" : "#f59e0b";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    } catch (error) {
      // Silent fail for frame detection
    }

    // Continue detection loop
    if (mode === "camera" && autoDetect) {
      animationRef.current = requestAnimationFrame(() => {
        setTimeout(detectEdgesInFrame, 200); // Detect every 200ms
      });
    }
  }, [mode, autoDetect]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessingImage(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Apply zoom
      if (zoom > 1) {
        const zoomWidth = video.videoWidth / zoom;
        const zoomHeight = video.videoHeight / zoom;
        const offsetX = (video.videoWidth - zoomWidth) / 2;
        const offsetY = (video.videoHeight - zoomHeight) / 2;
        ctx.drawImage(video, offsetX, offsetY, zoomWidth, zoomHeight, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0);
      }

      const originalImage = canvas.toDataURL("image/jpeg", 0.95);

      // Detect edges
      const result = await detectDocumentEdges(canvas);

      // Create page object
      const newPage: ScannedPage = {
        id: `page-${Date.now()}`,
        originalImage,
        processedImage: originalImage,
        corners: result.corners,
        confidence: result.confidence,
        rotation: 0,
        enhancement: DOCUMENT_PRESET,
      };

      // Auto-process if good detection
      if (result.corners && result.confidence > 0.5) {
        const img = await loadImage(originalImage);
        const cropped = await perspectiveCrop(img, result.corners);
        const enhanced = await enhanceImage(await loadImage(cropped.dataUrl), DOCUMENT_PRESET);
        newPage.processedImage = enhanced.dataUrl;
      } else {
        // Apply basic enhancement without cropping
        const enhanced = await enhanceImage(await loadImage(originalImage), DOCUMENT_PRESET);
        newPage.processedImage = enhanced.dataUrl;
      }

      setPages((prev) => [...prev, newPage]);
      setCurrentPageIndex(pages.length);
      setMode("review");
      stopCamera();

      toast({
        title: result.confidence > 0.6 ? "📄 Document Detected!" : "📷 Photo Captured",
        description: result.confidence > 0.6
          ? "Document edges detected and auto-cropped"
          : "Tap 'Manual Crop' to adjust edges",
      });
    } catch (error) {
      console.error("Error capturing photo:", error);
      toast({
        title: "Capture Failed",
        description: "Could not capture image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingImage(false);
    }
  }, [zoom, pages.length, stopCamera, toast]);

  // Manual corner adjustment
  const handleCornerDrag = useCallback(
    (corner: string, event: React.MouseEvent | React.TouchEvent) => {
      if (!currentPage || mode !== "edit") return;

      const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top,
        };
      };

      setIsDraggingCorner(corner);
      // Corner dragging logic would be handled in mouse/touch move events
    },
    [currentPage, mode]
  );

  // Apply enhancement preset
  const applyPreset = useCallback(
    async (preset: string) => {
      if (!currentPage) return;

      setIsProcessingImage(true);
      setEnhancementPreset(preset);

      try {
        const img = await loadImage(currentPage.originalImage);
        let enhancement: EnhancementOptions;

        switch (preset) {
          case "original":
            enhancement = { ...DEFAULT_ENHANCEMENT, autoEnhance: false };
            break;
          case "document":
            enhancement = DOCUMENT_PRESET;
            break;
          case "bw":
            enhancement = BW_DOCUMENT_PRESET;
            break;
          case "custom":
            enhancement = customEnhancement;
            break;
          default:
            enhancement = DOCUMENT_PRESET;
        }

        let processed = currentPage.originalImage;

        // Apply crop if corners exist
        if (currentPage.corners) {
          const cropped = await perspectiveCrop(img, currentPage.corners);
          processed = cropped.dataUrl;
        }

        // Apply enhancement
        const enhanced = await enhanceImage(await loadImage(processed), enhancement);

        // Apply rotation
        if (currentPage.rotation !== 0) {
          const rotated = await rotateImage(await loadImage(enhanced.dataUrl), currentPage.rotation);
          processed = rotated.dataUrl;
        } else {
          processed = enhanced.dataUrl;
        }

        setPages((prev) =>
          prev.map((p, i) =>
            i === currentPageIndex
              ? { ...p, processedImage: processed, enhancement }
              : p
          )
        );
      } catch (error) {
        console.error("Error applying preset:", error);
      } finally {
        setIsProcessingImage(false);
      }
    },
    [currentPage, currentPageIndex, customEnhancement]
  );

  // Rotate current page
  const rotatePage = useCallback(
    async (degrees: number) => {
      if (!currentPage) return;

      setIsProcessingImage(true);

      try {
        const newRotation = (currentPage.rotation + degrees) % 360;
        const img = await loadImage(currentPage.processedImage);
        const rotated = await rotateImage(img, degrees);

        setPages((prev) =>
          prev.map((p, i) =>
            i === currentPageIndex
              ? { ...p, processedImage: rotated.dataUrl, rotation: newRotation }
              : p
          )
        );
      } catch (error) {
        console.error("Error rotating:", error);
      } finally {
        setIsProcessingImage(false);
      }
    },
    [currentPage, currentPageIndex]
  );

  // Delete current page
  const deletePage = useCallback(() => {
    if (pages.length === 0) return;

    setPages((prev) => prev.filter((_, i) => i !== currentPageIndex));
    setCurrentPageIndex((prev) => Math.max(0, prev - 1));

    if (pages.length === 1) {
      setMode("camera");
      startCamera();
    }
  }, [pages.length, currentPageIndex, startCamera]);

  // Add another page
  const addPage = useCallback(() => {
    setMode("camera");
    startCamera();
  }, [startCamera]);

  // Complete and export
  const handleComplete = useCallback(async () => {
    if (pages.length === 0) return;

    setIsProcessingImage(true);

    try {
      let finalImage: string;

      if (pages.length === 1) {
        finalImage = pages[0].processedImage;
      } else {
        // Combine multiple pages
        const combined = await combinePages(pages.map((p) => p.processedImage));
        finalImage = combined.dataUrl;
      }

      // Convert to File
      const response = await fetch(finalImage);
      const blob = await response.blob();
      const fileName = `scanned_document_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      onComplete(file);
      
      // Reset state
      setPages([]);
      setCurrentPageIndex(0);
      setMode("camera");
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing scan:", error);
      toast({
        title: "Export Failed",
        description: "Could not export document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingImage(false);
    }
  }, [pages, onComplete, onOpenChange, toast]);

  // Start camera when dialog opens
  useEffect(() => {
    if (open && mode === "camera") {
      startCamera();
    } else if (!open) {
      stopCamera();
      setPages([]);
      setCurrentPageIndex(0);
      setMode("camera");
      setZoom(1);
      setFlashEnabled(false);
    }
  }, [open, mode, startCamera, stopCamera]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (open && mode === "camera") {
      startCamera();
    }
  }, [facingMode, open, mode, startCamera]);

  // Start edge detection loop
  useEffect(() => {
    if (mode === "camera" && autoDetect && hasCamera && !isInitializing) {
      detectEdgesInFrame();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, autoDetect, hasCamera, isInitializing, detectEdgesInFrame]);

  // Render camera view
  const renderCameraView = () => (
    <div className="relative bg-black aspect-[4/3] overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />

      {isInitializing ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p>Starting camera...</p>
          </div>
        </div>
      ) : !hasCamera ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white p-6">
            <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Camera Not Available</p>
            <p className="text-sm text-gray-300">
              Please ensure camera access is granted.
            </p>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          />

          {/* Edge detection overlay */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          />

          {/* Document frame guide */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/30 rounded-lg">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
            </div>
          </div>

          {/* Detection confidence indicator */}
          {autoDetect && detectedCorners && (
            <div className="absolute top-4 left-4 right-4">
              <div className="flex items-center gap-2 bg-black/60 rounded-full px-4 py-2">
                <ScanLine className={`h-5 w-5 ${detectionConfidence > 0.6 ? "text-green-400" : "text-yellow-400"}`} />
                <span className="text-white text-sm">
                  {detectionConfidence > 0.6
                    ? "Document detected ✓"
                    : detectionConfidence > 0.3
                    ? "Adjusting..."
                    : "Position document"}
                </span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      detectionConfidence > 0.6 ? "bg-green-500" : "bg-yellow-500"
                    }`}
                    style={{ width: `${Math.min(100, detectionConfidence * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Zoom indicator */}
          {zoom > 1 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full">
              <p className="text-white text-sm">{zoom.toFixed(1)}x</p>
            </div>
          )}

          {/* Hint text */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
            <p className="text-white text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {autoDetect ? "Auto-detecting document edges" : "Manual mode - Tap to capture"}
            </p>
          </div>
        </>
      )}
    </div>
  );

  // Render review view
  const renderReviewView = () => (
    <div className="bg-muted aspect-[4/3] overflow-hidden relative">
      {currentPage && (
        <>
          <img
            src={currentPage.processedImage}
            alt="Scanned document"
            className="w-full h-full object-contain"
          />

          {/* Page indicator */}
          {pages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-4 py-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentPageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm min-w-[60px] text-center">
                Page {currentPageIndex + 1} of {pages.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                disabled={currentPageIndex === pages.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Confidence badge */}
          <div className="absolute top-4 right-4">
            <Badge variant={currentPage.confidence > 0.6 ? "default" : "secondary"}>
              {currentPage.confidence > 0.6 ? "✓ Auto-cropped" : "Manual crop available"}
            </Badge>
          </div>
        </>
      )}

      {isProcessingImage && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p>Processing...</p>
          </div>
        </div>
      )}
    </div>
  );

  // Render multipage view
  const renderMultipageView = () => (
    <div className="p-4 min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">All Pages ({pages.length})</h3>
        <Button variant="outline" size="sm" onClick={addPage}>
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </div>

      <ScrollArea className="h-[250px]">
        <div className="grid grid-cols-3 gap-3">
          {pages.map((page, index) => (
            <div
              key={page.id}
              className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                index === currentPageIndex ? "border-primary" : "border-transparent"
              }`}
              onClick={() => {
                setCurrentPageIndex(index);
                setMode("review");
              }}
            >
              <img
                src={page.processedImage}
                alt={`Page ${index + 1}`}
                className="w-full aspect-[3/4] object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                Page {index + 1}
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setPages((prev) => prev.filter((_, i) => i !== index));
                  if (currentPageIndex >= pages.length - 1) {
                    setCurrentPageIndex(Math.max(0, pages.length - 2));
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  // Render enhancement controls
  const renderEnhancementControls = () => (
    <div className="p-4 border-t">
      <div className="flex items-center gap-2 mb-3">
        <Wand2 className="h-4 w-4" />
        <span className="text-sm font-medium">Enhancement</span>
      </div>

      <div className="flex gap-2 mb-3">
        {[
          { id: "original", label: "Original", icon: ImageIcon },
          { id: "document", label: "Document", icon: FileStack },
          { id: "bw", label: "B&W", icon: Square },
        ].map((preset) => (
          <Button
            key={preset.id}
            variant={enhancementPreset === preset.id ? "default" : "outline"}
            size="sm"
            onClick={() => applyPreset(preset.id)}
            disabled={isProcessingImage}
            className="flex-1"
          >
            <preset.icon className="h-4 w-4 mr-1" />
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Advanced settings toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="advanced" className="text-sm text-muted-foreground">
          Advanced Settings
        </Label>
        <Switch
          id="advanced"
          checked={showAdvancedSettings}
          onCheckedChange={setShowAdvancedSettings}
        />
      </div>

      {showAdvancedSettings && (
        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-xs">Brightness: {customEnhancement.brightness}</Label>
            <Slider
              value={[customEnhancement.brightness]}
              min={-100}
              max={100}
              step={5}
              onValueChange={([v]) => {
                setCustomEnhancement((prev) => ({ ...prev, brightness: v }));
                setEnhancementPreset("custom");
              }}
              onValueCommit={() => applyPreset("custom")}
            />
          </div>
          <div>
            <Label className="text-xs">Contrast: {customEnhancement.contrast}</Label>
            <Slider
              value={[customEnhancement.contrast]}
              min={-100}
              max={100}
              step={5}
              onValueChange={([v]) => {
                setCustomEnhancement((prev) => ({ ...prev, contrast: v }));
                setEnhancementPreset("custom");
              }}
              onValueCommit={() => applyPreset("custom")}
            />
          </div>
          <div>
            <Label className="text-xs">Sharpness: {customEnhancement.sharpness}</Label>
            <Slider
              value={[customEnhancement.sharpness]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => {
                setCustomEnhancement((prev) => ({ ...prev, sharpness: v }));
                setEnhancementPreset("custom");
              }}
              onValueCommit={() => applyPreset("custom")}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Smart Document Scanner
          </DialogTitle>
          <DialogDescription>
            {mode === "camera"
              ? "Position document and capture"
              : mode === "review"
              ? "Review and enhance your scan"
              : mode === "multipage"
              ? "Manage all scanned pages"
              : "Adjust document edges"}
          </DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        {pages.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={mode === "camera" ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setMode("camera");
                  startCamera();
                }}
              >
                <Camera className="h-4 w-4 mr-1" />
                Scan
              </Button>
              <Button
                variant={mode === "review" ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("review")}
              >
                <Eye className="h-4 w-4 mr-1" />
                Review
              </Button>
              <Button
                variant={mode === "multipage" ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("multipage")}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Pages
                {pages.length > 1 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                    {pages.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Main content */}
        <ScrollArea className="max-h-[60vh]">
          {mode === "camera" && renderCameraView()}
          {mode === "review" && renderReviewView()}
          {mode === "multipage" && renderMultipageView()}

          {/* Enhancement controls (only in review mode) */}
          {mode === "review" && currentPage && renderEnhancementControls()}
        </ScrollArea>

        {/* Bottom controls */}
        <div className="p-4 bg-background border-t">
          {mode === "camera" ? (
            <div className="flex items-center justify-between">
              {/* Left - Settings */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom("out")}
                  disabled={zoom <= 1 || isInitializing || !hasCamera}
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom("in")}
                  disabled={zoom >= 3 || isInitializing || !hasCamera}
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 ml-2">
                  <Switch
                    id="auto-detect"
                    checked={autoDetect}
                    onCheckedChange={setAutoDetect}
                  />
                  <Label htmlFor="auto-detect" className="text-xs">
                    Auto-detect
                  </Label>
                </div>
              </div>

              {/* Center - Capture */}
              <Button
                size="lg"
                onClick={capturePhoto}
                disabled={isInitializing || !hasCamera || isProcessingImage}
                className="rounded-full h-16 w-16 p-0"
              >
                {isProcessingImage ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Camera className="h-8 w-8" />
                )}
              </Button>

              {/* Right - Flash & Switch */}
              <div className="flex gap-2">
                {hasFlash && (
                  <Button
                    variant={flashEnabled ? "default" : "ghost"}
                    size="icon"
                    onClick={toggleFlash}
                    disabled={isInitializing || !hasCamera}
                  >
                    {flashEnabled ? (
                      <Flashlight className="h-5 w-5" />
                    ) : (
                      <FlashlightOff className="h-5 w-5" />
                    )}
                  </Button>
                )}
                {hasMultipleCameras && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={switchCamera}
                    disabled={isInitializing || !hasCamera}
                  >
                    <SwitchCamera className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          ) : mode === "review" ? (
            <div className="flex items-center justify-between">
              {/* Left - Page actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => rotatePage(-90)} disabled={isProcessingImage}>
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => rotatePage(90)} disabled={isProcessingImage}>
                  <RotateCw className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" onClick={deletePage} disabled={isProcessingImage}>
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>

              {/* Right - Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={addPage} disabled={isProcessingImage}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Page
                </Button>
                <Button onClick={handleComplete} disabled={isProcessingImage || isProcessing}>
                  {isProcessing || isProcessingImage ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Done ({pages.length} {pages.length === 1 ? "page" : "pages"})
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : mode === "multipage" ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setMode("camera")}>
                <Camera className="h-5 w-5 mr-2" />
                Scan More
              </Button>
              <Button onClick={handleComplete} disabled={isProcessingImage || isProcessing || pages.length === 0}>
                {isProcessing || isProcessingImage ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Export {pages.length} {pages.length === 1 ? "Page" : "Pages"}
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartDocumentScanner;
