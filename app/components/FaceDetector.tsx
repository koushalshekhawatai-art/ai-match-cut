'use client';

import { useEffect, useRef, useState } from 'react';
import { loadFaceApiModels, detectSingleFace, areModelsLoaded } from '@/lib/faceapi';
import { alignFaceOnCanvas, calculateEyeMetrics, drawEyeMetrics } from '@/lib/faceAlignment';
import { loadOpenCV, isOpenCVReady } from '@/lib/opencv';
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
  const [isProductMode, setIsProductMode] = useState(false); // Toggle between face detection and template matching
  const [isOpenCVLoading, setIsOpenCVLoading] = useState(false);
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

  // Export settings
  const [exportFormat, setExportFormat] = useState<'gif' | 'video'>('gif');
  const [exportResolution, setExportResolution] = useState(500); // Default base resolution
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '4:5'>('1:1'); // Aspect ratio
  const [videoFps, setVideoFps] = useState(30); // Default 30 FPS for video
  const [videoFileExtension, setVideoFileExtension] = useState('webm'); // Track actual video format
  const [audioFile, setAudioFile] = useState<File | null>(null); // Audio file for video
  const [audioSource, setAudioSource] = useState<'none' | 'upload' | 'click' | 'beep' | 'whoosh'>('none'); // Audio source type
  const audioInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null); // Audio element for preview
  const audioContextRef = useRef<AudioContext | null>(null); // Audio context for preview
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null); // Audio source node for preview

  // Helper function to get canvas dimensions based on aspect ratio
  const getCanvasDimensions = (ratio: string, baseSize: number = 500) => {
    switch (ratio) {
      case '1:1': // Square (Instagram Post, Default)
        return { width: baseSize, height: baseSize };
      case '9:16': // Portrait (Instagram Stories/Reels)
        return { width: Math.round(baseSize * 9 / 16), height: baseSize };
      case '16:9': // Landscape (YouTube)
        return { width: baseSize, height: Math.round(baseSize * 9 / 16) };
      case '4:5': // Portrait (Instagram Feed)
        return { width: Math.round(baseSize * 4 / 5), height: baseSize };
      default:
        return { width: baseSize, height: baseSize };
    }
  };

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

  // Load OpenCV when Product Mode is enabled
  useEffect(() => {
    if (isProductMode && !isOpenCVReady()) {
      const initOpenCV = async () => {
        setIsOpenCVLoading(true);
        try {
          await loadOpenCV();
          setIsOpenCVLoading(false);
          console.log('✅ OpenCV.js ready for template matching');
        } catch (err) {
          setError('Failed to load OpenCV.js');
          setIsOpenCVLoading(false);
          console.error(err);
        }
      };
      initOpenCV();
    }
  }, [isProductMode]);

  // Cleanup preview URLs and audio on unmount
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
      // Stop preview audio
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (audioSourceNodeRef.current) {
        audioSourceNodeRef.current.stop();
        audioSourceNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
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

  // Play preview audio when images or audio source changes
  useEffect(() => {
    const validImages = images.filter(img => img.alignedCanvas && !img.hasError);

    // Stop any currently playing audio
    const stopPreviewAudio = () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current = null;
      }
      if (audioSourceNodeRef.current) {
        try {
          audioSourceNodeRef.current.stop();
        } catch (e) {
          // Already stopped
        }
        audioSourceNodeRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };

    // Always stop previous audio first
    stopPreviewAudio();

    // Only play audio if we have images and audio is enabled
    if (validImages.length === 0 || audioSource === 'none') {
      return;
    }

    const playPreviewAudio = async () => {
      try {
        if (audioSource === 'upload' && audioFile) {
          // Use uploaded audio file for preview
          console.log('🎵 Playing uploaded audio in preview...');
          const audio = new Audio(URL.createObjectURL(audioFile));
          audio.loop = true;
          audio.volume = 0.5;
          await audio.play();
          previewAudioRef.current = audio;
          console.log('✅ Preview audio playing (uploaded file)');
        } else if (audioSource === 'click' || audioSource === 'beep' || audioSource === 'whoosh') {
          // Generate and play pre-built audio for preview
          console.log(`🎵 Generating ${audioSource} audio for preview...`);
          const previewDuration = (validImages.length * frameDuration) / 1000; // Total animation duration in seconds
          const audioBuffer = await generatePreviewAudioBuffer(audioSource, previewDuration);

          // Create audio context and play the buffer in a loop
          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;

          const playLoop = () => {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
              return;
            }

            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            source.loop = true;
            source.start(0);
            audioSourceNodeRef.current = source;
          };

          playLoop();
          console.log(`✅ Preview audio playing (${audioSource})`);
        }
      } catch (error) {
        console.error('❌ Error playing preview audio:', error);
      }
    };

    playPreviewAudio();

    return () => {
      stopPreviewAudio();
    };
  }, [images, audioSource, audioFile, frameDuration]);

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

        if (isProductMode) {
          // Product Mode: Load images with zoom control
          console.log('📦 Product Mode: Image loaded, zoom level:', zoomLevel);

          // Get canvas dimensions based on aspect ratio
          const dims = getCanvasDimensions(aspectRatio);

          // Create a canvas with the image (respecting zoom level and aspect ratio)
          const canvas = document.createElement('canvas');
          canvas.width = dims.width;
          canvas.height = dims.height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            // Use zoom level to control how much of the image is shown
            const zoomFactor = zoomLevel / 140; // Normalize around default (140)

            // Calculate the size of the crop from the original image
            const cropSize = Math.min(img.width, img.height) / zoomFactor;

            // Center the crop
            const cropX = (img.width - cropSize) / 2;
            const cropY = (img.height - cropSize) / 2;

            // Fill background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, dims.width, dims.height);

            // Draw the cropped and scaled image
            ctx.drawImage(
              img,
              cropX, cropY, cropSize, cropSize, // source crop
              0, 0, dims.width, dims.height // destination (full canvas with aspect ratio)
            );
          }

          newImages.push({
            id,
            originalUrl: url,
            alignedCanvas: canvas,
            angle: 0,
            hasError: false,
          });
        } else {
          // Face Detection Mode: Normal workflow
          const detection = await detectSingleFace(img, {
            withLandmarks: true,
            useTinyModel,
          });

          if (detection && detection.landmarks) {
            const metrics = calculateEyeMetrics(detection.landmarks);
            const dims = getCanvasDimensions(aspectRatio);

            // First, create aligned square canvas
            const squareCanvas = alignFaceOnCanvas(img, detection.landmarks, {
              canvasSize: 500,
              targetEyeDistance: zoomLevel,
            });

            // Then, create final canvas with correct aspect ratio
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = dims.width;
            finalCanvas.height = dims.height;
            const finalCtx = finalCanvas.getContext('2d');

            if (finalCtx) {
              // Fill background
              finalCtx.fillStyle = '#ffffff';
              finalCtx.fillRect(0, 0, dims.width, dims.height);

              // Calculate position to center the face
              const offsetX = (dims.width - dims.height) / 2; // For landscape
              const offsetY = (dims.height - dims.width) / 2; // For portrait

              if (dims.width > dims.height) {
                // Landscape: center vertically
                finalCtx.drawImage(squareCanvas, offsetX, 0, dims.height, dims.height);
              } else if (dims.height > dims.width) {
                // Portrait: center horizontally
                finalCtx.drawImage(squareCanvas, 0, offsetY, dims.width, dims.width);
              } else {
                // Square: draw as is
                finalCtx.drawImage(squareCanvas, 0, 0, dims.width, dims.height);
              }
            }

            newImages.push({
              id,
              originalUrl: url,
              alignedCanvas: finalCanvas,
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

            if (isProductMode) {
              // Product Mode: Reprocess with new zoom and aspect ratio
              const dims = getCanvasDimensions(aspectRatio);
              const canvas = document.createElement('canvas');
              canvas.width = dims.width;
              canvas.height = dims.height;
              const ctx = canvas.getContext('2d');

              if (ctx) {
                const zoomFactor = useZoom / 140;
                const cropSize = Math.min(loadedImg.width, loadedImg.height) / zoomFactor;
                const cropX = (loadedImg.width - cropSize) / 2;
                const cropY = (loadedImg.height - cropSize) / 2;

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, dims.width, dims.height);
                ctx.drawImage(
                  loadedImg,
                  cropX, cropY, cropSize, cropSize,
                  0, 0, dims.width, dims.height
                );
              }

              console.log(`✅ Image ${index + 1} reprocessed successfully (Product Mode)`);

              return {
                id: img.id + '-reprocessed-' + Date.now(),
                originalUrl: img.originalUrl,
                alignedCanvas: canvas,
                angle: 0,
                hasError: false,
              };
            } else {
              // Face Detection Mode: Normal workflow with aspect ratio
              const detection = await detectSingleFace(loadedImg, {
                withLandmarks: true,
                useTinyModel,
              });

              if (detection && detection.landmarks) {
                const metrics = calculateEyeMetrics(detection.landmarks);
                const dims = getCanvasDimensions(aspectRatio);

                // Create aligned square canvas first
                const squareCanvas = alignFaceOnCanvas(loadedImg, detection.landmarks, {
                  canvasSize: 500,
                  targetEyeDistance: useZoom,
                });

                // Create final canvas with aspect ratio
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = dims.width;
                finalCanvas.height = dims.height;
                const finalCtx = finalCanvas.getContext('2d');

                if (finalCtx) {
                  finalCtx.fillStyle = '#ffffff';
                  finalCtx.fillRect(0, 0, dims.width, dims.height);

                  const offsetX = (dims.width - dims.height) / 2;
                  const offsetY = (dims.height - dims.width) / 2;

                  if (dims.width > dims.height) {
                    finalCtx.drawImage(squareCanvas, offsetX, 0, dims.height, dims.height);
                  } else if (dims.height > dims.width) {
                    finalCtx.drawImage(squareCanvas, 0, offsetY, dims.width, dims.width);
                  } else {
                    finalCtx.drawImage(squareCanvas, 0, 0, dims.width, dims.height);
                  }
                }

                console.log(`✅ Image ${index + 1} reprocessed successfully`);

                return {
                  id: img.id + '-reprocessed-' + Date.now(),
                  originalUrl: img.originalUrl,
                  alignedCanvas: finalCanvas,
                  angle: (metrics.angle * 180) / Math.PI,
                  hasError: false,
                };
              }

              console.log(`⚠️ Image ${index + 1} - no face detected on reprocess`);
              return img;
            }
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
  const generateGif = async (resolution: number = exportResolution) => {
    const validImages = images.filter(img => img.alignedCanvas && !img.hasError);

    if (validImages.length === 0) {
      setError('No valid aligned faces to create GIF');
      return;
    }

    setIsGeneratingGif(true);
    setGifProgress(0);
    setError('');

    try {
      // Get dimensions based on aspect ratio
      const dims = getCanvasDimensions(aspectRatio, resolution);

      // Create a temporary canvas for resizing if needed
      const firstCanvas = validImages[0].alignedCanvas;
      const needsResize = firstCanvas && (firstCanvas.width !== dims.width || firstCanvas.height !== dims.height);

      // Create GIF instance with aspect ratio dimensions
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: dims.width,
        height: dims.height,
        workerScript: '/gif.worker.js',
      });

      // Add frames with user-specified duration
      validImages.forEach((img) => {
        if (img.alignedCanvas) {
          if (needsResize) {
            // Resize canvas to target resolution while maintaining aspect ratio
            const resizedCanvas = document.createElement('canvas');
            resizedCanvas.width = dims.width;
            resizedCanvas.height = dims.height;
            const ctx = resizedCanvas.getContext('2d');
            if (ctx) {
              // Fill background
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, dims.width, dims.height);

              // Calculate scale to fit canvas while maintaining aspect ratio
              const sourceWidth = img.alignedCanvas.width;
              const sourceHeight = img.alignedCanvas.height;
              const scaleX = dims.width / sourceWidth;
              const scaleY = dims.height / sourceHeight;
              const scale = Math.min(scaleX, scaleY);

              // Calculate scaled dimensions
              const scaledWidth = sourceWidth * scale;
              const scaledHeight = sourceHeight * scale;

              // Center the image
              const x = (dims.width - scaledWidth) / 2;
              const y = (dims.height - scaledHeight) / 2;

              ctx.drawImage(img.alignedCanvas, x, y, scaledWidth, scaledHeight);
              gif.addFrame(resizedCanvas, { delay: frameDuration });
            }
          } else {
            gif.addFrame(img.alignedCanvas, { delay: frameDuration });
          }
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

        // Auto-download the GIF
        const link = document.createElement('a');
        link.href = url;
        link.download = `aligned-faces-${Date.now()}.gif`;
        link.click();
        console.log('✅ GIF download started automatically');
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

  // Generate audio buffer for preview (returns AudioBuffer instead of MediaStream)
  const generatePreviewAudioBuffer = async (type: 'click' | 'beep' | 'whoosh', duration: number): Promise<AudioBuffer> => {
    const audioCtx = new AudioContext();
    const sampleRate = audioCtx.sampleRate;
    const totalSamples = Math.floor(sampleRate * duration);

    // Create offline context for rendering
    const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

    if (type === 'click') {
      // Generate click sound on each frame transition
      const frameInterval = frameDuration / 1000; // Convert to seconds
      const numClicks = Math.floor(duration / frameInterval);

      for (let i = 0; i < numClicks; i++) {
        const clickTime = i * frameInterval;
        const clickOsc = offlineCtx.createOscillator();
        const clickGain = offlineCtx.createGain();

        clickOsc.frequency.value = 800; // Click frequency
        clickGain.gain.setValueAtTime(0.3, clickTime);
        clickGain.gain.exponentialRampToValueAtTime(0.01, clickTime + 0.05);

        clickOsc.connect(clickGain);
        clickGain.connect(offlineCtx.destination);
        clickOsc.start(clickTime);
        clickOsc.stop(clickTime + 0.05);
      }
    } else if (type === 'beep') {
      // Generate beep sound on each frame
      const frameInterval = frameDuration / 1000;
      const numBeeps = Math.floor(duration / frameInterval);

      for (let i = 0; i < numBeeps; i++) {
        const beepTime = i * frameInterval;
        const beepOsc = offlineCtx.createOscillator();
        const beepGain = offlineCtx.createGain();

        beepOsc.frequency.value = 440; // A4 note
        beepGain.gain.setValueAtTime(0.2, beepTime);
        beepGain.gain.exponentialRampToValueAtTime(0.01, beepTime + 0.1);

        beepOsc.connect(beepGain);
        beepGain.connect(offlineCtx.destination);
        beepOsc.start(beepTime);
        beepOsc.stop(beepTime + 0.1);
      }
    } else if (type === 'whoosh') {
      // Generate whoosh sound (sweep) on each transition
      const frameInterval = frameDuration / 1000;
      const numWhooshes = Math.floor(duration / frameInterval);

      for (let i = 0; i < numWhooshes; i++) {
        const whooshTime = i * frameInterval;
        const whooshOsc = offlineCtx.createOscillator();
        const whooshGain = offlineCtx.createGain();

        whooshOsc.frequency.setValueAtTime(1000, whooshTime);
        whooshOsc.frequency.exponentialRampToValueAtTime(200, whooshTime + 0.15);
        whooshGain.gain.setValueAtTime(0.15, whooshTime);
        whooshGain.gain.exponentialRampToValueAtTime(0.01, whooshTime + 0.15);

        whooshOsc.connect(whooshGain);
        whooshGain.connect(offlineCtx.destination);
        whooshOsc.start(whooshTime);
        whooshOsc.stop(whooshTime + 0.15);
      }
    }

    // Render the audio
    const renderedBuffer = await offlineCtx.startRendering();
    await audioCtx.close();

    return renderedBuffer;
  };

  // Generate pre-built audio using Web Audio API (for video export)
  const generatePreBuiltAudio = async (type: 'click' | 'beep' | 'whoosh', duration: number): Promise<MediaStream> => {
    const audioCtx = new AudioContext();
    const sampleRate = audioCtx.sampleRate;
    const totalSamples = Math.floor(sampleRate * duration);

    // Create offline context for rendering
    const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

    if (type === 'click') {
      // Generate click sound on each frame transition
      const frameInterval = frameDuration / 1000; // Convert to seconds
      const numClicks = Math.floor(duration / frameInterval);

      for (let i = 0; i < numClicks; i++) {
        const clickTime = i * frameInterval;
        const clickOsc = offlineCtx.createOscillator();
        const clickGain = offlineCtx.createGain();

        clickOsc.frequency.value = 800; // Click frequency
        clickGain.gain.setValueAtTime(0.3, clickTime);
        clickGain.gain.exponentialRampToValueAtTime(0.01, clickTime + 0.05);

        clickOsc.connect(clickGain);
        clickGain.connect(offlineCtx.destination);
        clickOsc.start(clickTime);
        clickOsc.stop(clickTime + 0.05);
      }
    } else if (type === 'beep') {
      // Generate beep sound on each frame
      const frameInterval = frameDuration / 1000;
      const numBeeps = Math.floor(duration / frameInterval);

      for (let i = 0; i < numBeeps; i++) {
        const beepTime = i * frameInterval;
        const beepOsc = offlineCtx.createOscillator();
        const beepGain = offlineCtx.createGain();

        beepOsc.frequency.value = 440; // A4 note
        beepGain.gain.setValueAtTime(0.2, beepTime);
        beepGain.gain.exponentialRampToValueAtTime(0.01, beepTime + 0.1);

        beepOsc.connect(beepGain);
        beepGain.connect(offlineCtx.destination);
        beepOsc.start(beepTime);
        beepOsc.stop(beepTime + 0.1);
      }
    } else if (type === 'whoosh') {
      // Generate whoosh sound (sweep) on each transition
      const frameInterval = frameDuration / 1000;
      const numWhooshes = Math.floor(duration / frameInterval);

      for (let i = 0; i < numWhooshes; i++) {
        const whooshTime = i * frameInterval;
        const whooshOsc = offlineCtx.createOscillator();
        const whooshGain = offlineCtx.createGain();

        whooshOsc.frequency.setValueAtTime(1000, whooshTime);
        whooshOsc.frequency.exponentialRampToValueAtTime(200, whooshTime + 0.15);
        whooshGain.gain.setValueAtTime(0.15, whooshTime);
        whooshGain.gain.exponentialRampToValueAtTime(0.01, whooshTime + 0.15);

        whooshOsc.connect(whooshGain);
        whooshGain.connect(offlineCtx.destination);
        whooshOsc.start(whooshTime);
        whooshOsc.stop(whooshTime + 0.15);
      }
    }

    // Render the audio
    const renderedBuffer = await offlineCtx.startRendering();

    // Create MediaStreamAudioDestinationNode to get a MediaStream
    const source = audioCtx.createBufferSource();
    source.buffer = renderedBuffer;

    const destination = audioCtx.createMediaStreamDestination();
    source.connect(destination);
    source.start();

    return destination.stream;
  };

  // Generate Video (MP4/WebM) from aligned canvases
  const generateVideo = async (resolution: number = exportResolution, fps: number = videoFps) => {
    const validImages = images.filter(img => img.alignedCanvas && !img.hasError);

    if (validImages.length === 0) {
      setError('No valid aligned faces to create video');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoProgress(0);
    setError('');

    try {
      const dims = getCanvasDimensions(aspectRatio, resolution);
      console.log(`🎬 Starting video generation with ${validImages.length} frames at ${dims.width}x${dims.height} @ ${fps} FPS`);

      // Create a temporary canvas for video rendering
      const videoCanvas = document.createElement('canvas');
      videoCanvas.width = dims.width;
      videoCanvas.height = dims.height;
      const ctx = videoCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Setup MediaRecorder with high quality settings
      let finalStream = videoCanvas.captureStream(fps); // User-selected FPS

      // Add audio based on user's selection
      if (audioSource !== 'none') {
        console.log(`🎵 Adding ${audioSource} audio to video...`);
        try {
          if (audioSource === 'upload' && audioFile) {
            // Use uploaded audio file
            console.log('🎵 Using uploaded audio file...');
            const audioElement = document.createElement('audio');
            audioElement.src = URL.createObjectURL(audioFile);
            audioElement.muted = false;

            // Create MediaStream from audio element
            const audioCtx = new AudioContext();
            const audioSrc = audioCtx.createMediaElementSource(audioElement);
            const audioDestination = audioCtx.createMediaStreamDestination();
            audioSrc.connect(audioDestination);
            audioSrc.connect(audioCtx.destination); // Also connect to speakers for monitoring

            // Combine video and audio streams
            const combinedStream = new MediaStream([
              ...finalStream.getVideoTracks(),
              ...audioDestination.stream.getAudioTracks()
            ]);

            finalStream = combinedStream;

            // Start playing audio (will be captured by MediaRecorder)
            audioElement.play();
            console.log('✅ Uploaded audio track added to video');
          } else if (audioSource === 'click' || audioSource === 'beep' || audioSource === 'whoosh') {
            // Generate pre-built audio
            console.log(`🎵 Generating ${audioSource} audio...`);
            const videoDuration = (validImages.length * frameDuration) / 1000; // Convert to seconds
            const audioStream = await generatePreBuiltAudio(audioSource, videoDuration);

            // Combine video and audio streams
            const combinedStream = new MediaStream([
              ...finalStream.getVideoTracks(),
              ...audioStream.getAudioTracks()
            ]);

            finalStream = combinedStream;
            console.log(`✅ Pre-built ${audioSource} audio track added to video`);
          }
        } catch (audioError) {
          console.error('❌ Error adding audio:', audioError);
          setError('Failed to add audio to video. Video will be generated without audio.');
        }
      }

      // Calculate bitrate based on resolution (higher res = higher bitrate)
      // Base: 500px = 15 Mbps, scale up for larger resolutions
      const bitrate = Math.max(15000000, (resolution / 500) * (resolution / 500) * 15000000);
      console.log(`📊 Using bitrate: ${(bitrate / 1000000).toFixed(1)} Mbps`);

      // Try to use H.264/MP4 first (better compatibility), fallback to VP9/WebM
      let mimeType = 'video/webm;codecs=vp9';
      let fileExtension = 'webm';

      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        fileExtension = 'mp4';
        console.log('✅ Using MP4 format');
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
        fileExtension = 'webm';
        console.log('✅ Using H.264 codec in WebM container');
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
        fileExtension = 'webm';
        console.log('✅ Using VP9 codec (fallback)');
      } else {
        // Last resort - no codec specified
        mimeType = 'video/webm';
        fileExtension = 'webm';
        console.log('⚠️ Using default WebM format');
      }

      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('✅ Video recording stopped, creating blob...');
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setVideoPreviewUrl(url);
        setVideoBlob(blob);
        setVideoFileExtension(fileExtension); // Store the actual format used

        setIsGeneratingVideo(false);
        setVideoProgress(0);
        console.log(`✅ Video preview ready! Format: ${fileExtension}, Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

        // Auto-download the video
        const link = document.createElement('a');
        link.href = url;
        link.download = `aligned-faces-${Date.now()}.${fileExtension}`;
        link.click();
        console.log('✅ Video download started automatically');
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
          // Clear and fill background
          ctx.clearRect(0, 0, dims.width, dims.height);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, dims.width, dims.height);

          // Calculate scale to fit canvas while maintaining aspect ratio
          const sourceWidth = img.alignedCanvas.width;
          const sourceHeight = img.alignedCanvas.height;
          const targetWidth = dims.width;
          const targetHeight = dims.height;

          // Calculate scale factor (use the minimum to ensure it fits)
          const scaleX = targetWidth / sourceWidth;
          const scaleY = targetHeight / sourceHeight;
          const scale = Math.min(scaleX, scaleY);

          // Calculate scaled dimensions
          const scaledWidth = sourceWidth * scale;
          const scaledHeight = sourceHeight * scale;

          // Calculate position to center the image
          const x = (targetWidth - scaledWidth) / 2;
          const y = (targetHeight - scaledHeight) / 2;

          // Draw the image scaled and centered
          ctx.drawImage(img.alignedCanvas, x, y, scaledWidth, scaledHeight);
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

  // Handle aspect ratio change
  const handleAspectRatioChange = async (newRatio: '1:1' | '9:16' | '16:9' | '4:5') => {
    console.log(`📐 Aspect ratio changed from ${aspectRatio} to ${newRatio}`);
    setAspectRatio(newRatio);

    // Automatically reprocess images if any are loaded
    if (images.length > 0) {
      console.log(`🔄 Auto-reprocessing ${images.length} images with new aspect ratio...`);
      await reprocessWithNewZoom(); // This function already respects aspectRatio
    }
  };

  // Unified generate function based on export settings
  const handleGenerate = async () => {
    if (exportFormat === 'gif') {
      await generateGif(exportResolution);
    } else {
      await generateVideo(exportResolution, videoFps);
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
    link.download = `aligned-faces-${Date.now()}.${videoFileExtension}`;
    link.click();
  };

  // Clear GIF preview
  const clearGifPreview = () => {
    if (gifPreviewUrl) {
      URL.revokeObjectURL(gifPreviewUrl);
    }
    setGifPreviewUrl('');
    setGifBlob(null);

    // Stop preview audio when clearing
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      audioSourceNodeRef.current = null;
    }
  };

  // Clear Video preview
  const clearVideoPreview = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl('');
    setVideoBlob(null);

    // Stop preview audio when clearing
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      audioSourceNodeRef.current = null;
    }
  };

  const validImagesCount = images.filter(img => !img.hasError).length;

  return (
    <div className="flex flex-col items-center gap-6 p-8 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          AI Match Cut Generator
        </h1>
        <p className="text-muted-foreground">Transform faces into perfectly aligned animated GIFs & Videos</p>
      </div>

      {/* Main Layout: Upload on Left, Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Left Column - Upload Controls */}
        <Card className="w-full h-full flex flex-col">
        <CardHeader className="text-center">
          <CardTitle>Upload Images</CardTitle>
          <CardDescription>Select multiple images with faces to create your animation</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 flex-1 overflow-hidden">
          {/* Mode Selection Buttons */}
          <div className="w-full max-w-md">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={!isProductMode ? 'default' : 'outline'}
                onClick={() => {
                  if (!isProductMode) return; // Already in face mode

                  // Clear images when switching modes
                  if (images.length > 0) {
                    const confirmSwitch = window.confirm(
                      'Switching modes will clear all current images. Continue?'
                    );
                    if (!confirmSwitch) {
                      return;
                    }
                    clearAll();
                  }
                  setIsProductMode(false);
                }}
                disabled={isLoading || isGeneratingGif || isGeneratingVideo}
                className="h-auto py-4 flex flex-col gap-1"
              >
                <span className="font-semibold">Face Mode</span>
                <span className="text-xs opacity-80 font-normal">
                  Detect & align faces
                </span>
              </Button>
              <Button
                variant={isProductMode ? 'default' : 'outline'}
                onClick={() => {
                  if (isProductMode) return; // Already in product mode

                  // Clear images when switching modes
                  if (images.length > 0) {
                    const confirmSwitch = window.confirm(
                      'Switching modes will clear all current images. Continue?'
                    );
                    if (!confirmSwitch) {
                      return;
                    }
                    clearAll();
                  }
                  setIsProductMode(true);
                }}
                disabled={isLoading || isGeneratingGif || isGeneratingVideo}
                className="h-auto py-4 flex flex-col gap-1"
              >
                <span className="font-semibold">Product Mode</span>
                <span className="text-xs opacity-80 font-normal">
                  Align any objects
                </span>
              </Button>
            </div>
          </div>

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
            disabled={isModelsLoading || isLoading || (isProductMode && isOpenCVLoading)}
            size="lg"
            className="w-full max-w-xs"
          >
            {isModelsLoading ? 'Loading models...' :
             isOpenCVLoading ? 'Loading OpenCV...' :
             isLoading ? 'Processing...' : 'Upload Images'}
          </Button>

          {/* Detector Model Selection - Only show in Face Detection mode */}
          {!isModelsLoading && !isProductMode && (
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
            <Label className="font-semibold">Zoom Level</Label>
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
              {isProductMode
                ? 'Lower values = show more of the image'
                : 'Lower values = more breathing space around face'}
            </p>
          </div>

          {/* Uploaded Images Gallery */}
          {images.length > 0 && (
            <div className="space-y-3 pt-4 border-t flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Uploaded Images</h3>
                <Badge variant="secondary">{images.length}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
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

        {/* Right Column - Preview and Export */}
        <div className="space-y-6">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Export Settings</CardTitle>
            <CardDescription>
              Choose your output format and resolution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Output Format</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={exportFormat === 'gif' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('gif')}
                  disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                  className="h-auto py-4 flex flex-col gap-2"
                >
                  <span className="font-semibold">GIF</span>
                  <span className="text-xs text-muted-foreground">
                    Universal compatibility
                  </span>
                </Button>
                <Button
                  variant={exportFormat === 'video' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('video')}
                  disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                  className="h-auto py-4 flex flex-col gap-2"
                >
                  <span className="font-semibold">Video</span>
                  <span className="text-xs text-muted-foreground">
                    High quality MP4/WebM
                  </span>
                </Button>
              </div>
            </div>

            {/* Aspect Ratio Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Aspect Ratio</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  size="sm"
                  variant={aspectRatio === '1:1' ? 'default' : 'outline'}
                  onClick={() => handleAspectRatioChange('1:1')}
                  disabled={isGeneratingGif || isGeneratingVideo || isLoading}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <span className="font-semibold">1:1</span>
                  <span className="text-xs text-muted-foreground">Square</span>
                </Button>
                <Button
                  size="sm"
                  variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                  onClick={() => handleAspectRatioChange('9:16')}
                  disabled={isGeneratingGif || isGeneratingVideo || isLoading}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <span className="font-semibold">9:16</span>
                  <span className="text-xs text-muted-foreground">Stories</span>
                </Button>
                <Button
                  size="sm"
                  variant={aspectRatio === '16:9' ? 'default' : 'outline'}
                  onClick={() => handleAspectRatioChange('16:9')}
                  disabled={isGeneratingGif || isGeneratingVideo || isLoading}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <span className="font-semibold">16:9</span>
                  <span className="text-xs text-muted-foreground">YouTube</span>
                </Button>
                <Button
                  size="sm"
                  variant={aspectRatio === '4:5' ? 'default' : 'outline'}
                  onClick={() => handleAspectRatioChange('4:5')}
                  disabled={isGeneratingGif || isGeneratingVideo || isLoading}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <span className="font-semibold">4:5</span>
                  <span className="text-xs text-muted-foreground">Feed</span>
                </Button>
              </div>
            </div>

            {/* Resolution Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Resolution</Label>
                <Badge variant="secondary" className="font-mono">
                  {(() => {
                    const dims = getCanvasDimensions(aspectRatio, exportResolution);
                    return `${dims.width}x${dims.height}`;
                  })()}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  size="sm"
                  variant={exportResolution === 500 ? 'default' : 'outline'}
                  onClick={() => setExportResolution(500)}
                  disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                >
                  500px
                </Button>
                <Button
                  size="sm"
                  variant={exportResolution === 720 ? 'default' : 'outline'}
                  onClick={() => setExportResolution(720)}
                  disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                >
                  720px (HD)
                </Button>
                <Button
                  size="sm"
                  variant={exportResolution === 1080 ? 'default' : 'outline'}
                  onClick={() => setExportResolution(1080)}
                  disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                >
                  1080px (FHD)
                </Button>
                <Button
                  size="sm"
                  variant={exportResolution === 1440 ? 'default' : 'outline'}
                  onClick={() => setExportResolution(1440)}
                  disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                >
                  1440px (2K)
                </Button>
              </div>
            </div>

            {/* Video FPS Selection - Only show for Video format */}
            {exportFormat === 'video' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Video Frame Rate (FPS)</Label>
                  <Badge variant="secondary" className="font-mono">
                    {videoFps} FPS
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={videoFps === 24 ? 'default' : 'outline'}
                    onClick={() => setVideoFps(24)}
                    disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                  >
                    24 FPS
                    <span className="block text-xs text-muted-foreground">Cinematic</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={videoFps === 30 ? 'default' : 'outline'}
                    onClick={() => setVideoFps(30)}
                    disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                  >
                    30 FPS
                    <span className="block text-xs text-muted-foreground">Standard</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={videoFps === 60 ? 'default' : 'outline'}
                    onClick={() => setVideoFps(60)}
                    disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                  >
                    60 FPS
                    <span className="block text-xs text-muted-foreground">Smooth</span>
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Higher FPS = smoother video playback (larger file size)
                </p>
              </div>
            )}

            {/* Audio Options - Only show for Video format */}
            {exportFormat === 'video' && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Audio (Optional)</Label>

                {/* Audio Source Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={audioSource === 'none' ? 'default' : 'outline'}
                    onClick={() => {
                      setAudioSource('none');
                      setAudioFile(null);
                      if (audioInputRef.current) {
                        audioInputRef.current.value = '';
                      }
                    }}
                    disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                  >
                    No Audio
                  </Button>
                  <Button
                    size="sm"
                    variant={audioSource === 'upload' ? 'default' : 'outline'}
                    onClick={() => setAudioSource('upload')}
                    disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                  >
                    Upload File
                  </Button>
                  <Button
                    size="sm"
                    variant={audioSource === 'click' ? 'default' : 'outline'}
                    onClick={() => {
                      setAudioSource('click');
                      setAudioFile(null);
                      if (audioInputRef.current) {
                        audioInputRef.current.value = '';
                      }
                    }}
                    disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                  >
                    Click Sound
                  </Button>
                  <Button
                    size="sm"
                    variant={audioSource === 'beep' ? 'default' : 'outline'}
                    onClick={() => {
                      setAudioSource('beep');
                      setAudioFile(null);
                      if (audioInputRef.current) {
                        audioInputRef.current.value = '';
                      }
                    }}
                    disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                  >
                    Beep Sound
                  </Button>
                  <Button
                    size="sm"
                    variant={audioSource === 'whoosh' ? 'default' : 'outline'}
                    onClick={() => {
                      setAudioSource('whoosh');
                      setAudioFile(null);
                      if (audioInputRef.current) {
                        audioInputRef.current.value = '';
                      }
                    }}
                    disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                    className="col-span-2"
                  >
                    Whoosh Sound
                  </Button>
                </div>

                {/* Audio File Upload - Only show when 'upload' is selected */}
                {audioSource === 'upload' && (
                  <>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAudioFile(file);
                          console.log(`🎵 Audio file selected: ${file.name}`);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      <Button
                        onClick={() => audioInputRef.current?.click()}
                        disabled={images.length === 0 || isGeneratingGif || isGeneratingVideo}
                        variant="outline"
                        className="w-full"
                      >
                        {audioFile ? `Selected: ${audioFile.name}` : 'Choose Audio File'}
                      </Button>
                      {audioFile && (
                        <Button
                          onClick={() => {
                            setAudioFile(null);
                            if (audioInputRef.current) {
                              audioInputRef.current.value = '';
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-600"
                        >
                          Remove Audio
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      Upload MP3, WAV, or other audio file to add to your video
                    </p>
                  </>
                )}

                {/* Description for pre-built audio */}
                {audioSource === 'click' && (
                  <p className="text-xs text-center text-muted-foreground">
                    Short click sound will play at each frame transition
                  </p>
                )}
                {audioSource === 'beep' && (
                  <p className="text-xs text-center text-muted-foreground">
                    Musical beep (A4 note) will play at each frame transition
                  </p>
                )}
                {audioSource === 'whoosh' && (
                  <p className="text-xs text-center text-muted-foreground">
                    Whoosh sweep sound will play at each frame transition
                  </p>
                )}
              </div>
            )}

            {/* Current Settings Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="text-sm font-semibold">Current Settings</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frames:</span>
                  <span className="font-medium">{validImagesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frame Duration:</span>
                  <span className="font-medium">{frameDuration}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Face Zoom:</span>
                  <span className="font-medium">{zoomLevel}px</span>
                </div>
                {exportFormat === 'video' ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Video FPS:</span>
                    <span className="font-medium">{videoFps}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Animation FPS:</span>
                    <span className="font-medium">{(1000 / frameDuration).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={validImagesCount === 0 || isGeneratingGif || isGeneratingVideo}
              className="w-full h-12 text-lg"
              variant="default"
            >
              {isGeneratingGif ? (
                <>Generating GIF... {gifProgress}%</>
              ) : isGeneratingVideo ? (
                <>Recording Video... {videoProgress}%</>
              ) : (
                <>
                  {exportFormat === 'gif' ? 'Download GIF' : 'Download Video'} ({validImagesCount} frames)
                </>
              )}
            </Button>

            {/* Progress Bar */}
            {(isGeneratingGif || isGeneratingVideo) && (
              <Progress
                value={isGeneratingGif ? gifProgress : videoProgress}
                className="w-full"
              />
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Zoom Change Warning */}
      {images.length > 0 && zoomLevel !== processedWithZoom && (
        <Alert className="w-full max-w-2xl" variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            Zoom level changed!
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
            onClick={() => reprocessWithNewZoom()}
            disabled={isLoading || isGeneratingGif || isGeneratingVideo}
            variant={zoomLevel !== processedWithZoom ? "destructive" : "secondary"}
            className={zoomLevel !== processedWithZoom ? "animate-pulse" : ""}
          >
            {zoomLevel !== processedWithZoom ? 'Reprocess with New Zoom' : 'Reprocess Images'}
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
    </div>
  );
}
