# GIF Generation from Aligned Faces

Create animated GIFs from multiple face images with automatic alignment and normalization.

## Features

- **Multiple Image Upload**: Upload multiple images at once
- **Automatic Face Detection**: Detects faces in each image
- **Face Alignment**: Aligns all faces with horizontal eyes, centered positioning
- **GIF Creation**: Combines aligned faces into an animated GIF
- **Progress Tracking**: Real-time progress bar during GIF generation
- **Downloadable Output**: Automatically downloads the generated GIF

## How to Use

### 1. Upload Images

Click the "Upload Images" button and select multiple images containing faces. You can:
- Select multiple files at once using Ctrl/Cmd + Click
- Upload images in batches (click upload multiple times)
- Mix different image formats (JPG, PNG, etc.)

### 2. Review Processed Faces

After upload, each image will be processed:
- ✅ **Green border**: Face detected and aligned successfully
- ❌ **Red border**: Face detection failed
- Each frame shows the aligned face (500x500px)
- Frame number is displayed in the top-left corner
- Original eye angle is shown below each frame

### 3. Manage Your Frames

- **Remove frames**: Click the × button on any frame
- **Clear all**: Click "Clear All" to start over
- **Reorder**: Currently in upload order (can be enhanced)

### 4. Generate GIF

Click the "Generate GIF" button to create your animated GIF:
- Only valid aligned faces are included
- Each frame displays for 500ms (2 FPS)
- Progress bar shows encoding progress
- GIF automatically downloads when complete

## Technical Details

### GIF Settings

```javascript
{
  workers: 2,           // Number of web workers for encoding
  quality: 10,          // Quality (1-30, lower is better)
  width: 500,           // Output width
  height: 500,          // Output height
  delay: 500            // Frame delay in milliseconds
}
```

### Customizing Frame Delay

To change the animation speed, modify the delay in `app/components/FaceDetector.tsx`:

```typescript
gif.addFrame(img.alignedCanvas, { delay: 500 }); // Change 500 to desired ms
```

Common frame rates:
- `delay: 1000` = 1 FPS (slow)
- `delay: 500` = 2 FPS (default)
- `delay: 200` = 5 FPS (medium)
- `delay: 100` = 10 FPS (fast)
- `delay: 50` = 20 FPS (very fast)

### File Size

GIF file size depends on:
- Number of frames
- Quality setting (1-30)
- Image complexity
- Frame delay doesn't affect size

Typical sizes:
- 5 frames: ~200-500 KB
- 10 frames: ~400-800 KB
- 20 frames: ~800-1500 KB

## Use Cases

### Match Cut Sequences

Create smooth transitions between different people:
1. Upload images of different faces
2. All faces are aligned to same eye position
3. Generate GIF for seamless morphing effect

### Time-lapse Face Changes

Show progression over time:
1. Upload photos from different time periods
2. Faces align automatically
3. See changes in a smooth animation

### Character Comparisons

Compare similar-looking people:
1. Upload images of lookalikes or family members
2. Aligned faces make comparison easier
3. Animate to see similarities/differences

### Expression Animation

Animate through different expressions:
1. Upload photos with different facial expressions
2. Alignment keeps the face centered
3. Smooth transition between expressions

## Advanced Usage

### Programmatic GIF Generation

```typescript
import GIF from 'gif.js';
import { alignFaceOnCanvas } from '@/lib/faceAlignment';

async function createGifFromImages(images: HTMLImageElement[]) {
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: 500,
    height: 500,
    workerScript: '/gif.worker.js',
  });

  for (const img of images) {
    const detection = await detectSingleFace(img, { withLandmarks: true });
    if (detection?.landmarks) {
      const aligned = alignFaceOnCanvas(img, detection.landmarks);
      gif.addFrame(aligned, { delay: 500 });
    }
  }

  return new Promise<Blob>((resolve) => {
    gif.on('finished', (blob) => resolve(blob));
    gif.render();
  });
}
```

### Custom Frame Effects

Add custom effects to each frame:

```typescript
gif.addFrame(img.alignedCanvas, {
  delay: 500,
  copy: true,  // Copy canvas data
  dispose: 2   // Disposal method
});
```

### Save to File System (Node.js)

```typescript
import fs from 'fs';

gif.on('finished', (blob) => {
  const buffer = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync('output.gif', buffer);
});
```

## Troubleshooting

### "No face detected" errors

**Problem**: Some images show "No face detected"

**Solutions**:
- Ensure faces are clearly visible
- Try images with better lighting
- Uncheck "Fast Mode" for more accurate detection
- Avoid very small or partially obscured faces

### GIF generation fails

**Problem**: GIF generation progress bar doesn't complete

**Solutions**:
- Check browser console for errors
- Ensure gif.worker.js is in public folder
- Reduce number of frames (try with 5-10 first)
- Try refreshing the page

### Large file sizes

**Problem**: Generated GIF is too large

**Solutions**:
- Reduce number of frames
- Increase quality value (10-20)
- Use fewer unique images
- Consider using shorter delay (removes duplicate frames)

### Slow processing

**Problem**: Image processing takes too long

**Solutions**:
- Enable "Fast Mode" (less accurate but faster)
- Process fewer images at once
- Use smaller source images
- Close other browser tabs

## Browser Compatibility

- ✅ Chrome/Edge (Chromium): Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (iOS 14+)
- ❌ IE11: Not supported

## Dependencies

- **gif.js**: GIF encoding library
- **face-api.js**: Face detection and landmarks
- **Canvas API**: Image manipulation

## Files

- `/app/components/FaceDetector.tsx` - Main component with GIF generation
- `/lib/faceAlignment.ts` - Face alignment utilities
- `/lib/faceapi.ts` - Face detection utilities
- `/public/gif.worker.js` - GIF encoding web worker

## Performance Tips

1. **Process in batches**: Upload 5-10 images at a time
2. **Use fast mode**: Enable for quicker processing
3. **Optimize source images**: Resize large images before upload
4. **Limit frame count**: 10-20 frames is usually sufficient
5. **Close other apps**: GIF encoding is CPU-intensive

## Future Enhancements

Potential features to add:
- [ ] Drag-and-drop reordering of frames
- [ ] Custom frame delays per frame
- [ ] Preview GIF before download
- [ ] Loop count control
- [ ] Reverse animation option
- [ ] Ping-pong animation (forward then backward)
- [ ] Add text overlays
- [ ] Export as MP4 video
- [ ] Batch processing with folders

## See Also

- [Face Detection Setup](./README_FACE_DETECTION.md)
- [Face Alignment](./README_FACE_ALIGNMENT.md)
- [gif.js Documentation](https://github.com/jnordberg/gif.js)
