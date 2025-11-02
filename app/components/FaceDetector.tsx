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
  const reprocessWithNewZoom = async () => {
    if (images.length === 0) return;

    console.log(`🔄 Reprocessing ${images.length} images with zoom level: ${zoomLevel}px`);

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
                targetEyeDistance: zoomLevel,
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
      setProcessedWithZoom(zoomLevel); // Update the processed zoom level
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
        // Download the GIF
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `aligned-faces-${Date.now()}.gif`;
        link.click();
        URL.revokeObjectURL(url);

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
        const link = document.createElement('a');
        link.href = url;
        link.download = `aligned-faces-${Date.now()}.webm`;
        link.click();
        URL.revokeObjectURL(url);

        setIsGeneratingVideo(false);
        setVideoProgress(0);
        console.log('✅ Video download started!');
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
  const handleZoomChange = (newZoom: number) => {
    console.log(`🔍 Zoom changed from ${zoomLevel}px to ${newZoom}px`);
    setZoomLevel(newZoom);
    if (images.length > 0) {
      console.log(`⚠️ You have ${images.length} images. Click "Reprocess" to apply new zoom.`);
    }
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

      {/* Upload Controls */}
      <Card className="w-full max-w-2xl">
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
        </CardContent>
      </Card>

      {/* Frame Duration Control */}
      {!isModelsLoading && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Frame Duration</CardTitle>
              <Badge variant="secondary" className="font-mono">
                {frameDuration}ms ({(1000 / frameDuration).toFixed(1)} FPS)
              </Badge>
            </div>
            <CardDescription>Control animation speed for GIF and Video</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      )}

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

      {/* GIF Generation Progress */}
      {isGeneratingGif && (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Progress value={gifProgress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Generating GIF... {gifProgress}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Generation Progress */}
      {isGeneratingVideo && (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Progress value={videoProgress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Recording Video... {videoProgress}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Images Gallery */}
      {images.length > 0 && (
        <div className="w-full space-y-4">
          <h2 className="text-2xl font-semibold text-center">
            Processed Images <Badge variant="secondary">{images.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((img, index) => (
              <Card key={img.id} className={img.hasError ? 'border-red-300' : 'border-green-300'}>
                <CardContent className="p-4">
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
                          <p className="text-destructive text-sm p-4 text-center">
                            {img.errorMessage || 'Failed to process'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    >
                      ×
                    </Button>

                    {/* Frame number badge */}
                    <Badge className="absolute top-2 left-2">
                      #{index + 1}
                    </Badge>
                  </div>

                  {/* Metadata */}
                  {!img.hasError && (
                    <div className="text-xs text-muted-foreground text-center mt-2">
                      Angle: {img.angle.toFixed(2)}°
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
