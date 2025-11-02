'use client';

import { useEffect, useRef, useState } from 'react';
import { loadFaceApiModels, detectSingleFace, areModelsLoaded } from '@/lib/faceapi';
import { alignFaceOnCanvas, calculateEyeMetrics, drawEyeMetrics } from '@/lib/faceAlignment';
import GIF from 'gif.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

interface ProcessedImage {
  id: string;
  originalUrl: string;
  alignedCanvas: HTMLCanvasElement | null;
  angle: number;
  hasError: boolean;
  errorMessage?: string;
}

export default function FaceDetector() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [useTinyModel, setUseTinyModel] = useState(false);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [frameDuration, setFrameDuration] = useState(500); // ms per frame
  const [zoomLevel, setZoomLevel] = useState(140); // Eye distance in pixels (80-240 range)
  const [initialZoomLevel] = useState(140); // Track if zoom has changed
  const [processedWithZoom, setProcessedWithZoom] = useState(140); // Track zoom level used for processing

  // Preview states
  const [gifPreviewUrl, setGifPreviewUrl] = useState<string>('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [currentPreviewFrame, setCurrentPreviewFrame] = useState(0);

  // Load face-api models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        if (!areModelsLoaded()) {
          await loadFaceApiModels();
        }
        setIsModelsLoading(false);
      } catch (err) {
        setError('Failed to load face detection models');
        setIsModelsLoading(false);
        console.error(err);
      }
    };

    loadModels();
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (gifPreviewUrl) {
        URL.revokeObjectURL(gifPreviewUrl);
      }
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gifPreviewUrl, videoPreviewUrl]);

  // Animate preview canvas when images are loaded
  useEffect(() => {
    const validImages = images.filter(img => img.alignedCanvas && !img.hasError);

    if (validImages.length === 0) {
      setCurrentPreviewFrame(0);
      return;
    }

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 500;
    canvas.height = 500;

    let lastFrameTime = Date.now();
    let frameIndex = 0;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - lastFrameTime;

      if (elapsed >= frameDuration) {
        // Draw current frame
        const currentImage = validImages[frameIndex];
        if (currentImage.alignedCanvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(currentImage.alignedCanvas, 0, 0);
        }

        setCurrentPreviewFrame(frameIndex + 1);
        frameIndex = (frameIndex + 1) % validImages.length;
        lastFrameTime = now;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [images, frameDuration]);

  // Handle multiple file uploads
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate all files are images
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please upload at least one image file');
      return;
    }

    setError('');
    setIsLoading(true);

    // Process each image
    const newImages: ProcessedImage[] = [];

    for (const file of imageFiles) {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      const url = URL.createObjectURL(file);

      try {
        // Load image
        const img = await loadImage(url);

        // Detect face and align
        const detection = await detectSingleFace(img, {
          withLandmarks: true,
          useTinyModel,
        });

        if (detection && detection.landmarks) {
          const metrics = calculateEyeMetrics(detection.landmarks);
          const alignedCanvas = alignFaceOnCanvas(img, detection.landmarks, {
            canvasSize: 500,
            targetEyeDistance: zoomLevel, // Use user-selected zoom level
          });

          newImages.push({
            id,
            originalUrl: url,
            alignedCanvas,
            angle: (metrics.angle * 180) / Math.PI,
            hasError: false,
          });
        } else {
          newImages.push({
            id,
            originalUrl: url,
            alignedCanvas: null,
            angle: 0,
            hasError: true,
            errorMessage: 'No face detected',
          });
        }
      } catch (err) {
        console.error('Error processing image:', err);
        newImages.push({
          id,
          originalUrl: url,
          alignedCanvas: null,
          angle: 0,
          hasError: true,
          errorMessage: 'Error processing image',
        });
      }
    }

    setImages(prev => [...prev, ...newImages]);
    setProcessedWithZoom(zoomLevel); // Track the zoom level used
    setIsLoading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper function to load image
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  // Remove an image from the list
  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Clear all images
  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.originalUrl));
    setImages([]);
    setError('');
  };

  // Reprocess all images with new zoom level
  const reprocessWithNewZoom = async (targetZoom?: number) => {
    if (images.length === 0) return;

    const useZoom = targetZoom ?? zoomLevel;
    console.log(`🔄 Reprocessing ${images.length} images with zoom level: ${useZoom}px`);

    setIsLoading(true);
    setError('');

    try {
      const updatedImages = await Promise.all(
        images.map(async (img, index) => {
          if (img.hasError || !img.alignedCanvas) {
            console.log(`⏭️ Skipping image ${index + 1} (has error)`);
            return img; // Skip failed images
          }

          try {
            console.log(`🔍 Reprocessing image ${index + 1}...`);

            // Reload the image
            const loadedImg = await loadImage(img.originalUrl);

            // Detect face again
            const detection = await detectSingleFace(loadedImg, {
              withLandmarks: true,
              useTinyModel,
            });

            if (detection && detection.landmarks) {
              const metrics = calculateEyeMetrics(detection.landmarks);
              const alignedCanvas = alignFaceOnCanvas(loadedImg, detection.landmarks, {
                canvasSize: 500,
                targetEyeDistance: useZoom,
              });

              console.log(`✅ Image ${index + 1} reprocessed successfully`);

              // Create a completely new object to force React re-render
              return {
                id: img.id + '-reprocessed-' + Date.now(), // New ID to force re-render
                originalUrl: img.originalUrl,
                alignedCanvas,
                angle: (metrics.angle * 180) / Math.PI,
                hasError: false,
              };
            }

            console.log(`⚠️ Image ${index + 1} - no face detected on reprocess`);
            return img;
          } catch (err) {
            console.error(`❌ Error reprocessing image ${index + 1}:`, err);
            return img;
          }
        })
      );

      console.log(`✅ Reprocessing complete! Updated ${updatedImages.length} images`);
      setImages(updatedImages);
      setProcessedWithZoom(useZoom); // Update the processed zoom level
    } catch (err) {
      console.error('❌ Error in reprocessWithNewZoom:', err);
      setError('Failed to reprocess images. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate GIF from aligned canvases
  const generateGif = async () => {
    const validImages = images.filter(img => img.alignedCanvas && !img.hasError);

    if (validImages.length === 0) {
      setError('No valid aligned faces to create GIF');
      return;
    }

    setIsGeneratingGif(true);
    setGifProgress(0);
    setError('');

    try {
      // Create GIF instance
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: 500,
        height: 500,
        workerScript: '/gif.worker.js', // We'll need to copy this
      });

      // Add frames with user-specified duration
      validImages.forEach((img) => {
        if (img.alignedCanvas) {
          gif.addFrame(img.alignedCanvas, { delay: frameDuration });
        }
      });

      // Listen to progress
      gif.on('progress', (progress) => {
        setGifProgress(Math.round(progress * 100));
      });

      // Listen to finish
      gif.on('finished', (blob) => {
        // Store blob for preview
        const url = URL.createObjectURL(blob);
        setGifPreviewUrl(url);
        setGifBlob(blob);

        setIsGeneratingGif(false);
        setGifProgress(0);
      });

      // Render the GIF
      gif.render();
    } catch (err) {
      console.error('Error generating GIF:', err);
      setError('Failed to generate GIF');
      setIsGeneratingGif(false);
      setGifProgress(0);
    }
  };

  // Generate Video (MP4/WebM) from aligned canvases
  const generateVideo = async () => {
    const validImages = images.filter(img => img.alignedCanvas && !img.hasError);

    if (validImages.length === 0) {
      setError('No valid aligned faces to create video');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoProgress(0);
    setError('');

    try {
      console.log(`🎬 Starting video generation with ${validImages.length} frames`);

      // Create a temporary canvas for video rendering
      const videoCanvas = document.createElement('canvas');
      videoCanvas.width = 500;
      videoCanvas.height = 500;
      const ctx = videoCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Setup MediaRecorder
      const stream = videoCanvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9', // VP9 for better quality
        videoBitsPerSecond: 5000000, // 5 Mbps
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('✅ Video recording stopped, creating blob...');
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoPreviewUrl(url);
        setVideoBlob(blob);

        setIsGeneratingVideo(false);
        setVideoProgress(0);
        console.log('✅ Video preview ready!');
      };

      // Start recording
      mediaRecorder.start();
      console.log('🎥 Recording started');

      // Render each frame
      let currentFrame = 0;
      const totalFrames = validImages.length;

      const renderFrame = () => {
        if (currentFrame >= totalFrames) {
          // Finished all frames
          console.log('✅ All frames rendered, stopping recorder...');
          mediaRecorder.stop();
          return;
        }

        const img = validImages[currentFrame];
        if (img.alignedCanvas && ctx) {
          ctx.clearRect(0, 0, 500, 500);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 500, 500);
          ctx.drawImage(img.alignedCanvas, 0, 0);
        }

        const progress = ((currentFrame + 1) / totalFrames) * 100;
        setVideoProgress(Math.round(progress));
        console.log(`📹 Rendered frame ${currentFrame + 1}/${totalFrames}`);

        currentFrame++;

        // Schedule next frame based on frameDuration
        setTimeout(renderFrame, frameDuration);
      };

      // Start rendering frames
      renderFrame();
    } catch (err) {
      console.error('❌ Error generating video:', err);
      setError('Failed to generate video. Your browser may not support video recording.');
      setIsGeneratingVideo(false);
      setVideoProgress(0);
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Handle zoom level change
  const handleZoomChange = async (newZoom: number) => {
    console.log(`🔍 Zoom changed from ${zoomLevel}px to ${newZoom}px`);
    setZoomLevel(newZoom);

    // Automatically reprocess images if any are loaded
    if (images.length > 0) {
      console.log(`🔄 Auto-reprocessing ${images.length} images with new zoom level...`);
      await reprocessWithNewZoom(newZoom);
    }
  };

  // Download GIF
  const downloadGif = () => {
    if (!gifBlob) return;
    const link = document.createElement('a');
    link.href = gifPreviewUrl;
    link.download = `aligned-faces-${Date.now()}.gif`;
    link.click();
  };

  // Download Video
  const downloadVideo = () => {
    if (!videoBlob) return;
    const link = document.createElement('a');
    link.href = videoPreviewUrl;
    link.download = `aligned-faces-${Date.now()}.webm`;
    link.click();
  };

  // Clear GIF preview
  const clearGifPreview = () => {
    if (gifPreviewUrl) {
      URL.revokeObjectURL(gifPreviewUrl);
    }
    setGifPreviewUrl('');
    setGifBlob(null);
  };

  // Clear Video preview
  const clearVideoPreview = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl('');
    setVideoBlob(null);
  };

  const validImagesCount = images.filter(img => !img.hasError).length;

  return (
    <div className="flex flex-col items-center gap-6 p-8 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Match Cut Generator
        </h1>
        <p className="text-muted-foreground">Transform faces into perfectly aligned animated GIFs & Videos</p>
      </div>

      {/* Main Layout: Upload on Left, Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left Column - Upload Controls */}
        <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Upload Images</CardTitle>
          <CardDescription>Select multiple images with faces to create your animation</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={handleUploadClick}
            disabled={isModelsLoading || isLoading}
            size="lg"
            className="w-full max-w-xs"
          >
            {isModelsLoading ? 'Loading models...' : isLoading ? 'Processing...' : '📤 Upload Images'}
          </Button>

          {/* Detector Model Selection */}
          {!isModelsLoading && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="fast-mode"
                checked={useTinyModel}
                onChange={(e) => setUseTinyModel(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="fast-mode" className="cursor-pointer text-sm">
                Use Fast Mode (less accurate)
              </Label>
            </div>
          )}

          {/* Zoom Level Control */}
          <div className="flex items-center justify-between w-full">
            <Label className="font-semibold">Face Zoom Level</Label>
            <Badge variant="secondary" className="font-mono">{zoomLevel}px</Badge>
          </div>

          {/* Slider */}
          <div className="w-full space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-12">Loose</span>
              <Slider
                value={[zoomLevel]}
                onValueChange={(value) => handleZoomChange(value[0])}
                min={80}
                max={240}
                step={10}
                disabled={isLoading || isGeneratingGif || isGeneratingVideo}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-12 text-right">Tight</span>
            </div>

            {/* Preset Buttons */}
            <div className="flex gap-2 flex-wrap justify-center">
              <Button
                size="sm"
                variant={zoomLevel === 100 ? "default" : "outline"}
                onClick={() => handleZoomChange(100)}
                disabled={isLoading || isGeneratingGif || isGeneratingVideo}
              >
                Wide
              </Button>
              <Button
                size="sm"
                variant={zoomLevel === 120 ? "default" : "outline"}
                onClick={() => handleZoomChange(120)}
                disabled={isLoading || isGeneratingGif || isGeneratingVideo}
              >
                Loose
              </Button>
              <Button
                size="sm"
                variant={zoomLevel === 140 ? "default" : "outline"}
                onClick={() => handleZoomChange(140)}
                disabled={isLoading || isGeneratingGif || isGeneratingVideo}
              >
                Default
              </Button>
              <Button
                size="sm"
                variant={zoomLevel === 160 ? "default" : "outline"}
                onClick={() => handleZoomChange(160)}
                disabled={isLoading || isGeneratingGif || isGeneratingVideo}
              >
                Medium
              </Button>
              <Button
                size="sm"
                variant={zoomLevel === 180 ? "default" : "outline"}
                onClick={() => handleZoomChange(180)}
                disabled={isLoading || isGeneratingGif || isGeneratingVideo}
              >
                Close
              </Button>
              <Button
                size="sm"
                variant={zoomLevel === 200 ? "default" : "outline"}
                onClick={() => handleZoomChange(200)}
                disabled={isLoading || isGeneratingGif || isGeneratingVideo}
              >
                Tight
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Lower values = more breathing space around face
            </p>
          </div>

          {/* Uploaded Images Gallery */}
          {images.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Uploaded Images</h3>
                <Badge variant="secondary">{images.length}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {images.map((img, index) => (
                  <Card key={img.id} className={`${img.hasError ? 'border-red-300' : 'border-green-300'} border-2`}>
                    <CardContent className="p-2">
                      <div className="relative">
                        {/* Aligned Canvas */}
                        <div className="rounded-lg overflow-hidden">
                          {img.alignedCanvas ? (
                            <canvas
                              ref={(canvas) => {
                                if (canvas && img.alignedCanvas) {
                                  const ctx = canvas.getContext('2d');
                                  if (ctx) {
                                    canvas.width = img.alignedCanvas.width;
                                    canvas.height = img.alignedCanvas.height;
                                    ctx.drawImage(img.alignedCanvas, 0, 0);
                                  }
                                }
                              }}
                              className="w-full h-auto"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-muted flex items-center justify-center">
                              <p className="text-destructive text-xs p-2 text-center">
                                {img.errorMessage || 'Failed'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Remove button */}
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => removeImage(img.id)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full text-xs"
                        >
                          ×
                        </Button>

                        {/* Frame number badge */}
                        <Badge className="absolute top-1 left-1 text-xs px-1 py-0">
                          #{index + 1}
                        </Badge>
                      </div>

                      {/* Metadata */}
                      {!img.hasError && (
                        <div className="text-xs text-muted-foreground text-center mt-1">
                          {img.angle.toFixed(1)}°
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Right Column - Preview Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {validImagesCount > 0 && !gifPreviewUrl && !videoPreviewUrl
                ? `Live preview - ${validImagesCount} frames`
                : 'Your generated GIF or Video will appear here'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {validImagesCount === 0 && !gifPreviewUrl && !videoPreviewUrl ? (
              // Empty state - no images loaded
              <div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg">
                <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No frames to preview</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Upload and align images to see preview
                </p>
              </div>
            ) : !gifPreviewUrl && !videoPreviewUrl && validImagesCount > 0 ? (
              // Live canvas preview
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant="outline">Live Preview</Badge>
                  <span className="text-xs text-muted-foreground">
                    Frame {currentPreviewFrame} / {validImagesCount}
                  </span>
                </div>
                <div className="flex justify-center bg-muted rounded-lg p-4">
                  <canvas
                    ref={previewCanvasRef}
                    className="max-w-full h-auto rounded-lg shadow-lg"
                  />
                </div>

                {/* Show progress bars when generating */}
                {isGeneratingGif && (
                  <div className="space-y-2">
                    <Progress value={gifProgress} className="h-2" />
                    <p className="text-sm text-center text-muted-foreground">
                      Generating GIF... {gifProgress}%
                    </p>
                  </div>
                )}

                {isGeneratingVideo && (
                  <div className="space-y-2">
                    <Progress value={videoProgress} className="h-2" />
                    <p className="text-sm text-center text-muted-foreground">
                      Recording Video... {videoProgress}%
                    </p>
                  </div>
                )}

                {!isGeneratingGif && !isGeneratingVideo && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Frame Duration</h4>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {frameDuration}ms ({(1000 / frameDuration).toFixed(1)} FPS)
                      </Badge>
                    </div>

                    {/* Slider */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-12">Fast</span>
                      <Slider
                        value={[frameDuration]}
                        onValueChange={(value) => setFrameDuration(value[0])}
                        min={100}
                        max={2000}
                        step={100}
                        disabled={isLoading || isGeneratingGif || isGeneratingVideo}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-12 text-right">Slow</span>
                    </div>

                    {/* Preset Buttons */}
                    <div className="flex gap-2 flex-wrap justify-center">
                      <Button
                        size="sm"
                        variant={frameDuration === 200 ? "default" : "outline"}
                        onClick={() => setFrameDuration(200)}
                        disabled={isLoading || isGeneratingGif || isGeneratingVideo}
                      >
                        Very Fast
                      </Button>
                      <Button
                        size="sm"
                        variant={frameDuration === 333 ? "default" : "outline"}
                        onClick={() => setFrameDuration(333)}
                        disabled={isLoading || isGeneratingGif || isGeneratingVideo}
                      >
                        Fast
                      </Button>
                      <Button
                        size="sm"
                        variant={frameDuration === 500 ? "default" : "outline"}
                        onClick={() => setFrameDuration(500)}
                        disabled={isLoading || isGeneratingGif || isGeneratingVideo}
                      >
                        Default
                      </Button>
                      <Button
                        size="sm"
                        variant={frameDuration === 1000 ? "default" : "outline"}
                        onClick={() => setFrameDuration(1000)}
                        disabled={isLoading || isGeneratingGif || isGeneratingVideo}
                      >
                        Slow
                      </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                      Control animation speed for GIF and Video
                    </p>
                  </div>
                )}
              </div>
            ) : gifPreviewUrl ? (
              // GIF Preview
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Badge>GIF</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearGifPreview}
                  >
                    ✕ Clear
                  </Button>
                </div>
                <div className="flex justify-center bg-muted rounded-lg p-4">
                  <img
                    src={gifPreviewUrl}
                    alt="GIF Preview"
                    className="max-w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
                <Button
                  onClick={downloadGif}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  📥 Download GIF
                </Button>
              </div>
            ) : (
              // Video Preview
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Badge>Video</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearVideoPreview}
                  >
                    ✕ Clear
                  </Button>
                </div>
                <div className="flex justify-center bg-muted rounded-lg p-4">
                  <video
                    src={videoPreviewUrl}
                    controls
                    loop
                    className="max-w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
                <Button
                  onClick={downloadVideo}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  📥 Download Video
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Zoom Change Warning */}
      {images.length > 0 && zoomLevel !== processedWithZoom && (
        <Alert className="w-full max-w-2xl" variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            ⚠️ Zoom level changed!
          </AlertTitle>
          <AlertDescription>
            Images were processed with {processedWithZoom}px, but zoom is now {zoomLevel}px.
            Click "Reprocess" to apply the new zoom level.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center w-full max-w-2xl">
          <Button
            onClick={reprocessWithNewZoom}
            disabled={isLoading || isGeneratingGif || isGeneratingVideo}
            variant={zoomLevel !== processedWithZoom ? "destructive" : "secondary"}
            className={zoomLevel !== processedWithZoom ? "animate-pulse" : ""}
          >
            🔄 {zoomLevel !== processedWithZoom ? 'Reprocess with New Zoom!' : 'Reprocess Images'}
          </Button>
          <Button
            onClick={generateGif}
            disabled={validImagesCount === 0 || isGeneratingGif || isGeneratingVideo}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            {isGeneratingGif ? `Generating... ${gifProgress}%` : `📸 Generate GIF (${validImagesCount})`}
          </Button>
          <Button
            onClick={generateVideo}
            disabled={validImagesCount === 0 || isGeneratingGif || isGeneratingVideo}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGeneratingVideo ? `Recording... ${videoProgress}%` : `🎥 Generate Video (${validImagesCount})`}
          </Button>
          <Button
            onClick={clearAll}
            disabled={isGeneratingGif || isGeneratingVideo}
            variant="outline"
            className="hover:bg-red-50 hover:text-red-600 hover:border-red-600"
          >
            Clear All
          </Button>
        </div>
      )}

      {isModelsLoading && (
        <p className="text-sm text-muted-foreground">Initializing face detection models...</p>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="w-full max-w-2xl">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Alert className="w-full max-w-2xl border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
            <AlertDescription>Processing images...</AlertDescription>
          </div>
        </Alert>
      )}

      {/* Instructions */}
      {images.length === 0 && !isModelsLoading && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-center">How It Works</CardTitle>
            <CardDescription className="text-center">
              Create stunning face animations in just a few steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Adjust <strong>zoom level</strong> and <strong>frame duration</strong> to your preference</li>
              <li>Upload multiple images with <strong>clear, visible faces</strong></li>
              <li>Each face will be automatically <strong>aligned</strong> (horizontal eyes, centered)</li>
              <li>Use "Reprocess" button if you want to change zoom after upload</li>
              <li>Click <strong>📸 Generate GIF</strong> for animated GIF (universal compatibility)</li>
              <li>Or click <strong>🎥 Generate Video</strong> for WebM video (smaller file size)</li>
              <li>Your file will download automatically!</li>
            </ol>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-center text-muted-foreground">
                ✨ Perfect for creating match-cut sequences, face morphing animations, and more!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
