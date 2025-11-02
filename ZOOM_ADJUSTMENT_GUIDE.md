# Face Zoom & Framing Adjustment Guide

This guide explains how to control the zoom level and breathing space around aligned faces.

## What Changed

**Previous behavior**: Faces were cropped tightly with eyes 200px apart in a 500x500 canvas (40% of canvas width)

**New behavior**: Faces now have more breathing space with eyes 140px apart (28% of canvas width)

This creates a better frame around the face, showing more context like hair, shoulders, and background.

## Quick Comparison

```
Old (tight crop):        New (breathing space):
Eye distance: 200px      Eye distance: 140px
Zoom: 40%                Zoom: 28%
```

## How to Adjust Zoom Level

### Option 1: Use Default (Recommended)

The default now provides good breathing space:

```typescript
const aligned = alignFaceOnCanvas(image, landmarks);
// Uses: canvasSize: 500, targetEyeDistance: 140
```

### Option 2: Custom Eye Distance

Adjust `targetEyeDistance` to control zoom:

```typescript
const aligned = alignFaceOnCanvas(image, landmarks, {
  canvasSize: 500,
  targetEyeDistance: 100,  // Even more breathing space (loose)
  // targetEyeDistance: 140,  // Default (balanced)
  // targetEyeDistance: 180,  // Medium zoom
  // targetEyeDistance: 200,  // Tight crop (old default)
});
```

### Option 3: Scale Factor

Use `scaleFactor` for fine-tuning without changing eye distance:

```typescript
const aligned = alignFaceOnCanvas(image, landmarks, {
  canvasSize: 500,
  targetEyeDistance: 140,
  scaleFactor: 0.7,  // 70% zoom = more space
  // scaleFactor: 0.8,  // 80% zoom
  // scaleFactor: 1.0,  // 100% zoom (default)
  // scaleFactor: 1.2,  // 120% zoom = tighter crop
});
```

### Option 4: Larger Canvas with Same Eye Distance

Keep face size but increase canvas for more space:

```typescript
const aligned = alignFaceOnCanvas(image, landmarks, {
  canvasSize: 600,           // Larger canvas
  targetEyeDistance: 140,     // Same face size
  targetEyeY: 600 * 0.4,     // Adjust eye position proportionally
});
```

## Recommended Settings for Different Use Cases

### 1. Portrait/Headshot Style (More Context)
```typescript
{
  canvasSize: 500,
  targetEyeDistance: 100,
  scaleFactor: 0.8,
}
// Result: Face with shoulders, hair, and background visible
```

### 2. Balanced (Default - Recommended)
```typescript
{
  canvasSize: 500,
  targetEyeDistance: 140,
  scaleFactor: 1.0,
}
// Result: Good balance of face detail and breathing space
```

### 3. Close-up (Face Details)
```typescript
{
  canvasSize: 500,
  targetEyeDistance: 180,
  scaleFactor: 1.0,
}
// Result: Focus on facial features with minimal background
```

### 4. Tight Crop (Maximum Detail)
```typescript
{
  canvasSize: 500,
  targetEyeDistance: 200,
  scaleFactor: 1.0,
}
// Result: Very tight crop focusing only on face (old default)
```

### 5. Wide Shot (Lots of Context)
```typescript
{
  canvasSize: 600,
  targetEyeDistance: 120,
  scaleFactor: 0.7,
}
// Result: Face with maximum context - shoulders, hair, full background
```

## Update Your Component

To change the zoom level in the FaceDetector component:

**File:** `app/components/FaceDetector.tsx`

**Location:** Around line 80-83

```typescript
const alignedCanvas = alignFaceOnCanvas(img, detection.landmarks, {
  canvasSize: 500,
  // Add your custom settings here:
  targetEyeDistance: 140,  // Adjust this
  scaleFactor: 0.8,        // Or add this
});
```

## Visual Scale Reference

Here's what different settings look like:

```
targetEyeDistance: 100  [====o====]         Very loose, portrait style
targetEyeDistance: 120  [===o===]           Loose, with context
targetEyeDistance: 140  [==o==]             Default (balanced)
targetEyeDistance: 160  [=o=]               Medium-tight
targetEyeDistance: 180  [o]                 Tight
targetEyeDistance: 200  o                   Very tight (old default)

o = face
= = breathing space
```

## Testing Different Zoom Levels

Try this code to generate multiple versions with different zoom levels:

```typescript
const zoomLevels = [100, 120, 140, 160, 180, 200];

zoomLevels.forEach(eyeDistance => {
  const aligned = alignFaceOnCanvas(image, landmarks, {
    canvasSize: 500,
    targetEyeDistance: eyeDistance,
  });

  // Save or display each version
  aligned.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `face-zoom-${eyeDistance}.png`;
    link.click();
  });
});
```

## Common Questions

### Q: Why did the default change from 200 to 140?

**A:** User feedback indicated faces were cropped too tightly, cutting off hair, shoulders, and context. The new default (140px) provides better framing for most use cases, especially for GIFs and videos.

### Q: How do I get the old behavior back?

**A:** Simply set `targetEyeDistance: 200` in your alignment options:

```typescript
const aligned = alignFaceOnCanvas(image, landmarks, {
  canvasSize: 500,
  targetEyeDistance: 200,
});
```

### Q: What's the difference between `targetEyeDistance` and `scaleFactor`?

**A:**
- `targetEyeDistance`: Sets the actual pixel distance between eyes in the output
- `scaleFactor`: Multiplier applied after eye distance scaling (for fine-tuning)

They both affect zoom, but `targetEyeDistance` is more intuitive.

### Q: What happens if I make the canvas smaller?

**A:** Smaller canvas = lower resolution. The face size relative to canvas stays the same:

```typescript
// Same face-to-canvas ratio:
{ canvasSize: 500, targetEyeDistance: 140 }  // 28%
{ canvasSize: 400, targetEyeDistance: 112 }  // 28%
{ canvasSize: 300, targetEyeDistance: 84 }   // 28%
```

### Q: How do I add even more breathing space?

**A:** Combine lower `targetEyeDistance` with `scaleFactor < 1.0`:

```typescript
const aligned = alignFaceOnCanvas(image, landmarks, {
  canvasSize: 500,
  targetEyeDistance: 100,   // Already loose
  scaleFactor: 0.7,         // Make it even looser (70%)
});
```

## Best Practices

1. **For GIFs/Videos**: Use default (140) or lower for better visual flow
2. **For Face Recognition**: Use consistent settings across all faces
3. **For Comparison**: Keep same settings for all images being compared
4. **For Printing**: Use larger canvas (800+) with proportional eye distance
5. **For Web Display**: Default 500x500 @ 140px works great

## Troubleshooting

### Faces still too zoomed in

- Reduce `targetEyeDistance` to 100-120
- Add `scaleFactor: 0.8` or lower
- Increase `canvasSize` to 600 or 800

### Faces too small

- Increase `targetEyeDistance` to 160-180
- Add `scaleFactor: 1.2` or higher
- Check that source images have detectable faces

### Inconsistent sizing in GIF

- Ensure all faces use identical alignment options
- Verify all images are processed successfully
- Check that `useTinyModel` setting is consistent

## See Also

- [Face Alignment Documentation](./README_FACE_ALIGNMENT.md)
- [Quick Start Guide](./QUICK_START.md)
- [GIF Generation Guide](./README_GIF_GENERATION.md)
