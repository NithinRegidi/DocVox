import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ImageIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  isProcessing?: boolean;
}

const CameraCapture = ({ open, onOpenChange, onCapture, isProcessing = false }: CameraCaptureProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);

  // Check for available cameras
  const checkCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
      return videoDevices.length > 0;
    } catch (error) {
      console.error('Error checking cameras:', error);
      return false;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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

      // Check for flash/torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      setHasFlash(!!capabilities?.torch);

      setHasCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCamera(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast({
            title: "Camera Permission Denied",
            description: "Please allow camera access in your browser settings to use this feature.",
            variant: "destructive",
          });
        } else if (error.name === 'NotFoundError') {
          toast({
            title: "No Camera Found",
            description: "No camera device was found on your device.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Camera Error",
            description: "Could not access camera. Please try again.",
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Toggle flash/torch
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet]
      });
      setFlashEnabled(!flashEnabled);
    } catch (error) {
      console.error('Error toggling flash:', error);
    }
  }, [flashEnabled]);

  // Switch between front and back camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply zoom by drawing a cropped portion of the video
    if (zoom > 1) {
      const zoomWidth = video.videoWidth / zoom;
      const zoomHeight = video.videoHeight / zoom;
      const offsetX = (video.videoWidth - zoomWidth) / 2;
      const offsetY = (video.videoHeight - zoomHeight) / 2;
      
      ctx.drawImage(
        video,
        offsetX, offsetY, zoomWidth, zoomHeight,
        0, 0, canvas.width, canvas.height
      );
    } else {
      ctx.drawImage(video, 0, 0);
    }

    // Get image as data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
    
    // Pause video
    stopCamera();
  }, [zoom, stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // Confirm and use captured image
  const confirmCapture = useCallback(async () => {
    if (!capturedImage) return;

    try {
      // Convert data URL to File
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const fileName = `camera_capture_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      onCapture(file);
      setCapturedImage(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error processing captured image:', error);
      toast({
        title: "Error",
        description: "Failed to process captured image. Please try again.",
        variant: "destructive",
      });
    }
  }, [capturedImage, onCapture, onOpenChange, toast]);

  // Handle zoom
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoom(prev => {
      if (direction === 'in') {
        return Math.min(prev + 0.5, 3);
      } else {
        return Math.max(prev - 0.5, 1);
      }
    });
  }, []);

  // Start camera when dialog opens
  useEffect(() => {
    if (open && !capturedImage) {
      startCamera();
    } else if (!open) {
      stopCamera();
      setCapturedImage(null);
      setZoom(1);
      setFlashEnabled(false);
    }
  }, [open, capturedImage, startCamera, stopCamera]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (open && !capturedImage) {
      startCamera();
    }
  }, [facingMode, open, capturedImage, startCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Document
          </DialogTitle>
          <DialogDescription>
            Position your document in the frame and capture
          </DialogDescription>
        </DialogHeader>

        <div className="relative bg-black aspect-[4/3] overflow-hidden">
          {/* Hidden canvas for capture */}
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
                  Please ensure you have a camera connected and have granted permission to use it.
                </p>
              </div>
            </div>
          ) : capturedImage ? (
            // Show captured image
            <img 
              src={capturedImage} 
              alt="Captured document" 
              className="w-full h-full object-contain"
            />
          ) : (
            // Show video feed
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              />
              
              {/* Document frame overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-white/50 rounded-lg">
                  {/* Corner markers */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                </div>
                
                {/* Hint text */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
                  <p className="text-white text-sm">Align document within frame</p>
                </div>
              </div>

              {/* Zoom indicator */}
              {zoom > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full">
                  <p className="text-white text-sm">{zoom.toFixed(1)}x</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-background">
          {capturedImage ? (
            // Post-capture controls
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={retakePhoto}
                disabled={isProcessing}
                className="gap-2"
              >
                <RotateCcw className="h-5 w-5" />
                Retake
              </Button>
              <Button
                size="lg"
                onClick={confirmCapture}
                disabled={isProcessing}
                className="gap-2 min-w-[140px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Use Photo
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Camera controls
            <div className="flex items-center justify-between">
              {/* Left controls - Zoom */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom('out')}
                  disabled={zoom <= 1 || isInitializing || !hasCamera}
                  title="Zoom out"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleZoom('in')}
                  disabled={zoom >= 3 || isInitializing || !hasCamera}
                  title="Zoom in"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
              </div>

              {/* Center - Capture button */}
              <Button
                size="lg"
                onClick={capturePhoto}
                disabled={isInitializing || !hasCamera}
                className="rounded-full h-16 w-16 p-0"
              >
                <Camera className="h-8 w-8" />
              </Button>

              {/* Right controls - Flash & Switch */}
              <div className="flex gap-2">
                {hasFlash && (
                  <Button
                    variant={flashEnabled ? "default" : "ghost"}
                    size="icon"
                    onClick={toggleFlash}
                    disabled={isInitializing || !hasCamera}
                    title={flashEnabled ? "Turn off flash" : "Turn on flash"}
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
                    title="Switch camera"
                  >
                    <SwitchCamera className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;
