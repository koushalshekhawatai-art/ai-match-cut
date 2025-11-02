# Quick Start Guide - AI Match Cut GIF & Video Generator

Transform multiple face images into perfectly aligned animated GIFs or Videos!

## Installation Complete ✓

Your project now has:
- ✅ face-api.js for face detection
- ✅ Face alignment utilities
- ✅ gif.js for GIF creation
- ✅ MediaRecorder API for video export
- ✅ All pre-trained models downloaded
- ✅ Complete UI with multi-image support

## How to Use (3 Simple Steps)

### Step 1: Start the Dev Server

```bash
npm run dev
```

Navigate to: `http://localhost:3000/face-detector`

### Step 2: Upload Multiple Images

1. Click "Upload Images"
2. Select 2 or more images with faces
3. Wait for processing (a few seconds per image)

### Step 3: Generate Your GIF or Video

1. Review your aligned faces in the gallery
2. Remove any failed detections (red border)
3. Choose export format:
   - Click "📸 Generate GIF" for animated GIF (universal compatibility)
   - Or click "🎥 Generate Video" for WebM video (smaller file size)
4. Wait for progress bar to complete
5. File downloads automatically!

## What Happens Behind the Scenes

```
Image Upload
    ↓
Face Detection (face-api.js)
    ↓
Calculate Eye Positions
    ↓
Align Face (rotate, scale, center)
    ↓
Store 500x500 Aligned Canvas
    ↓
Repeat for Each Image
    ↓
Combine All Canvases
    ↓
Generate GIF (gif.js)
    ↓
Download!
```

## Example Workflow

### Creating a Match Cut Sequence

1. **Prepare Images**:
   - Find 5-10 images of different people
   - Make sure faces are clearly visible
   - Any image format works (JPG, PNG, etc.)

2. **Upload & Process**:
   - Upload all images at once
   - Check that all have green borders (success)
   - Remove any failed detections

3. **Generate**:
   - Click "Generate GIF"
   - Wait ~5-10 seconds
   - Find `aligned-faces-[timestamp].gif` in Downloads

4. **Use Your GIF**:
   - Share on social media
   - Use in presentations
   - Add to video projects
   - Study face similarities

## Tips for Best Results

### ✅ Do This

- Use clear, well-lit face photos
- Keep faces roughly centered in frame
- Use similar image sizes (helps with consistency)
- Start with 5-10 images (test first!)
- Remove failed detections before generating

### ❌ Avoid This

- Very dark or blurry images
- Profile views or turned faces (frontal works best)
- Sunglasses covering eyes
- Images with multiple faces
- Extremely large files (resize first)

## Customization Options

### Change Animation Speed

Edit `app/components/FaceDetector.tsx` line 172:

```typescript
gif.addFrame(img.alignedCanvas, { delay: 500 }); // milliseconds per frame
```

- Slower: `delay: 1000` (1 second per frame)
- Default: `delay: 500` (0.5 seconds per frame)
- Faster: `delay: 200` (0.2 seconds per frame)

### Change Face Alignment

Edit alignment parameters in `app/components/FaceDetector.tsx` line 80:

```typescript
const alignedCanvas = alignFaceOnCanvas(img, detection.landmarks, {
  canvasSize: 500,        // Change to 600, 800, etc.
  targetEyeDistance: 140, // Default for breathing space (was 200, reduced for better framing)
  scaleFactor: 0.8,       // Use 0.7-0.8 for even more breathing space around face
});
```

### Change GIF Quality

Edit GIF options in `app/components/FaceDetector.tsx` line 161:

```typescript
const gif = new GIF({
  workers: 2,
  quality: 10,  // 1-30 (lower = better quality, larger file)
  width: 500,
  height: 500,
});
```

## Troubleshooting

### Problem: "No face detected"

**Why**: Face detector can't find a face in the image

**Fix**:
1. Try unchecking "Fast Mode"
2. Use a clearer image
3. Make sure face is visible and frontal

### Problem: GIF generation stuck

**Why**: Browser might be busy or worker failed

**Fix**:
1. Check browser console (F12) for errors
2. Refresh the page
3. Try with fewer images (5-10)
4. Make sure `public/gif.worker.js` exists

### Problem: Very large GIF file

**Why**: Many frames + high quality = large file

**Fix**:
1. Use fewer images (10-15 max)
2. Increase quality number to 15-20
3. Reduce canvas size to 400x400

## Project Structure

```
ai-match-cut/
├── app/
│   ├── components/
│   │   └── FaceDetector.tsx      # Main component
│   └── face-detector/
│       └── page.tsx               # Route page
├── lib/
│   ├── faceapi.ts                 # Face detection
│   ├── faceAlignment.ts           # Alignment logic
│   └── faceAlignment.example.ts  # Examples
├── public/
│   ├── models/                    # Face-api models
│   │   ├── face_landmark_68_model-*
│   │   ├── ssd_mobilenetv1_model-*
│   │   └── ...
│   └── gif.worker.js             # GIF encoder worker
└── README_*.md                    # Documentation
```

## Technologies Used

1. **Next.js 16**: React framework
2. **face-api.js**: Face detection & landmarks (TensorFlow.js)
3. **gif.js**: Browser-based GIF encoder
4. **Canvas API**: Image manipulation
5. **TypeScript**: Type safety

## Key Functions

### Face Detection
```typescript
import { detectSingleFace } from '@/lib/faceapi';

const detection = await detectSingleFace(image, {
  withLandmarks: true
});
```

### Face Alignment
```typescript
import { alignFaceOnCanvas } from '@/lib/faceAlignment';

const aligned = alignFaceOnCanvas(image, landmarks, {
  canvasSize: 500,
  targetEyeDistance: 140  // Default - reduced for breathing space
});
```

### GIF Generation
```typescript
import GIF from 'gif.js';

const gif = new GIF({ width: 500, height: 500 });
gif.addFrame(canvas, { delay: 500 });
gif.render();
```

## Next Steps

### Experiment!

1. **Try different faces**: Friends, family, celebrities
2. **Adjust settings**: Speed, quality, size
3. **Create themes**: Same person over time, different people
4. **Share results**: Post your creations!

### Extend the Project

Ideas for enhancement:
- Add frame reordering (drag & drop)
- Add text overlays to frames
- Support video input (extract frames)
- Add filters or effects
- Create MP4 instead of GIF
- Add audio synchronization

## Resources

- [Face Detection Docs](./README_FACE_DETECTION.md)
- [Face Alignment Docs](./README_FACE_ALIGNMENT.md)
- [GIF Generation Docs](./README_GIF_GENERATION.md)
- [face-api.js GitHub](https://github.com/justadudewhohacks/face-api.js)
- [gif.js GitHub](https://github.com/jnordberg/gif.js)

## Getting Help

1. Check browser console for errors (F12)
2. Review the README files
3. Check that all dependencies are installed
4. Verify models are in `public/models/`
5. Ensure `gif.worker.js` is in `public/`

---

**Ready to create amazing face animations? Start the dev server and visit `/face-detector`!**
