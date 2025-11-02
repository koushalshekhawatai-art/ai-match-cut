# Face Alignment

A utility for aligning faces in images based on eye positions. This creates normalized face images with horizontally aligned eyes at a fixed distance, perfect for face recognition, analysis, or comparison tasks.

## Features

- **Eye Detection**: Automatically finds left and right eye centers from facial landmarks
- **Angle Calculation**: Calculates the rotation angle between eyes
- **Face Normalization**: Rotates, scales, and centers faces to create consistent outputs
- **Configurable Output**: Customizable canvas size, eye distance, and positioning

## Core Functions

### `calculateEyeMetrics(landmarks)`

Calculates eye positions, angle, distance, and center point from face landmarks.

```typescript
import { calculateEyeMetrics } from '@/lib/faceAlignment';

const metrics = calculateEyeMetrics(detection.landmarks);
console.log(metrics);
// {
//   leftEyeCenter: { x: 150, y: 200 },
//   rightEyeCenter: { x: 250, y: 205 },
//   eyeDistance: 100.5,
//   angle: 0.049 (radians),
//   centerPoint: { x: 200, y: 202.5 }
// }
```

### `alignFaceOnCanvas(image, landmarks, options)`

Creates an aligned face image on a canvas with normalized eye positions.

```typescript
import { alignFaceOnCanvas } from '@/lib/faceAlignment';

const alignedCanvas = alignFaceOnCanvas(imageElement, detection.landmarks, {
  canvasSize: 500,        // Output canvas size (500x500)
  targetEyeDistance: 140, // Eyes will be 140px apart (default, reduced for breathing space)
  targetEyeY: 200,        // Eyes positioned 200px from top (40% of canvas)
  scaleFactor: 1.0,       // Additional zoom control (0.7-0.8 for even more space)
});

// Use the canvas
document.body.appendChild(alignedCanvas);
```

**Options:**
- `canvasSize` (default: 500) - Size of the square output canvas
- `targetEyeDistance` (default: 140) - Desired pixel distance between eyes (reduced for breathing space)
- `targetEyeY` (default: 40% of canvas) - Vertical position of eyes
- `scaleFactor` (default: 1.0) - Additional zoom control; use 0.7-0.8 for more breathing space

### `drawEyeMetrics(canvas, metrics, color)`

Draws visualization of eye metrics on a canvas (for debugging/visualization).

```typescript
import { drawEyeMetrics } from '@/lib/faceAlignment';

drawEyeMetrics(canvasElement, metrics, '#00ff00');
// Draws:
// - Line between eye centers
// - Dots at eye centers
// - Center point marker
// - Angle and distance text
```

## How It Works

The alignment process involves several mathematical transformations:

1. **Eye Detection**: Find the center points of both eyes from the 68-point facial landmarks
   - Left eye: landmarks 36-41
   - Right eye: landmarks 42-47

2. **Metric Calculation**:
   - Distance: `√((x₂-x₁)² + (y₂-y₁)²)`
   - Angle: `atan2(dy, dx)`
   - Center: `((x₁+x₂)/2, (y₁+y₂)/2)`

3. **Canvas Transformations** (in order):
   - Translate to target center position
   - Rotate by negative angle (to make eyes horizontal)
   - Scale to achieve target eye distance
   - Translate to center the face
   - Draw the image

## Usage Examples

### Basic Face Alignment

```typescript
import { loadFaceApiModels, detectSingleFace } from '@/lib/faceapi';
import { alignFaceOnCanvas } from '@/lib/faceAlignment';

// Load models first
await loadFaceApiModels();

// Detect face
const detection = await detectSingleFace(imageElement, {
  withLandmarks: true,
});

if (detection?.landmarks) {
  // Create aligned face (default: 500x500, 140px eye distance for breathing space)
  const alignedCanvas = alignFaceOnCanvas(imageElement, detection.landmarks);

  // Use the canvas
  document.body.appendChild(alignedCanvas);
}
```

### Custom Alignment Parameters

```typescript
// Larger output with wider eye spacing
const alignedCanvas = alignFaceOnCanvas(imageElement, detection.landmarks, {
  canvasSize: 800,
  targetEyeDistance: 300,
  targetEyeY: 320, // 40% of 800
});
```

### Get Eye Angle and Distance

```typescript
import { calculateEyeMetrics } from '@/lib/faceAlignment';

const metrics = calculateEyeMetrics(detection.landmarks);
const angleDegrees = (metrics.angle * 180) / Math.PI;

console.log(`Eyes are tilted ${angleDegrees.toFixed(2)}° from horizontal`);
console.log(`Eye distance: ${metrics.eyeDistance.toFixed(1)} pixels`);
```

### Save Aligned Face as Image

```typescript
const alignedCanvas = alignFaceOnCanvas(imageElement, detection.landmarks);

alignedCanvas.toBlob((blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'aligned-face.png';
  link.click();
}, 'image/png');
```

### Compare Two Faces

```typescript
// Align both faces with same parameters
const options = {
  canvasSize: 500,
  targetEyeDistance: 140, // Use default for consistency
};

const face1 = alignFaceOnCanvas(image1, landmarks1, options);
const face2 = alignFaceOnCanvas(image2, landmarks2, options);

// Now faces are normalized and can be compared directly
```

## Visual Output

When you use the FaceDetector component (`/face-detector` route), you'll see:

1. **Original Image (left)**:
   - Green bounding box around face
   - Red dots on eye landmark points
   - Yellow dots at eye centers
   - Cyan line connecting eyes with angle/distance info

2. **Aligned Face (right)**:
   - 500x500 square canvas
   - Face rotated so eyes are horizontal
   - Eyes centered at 40% from top
   - Eyes exactly 200px apart
   - White background

## Use Cases

- **Face Recognition**: Normalize faces before feature extraction
- **Face Comparison**: Align multiple faces for visual comparison
- **Dataset Preparation**: Create consistent face images for ML training
- **Face Analysis**: Study facial features with consistent positioning
- **Match Cuts**: Compare faces from different video frames

## Technical Details

### Coordinate System
- Origin (0,0) is at top-left
- X increases to the right
- Y increases downward
- Angles are in radians (use `* 180 / Math.PI` for degrees)

### Canvas Transformations
The alignment uses HTML5 Canvas 2D transformation matrix:
1. `translate(targetX, targetY)` - Move origin to where face center should be
2. `rotate(-angle)` - Counter-rotate to make eyes horizontal
3. `scale(factor, factor)` - Resize to target eye distance
4. `translate(-centerX, -centerY)` - Move face center to origin

### Performance
- Eye metric calculation: ~1ms
- Canvas alignment: ~5-10ms (depends on image size)
- Total alignment time: <100ms for typical images

## Files

- `/lib/faceAlignment.ts` - Core alignment functions
- `/lib/faceAlignment.example.ts` - Usage examples
- `/app/components/FaceDetector.tsx` - React component with UI

## See Also

- [Face Detection Setup](./README_FACE_DETECTION.md)
- [face-api.js Documentation](https://justadudewhohacks.github.io/face-api.js/docs/index.html)
