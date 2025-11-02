# Face Detection Setup

This project now includes face detection capabilities using face-api.js.

## What was installed

1. **face-api.js** - A JavaScript face detection and recognition library
2. **Pre-trained models** - Downloaded to `/public/models/` directory
3. **Utility functions** - Created in `/lib/faceapi.ts`
4. **Example component** - Available in `/app/components/FaceDetection.tsx`

## Installed Models

The following pre-trained models are available in `/public/models/`:

- **tiny_face_detector** - Lightweight face detection model (recommended for real-time)
- **ssd_mobilenetv1** - More accurate face detector (slower)
- **face_landmark_68** - 68-point facial landmark detection
- **face_recognition** - Face embeddings for recognition tasks
- **face_expression** - Emotion/expression detection (happy, sad, angry, etc.)

## Usage

### Basic Setup

```typescript
import { loadFaceApiModels, detectAllFaces } from '@/lib/faceapi';

// Load models (call once at app startup)
await loadFaceApiModels();

// Detect faces in an image/video element
const detections = await detectAllFaces(imageElement, {
  withLandmarks: true,
  withExpressions: true,
  withDescriptors: false
});
```

### Available Functions

#### `loadFaceApiModels()`
Loads all face-api models from `/public/models/`. Call this once before using any face detection features.

#### `detectAllFaces(input, options)`
Detects all faces in the given input.

**Parameters:**
- `input`: HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement
- `options`:
  - `withLandmarks`: boolean - Include 68 facial landmarks
  - `withDescriptors`: boolean - Include face descriptors for recognition
  - `withExpressions`: boolean - Include emotion detection

**Returns:** Array of detected faces with requested data

#### `detectSingleFace(input, options)`
Similar to `detectAllFaces` but only returns the first detected face.

#### `areModelsLoaded()`
Check if models have been loaded.

### Example Component

A complete working example is available in `/app/components/FaceDetection.tsx` that demonstrates:
- Real-time face detection from webcam
- Drawing bounding boxes around detected faces
- Displaying facial landmarks
- Showing detected emotions

To use it in your app:

```tsx
import FaceDetection from '@/app/components/FaceDetection';

export default function Page() {
  return <FaceDetection />;
}
```

## Model Details

- **Total size**: ~14.6 MB
- **Location**: `/public/models/`
- **Loading**: Models are loaded from the public directory at runtime

## Advanced Usage

For advanced usage, you can import the face-api namespace directly:

```typescript
import { faceapi } from '@/lib/faceapi';

// Use any face-api.js functionality
const detector = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,
  scoreThreshold: 0.5
});
```

## Resources

- [face-api.js GitHub](https://github.com/justadudewhohacks/face-api.js)
- [face-api.js Documentation](https://justadudewhohacks.github.io/face-api.js/docs/index.html)
