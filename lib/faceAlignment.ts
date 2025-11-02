import { FaceLandmarks68 } from 'face-api.js';

export interface EyeMetrics {
  leftEyeCenter: { x: number; y: number };
  rightEyeCenter: { x: number; y: number };
  eyeDistance: number;
  angle: number; // in radians
  centerPoint: { x: number; y: number };
}

/**
 * Calculate eye metrics from face landmarks
 */
export function calculateEyeMetrics(landmarks: FaceLandmarks68): EyeMetrics {
  // Get eye landmarks
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  // Calculate center of each eye
  const leftEyeCenter = {
    x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
    y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length,
  };

  const rightEyeCenter = {
    x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
    y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length,
  };

  // Calculate distance between eyes
  const dx = rightEyeCenter.x - leftEyeCenter.x;
  const dy = rightEyeCenter.y - leftEyeCenter.y;
  const eyeDistance = Math.sqrt(dx * dx + dy * dy);

  // Calculate angle of the line between eyes
  // atan2 returns angle in radians from -PI to PI
  const angle = Math.atan2(dy, dx);

  // Calculate center point between eyes
  const centerPoint = {
    x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
    y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
  };

  return {
    leftEyeCenter,
    rightEyeCenter,
    eyeDistance,
    angle,
    centerPoint,
  };
}

export interface AlignFaceOptions {
  canvasSize?: number; // Size of output canvas (default 500)
  targetEyeDistance?: number; // Desired distance between eyes in pixels (default 140)
  targetEyeY?: number; // Y position where eyes should be (default: 40% from top)
  scaleFactor?: number; // Additional scale multiplier for zoom level (default 1.0, use 0.7-0.8 for more breathing space)
}

/**
 * Align a face on a canvas so the eyes are horizontal, centered, and at a fixed distance
 * @param image - The source image element
 * @param landmarks - Face landmarks from face-api.js
 * @param options - Alignment options
 * @returns Canvas element with aligned face
 */
export function alignFaceOnCanvas(
  image: HTMLImageElement,
  landmarks: FaceLandmarks68,
  options: AlignFaceOptions = {}
): HTMLCanvasElement {
  const {
    canvasSize = 500,
    targetEyeDistance = 140, // Reduced from 200 for more breathing space
    targetEyeY = canvasSize * 0.4, // Eyes at 40% from top
    scaleFactor = 1.0, // Additional scale control
  } = options;

  // Calculate eye metrics
  const metrics = calculateEyeMetrics(landmarks);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Calculate scale factor
  // We want the eye distance to be targetEyeDistance pixels, then apply scaleFactor
  const scale = (targetEyeDistance / metrics.eyeDistance) * scaleFactor;

  // Calculate target center point (middle of canvas horizontally, targetEyeY vertically)
  const targetCenter = {
    x: canvasSize / 2,
    y: targetEyeY,
  };

  // Apply transformations
  ctx.save();

  // 1. Translate to target center
  ctx.translate(targetCenter.x, targetCenter.y);

  // 2. Rotate to make eyes horizontal (negative angle to counter-rotate)
  ctx.rotate(-metrics.angle);

  // 3. Scale to desired eye distance with additional scaleFactor
  ctx.scale(scale, scale);

  // 4. Translate so the center point between eyes is at origin
  ctx.translate(-metrics.centerPoint.x, -metrics.centerPoint.y);

  // 5. Draw the image
  ctx.drawImage(image, 0, 0);

  ctx.restore();

  return canvas;
}

/**
 * Draw alignment visualization on a canvas
 * Shows the eye centers, connecting line, and center point
 */
export function drawEyeMetrics(
  canvas: HTMLCanvasElement,
  metrics: EyeMetrics,
  color: string = '#00ff00'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();

  // Draw line between eyes
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(metrics.leftEyeCenter.x, metrics.leftEyeCenter.y);
  ctx.lineTo(metrics.rightEyeCenter.x, metrics.rightEyeCenter.y);
  ctx.stroke();

  // Draw eye centers
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(metrics.leftEyeCenter.x, metrics.leftEyeCenter.y, 5, 0, 2 * Math.PI);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(metrics.rightEyeCenter.x, metrics.rightEyeCenter.y, 5, 0, 2 * Math.PI);
  ctx.fill();

  // Draw center point
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(metrics.centerPoint.x, metrics.centerPoint.y, 7, 0, 2 * Math.PI);
  ctx.fill();

  // Draw angle text
  ctx.fillStyle = color;
  ctx.font = '14px Arial';
  const angleDegrees = (metrics.angle * 180 / Math.PI).toFixed(1);
  ctx.fillText(
    `Angle: ${angleDegrees}°`,
    metrics.centerPoint.x + 20,
    metrics.centerPoint.y - 20
  );
  ctx.fillText(
    `Distance: ${metrics.eyeDistance.toFixed(1)}px`,
    metrics.centerPoint.x + 20,
    metrics.centerPoint.y
  );

  ctx.restore();
}
