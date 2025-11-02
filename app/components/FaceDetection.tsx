'use client';

import { useEffect, useRef, useState } from 'react';
import { loadFaceApiModels, detectAllFaces } from '@/lib/faceapi';
import type * as faceapi from 'face-api.js';

export default function FaceDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string>('');

  // Load face-api models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        await loadFaceApiModels();
        setIsModelsLoaded(true);
      } catch (err) {
        setError('Failed to load face detection models');
        console.error(err);
      }
    };

    loadModels();
  }, []);

  // Start webcam
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Failed to access webcam');
      console.error(err);
    }
  };

  // Stop webcam
  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsDetecting(false);
  };

  // Detect faces in video
  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.width, height: video.height };

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    const detections = await detectAllFaces(video, {
      withLandmarks: true,
      withExpressions: true,
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw detections
      detections.forEach((detection: faceapi.WithFaceLandmarks<faceapi.WithFaceExpressions<faceapi.WithFaceDetection<{}>>>) => {
        const box = detection.detection.box;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw landmarks
        if (detection.landmarks) {
          const landmarks = detection.landmarks.positions;
          ctx.fillStyle = '#ff0000';
          landmarks.forEach((point: faceapi.Point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            ctx.fill();
          });
        }

        // Display expression
        if (detection.expressions) {
          const expressions = detection.expressions.asSortedArray();
          const topExpression = expressions[0];
          ctx.fillStyle = '#00ff00';
          ctx.font = '16px Arial';
          ctx.fillText(
            `${topExpression.expression} (${(topExpression.probability * 100).toFixed(1)}%)`,
            box.x,
            box.y - 10
          );
        }
      });
    }

    if (isDetecting) {
      requestAnimationFrame(detectFaces);
    }
  };

  // Start detection
  const startDetection = async () => {
    await startVideo();
    setIsDetecting(true);
  };

  // Use effect to start detection loop
  useEffect(() => {
    if (isDetecting && videoRef.current) {
      videoRef.current.addEventListener('play', detectFaces);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('play', detectFaces);
      }
    };
  }, [isDetecting, isModelsLoaded]);

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Face Detection Demo</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="relative">
        <video
          ref={videoRef}
          width="640"
          height="480"
          autoPlay
          muted
          className="rounded-lg"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={startDetection}
          disabled={!isModelsLoaded || isDetecting}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isModelsLoaded ? 'Start Detection' : 'Loading models...'}
        </button>
        <button
          onClick={stopVideo}
          disabled={!isDetecting}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stop
        </button>
      </div>

      <div className="text-sm text-gray-600">
        {isModelsLoaded ? '✓ Models loaded' : 'Loading models...'}
      </div>
    </div>
  );
}
