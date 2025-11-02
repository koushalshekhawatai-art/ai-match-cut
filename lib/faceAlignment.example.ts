/**
 * Example usage of face alignment functions
 * This file demonstrates how to use the face alignment utilities
 */

import { detectSingleFace } from './faceapi';
import { alignFaceOnCanvas, calculateEyeMetrics, drawEyeMetrics } from './faceAlignment';

/**
 * Example 1: Basic face alignment
 */
export async function basicFaceAlignment(imageElement: HTMLImageElement): Promise<HTMLCanvasElement | null> {
  // Detect face with landmarks
  const detection = await detectSingleFace(imageElement, {
    withLandmarks: true,
  });

  if (!detection || !detection.landmarks) {
    console.error('No face detected');
    return null;
  }

  // Create aligned face canvas (500x500, eyes 140px apart with breathing space)
  const alignedCanvas = alignFaceOnCanvas(imageElement, detection.landmarks);

  return alignedCanvas;
}

/**
 * Example 2: Custom alignment parameters
 */
export async function customFaceAlignment(imageElement: HTMLImageElement): Promise<HTMLCanvasElement | null> {
  const detection = await detectSingleFace(imageElement, {
    withLandmarks: true,
  });

  if (!detection || !detection.landmarks) {
    return null;
  }

  // Create aligned face with custom parameters
  const alignedCanvas = alignFaceOnCanvas(imageElement, detection.landmarks, {
    canvasSize: 600,        // 600x600 canvas
    targetEyeDistance: 250, // Eyes 250px apart
    targetEyeY: 240,        // Eyes at 240px from top (40% of 600)
  });

  return alignedCanvas;
}

/**
 * Example 3: Calculate and display eye metrics
 */
export async function showEyeMetrics(imageElement: HTMLImageElement): Promise<{
  leftEyeCenter: { x: number; y: number };
  rightEyeCenter: { x: number; y: number };
  angle: number;
  distance: number;
} | null> {
  const detection = await detectSingleFace(imageElement, {
    withLandmarks: true,
  });

  if (!detection || !detection.landmarks) {
    return null;
  }

  // Calculate eye metrics
  const metrics = calculateEyeMetrics(detection.landmarks);

  console.log('Eye Metrics:');
  console.log('- Left Eye Center:', metrics.leftEyeCenter);
  console.log('- Right Eye Center:', metrics.rightEyeCenter);
  console.log('- Distance:', metrics.eyeDistance, 'px');
  console.log('- Angle:', (metrics.angle * 180 / Math.PI).toFixed(2), 'degrees');
  console.log('- Center Point:', metrics.centerPoint);

  return {
    leftEyeCenter: metrics.leftEyeCenter,
    rightEyeCenter: metrics.rightEyeCenter,
    angle: metrics.angle,
    distance: metrics.eyeDistance,
  };
}

/**
 * Example 4: Visualize eye metrics on a canvas
 */
export async function visualizeEyeMetrics(
  imageElement: HTMLImageElement,
  canvasElement: HTMLCanvasElement
): Promise<void> {
  const detection = await detectSingleFace(imageElement, {
    withLandmarks: true,
  });

  if (!detection || !detection.landmarks) {
    return;
  }

  // Set canvas size to match image
  canvasElement.width = imageElement.width;
  canvasElement.height = imageElement.height;

  // Draw image on canvas
  const ctx = canvasElement.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(imageElement, 0, 0);

  // Calculate and draw eye metrics
  const metrics = calculateEyeMetrics(detection.landmarks);
  drawEyeMetrics(canvasElement, metrics, '#00ff00');
}

/**
 * Example 5: Batch process multiple faces
 */
export async function alignMultipleFaces(
  images: HTMLImageElement[]
): Promise<HTMLCanvasElement[]> {
  const alignedFaces: HTMLCanvasElement[] = [];

  for (const image of images) {
    const detection = await detectSingleFace(image, {
      withLandmarks: true,
    });

    if (detection && detection.landmarks) {
      const aligned = alignFaceOnCanvas(image, detection.landmarks);
      alignedFaces.push(aligned);
    }
  }

  return alignedFaces;
}

/**
 * Example 6: Save aligned face as blob for download/upload
 */
export async function getAlignedFaceBlob(
  imageElement: HTMLImageElement,
  format: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<Blob | null> {
  const detection = await detectSingleFace(imageElement, {
    withLandmarks: true,
  });

  if (!detection || !detection.landmarks) {
    return null;
  }

  const alignedCanvas = alignFaceOnCanvas(imageElement, detection.landmarks);

  return new Promise((resolve) => {
    alignedCanvas.toBlob((blob) => {
      resolve(blob);
    }, format);
  });
}

/**
 * Example 7: Compare alignment angles
 */
export async function compareFaceAngles(
  image1: HTMLImageElement,
  image2: HTMLImageElement
): Promise<{ angle1: number; angle2: number; difference: number } | null> {
  const detection1 = await detectSingleFace(image1, { withLandmarks: true });
  const detection2 = await detectSingleFace(image2, { withLandmarks: true });

  if (!detection1?.landmarks || !detection2?.landmarks) {
    return null;
  }

  const metrics1 = calculateEyeMetrics(detection1.landmarks);
  const metrics2 = calculateEyeMetrics(detection2.landmarks);

  const angle1Deg = (metrics1.angle * 180) / Math.PI;
  const angle2Deg = (metrics2.angle * 180) / Math.PI;
  const difference = Math.abs(angle1Deg - angle2Deg);

  return {
    angle1: angle1Deg,
    angle2: angle2Deg,
    difference,
  };
}
