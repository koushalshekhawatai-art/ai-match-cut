# Video Export Guide

Export your aligned face sequences as video files using browser-based video recording.

## Overview

In addition to GIF export, you can now export your aligned faces as **WebM video files**. Videos offer:

- **Smaller file sizes** - Videos are typically 50-80% smaller than GIFs
- **Better quality** - Higher bitrate and modern codecs
- **Longer sequences** - Handle 50+ frames easily
- **Professional use** - Import into video editing software

## Features

### Video Format
- **Codec**: VP9 (WebM container)
- **Resolution**: 500x500 pixels
- **Bitrate**: 5 Mbps
- **Frame Rate**: 30 FPS capture (playback controlled by frame duration)

### Browser Support
- ✅ Chrome/Edge (full support)
- ✅ Firefox (full support)
- ✅ Safari 14.1+ (WebM support)
- ❌ IE11 (not supported)

## How to Use

### Basic Workflow

1. **Upload Images** - Select multiple images with faces
2. **Set Frame Duration** - Adjust animation speed (100ms - 2000ms)
3. **Click "🎥 Generate Video"** - Start video recording
4. **Wait for Progress** - Blue progress bar shows recording status
5. **Auto Download** - Video downloads as `.webm` file

### Frame Duration Control

Located in the purple control panel, the frame duration slider controls how long each face appears:

```
Fast                                    Slow
100ms ─────────●───────────────── 2000ms
```

**Preset Options:**
- **Very Fast** - 200ms (5 FPS) - Quick transitions
- **Fast** - 333ms (3 FPS) - Smooth animations
- **Default** - 500ms (2 FPS) - Balanced timing
- **Slow** - 1000ms (1 FPS) - Deliberate pacing

## Comparison: GIF vs Video

| Feature | GIF | Video (WebM) |
|---------|-----|--------------|
| **File Size** | Larger (1-5 MB) | Smaller (200 KB - 2 MB) |
| **Quality** | Limited colors | Full color |
| **Compatibility** | Universal | Modern browsers |
| **Looping** | Automatic | Player-dependent |
| **Editing** | Limited | Full video tools |
| **Social Media** | Wide support | Growing support |

### When to Use GIF

- Embedding in websites/emails
- Maximum compatibility needed
- Auto-looping required
- Short sequences (5-15 frames)
- Social media posts (Twitter, Reddit)

### When to Use Video

- Longer sequences (20+ frames)
- Professional editing workflow
- File size is a concern
- Best quality needed
- Modern platforms (YouTube, Vimeo)

## Technical Details

### Video Recording Process

1. **Create virtual canvas** - 500x500px rendering surface
2. **Capture stream** - 30 FPS canvas stream via MediaRecorder API
3. **Render frames** - Draw each aligned face sequentially
4. **Timing control** - Use frame duration to control playback speed
5. **Encode** - VP9 codec encodes in real-time
6. **Save** - Download as WebM file

### Frame Duration vs Recording

- **Frame Duration**: Controls how long each face appears in playback
- **Capture Rate**: Fixed at 30 FPS for smooth recording
- **Example**:
  - 10 frames at 500ms each = 5 second video
  - Captured at 30 FPS = 150 total video frames
  - Each aligned face repeats for 15 video frames

### File Size Estimates

Based on 500x500px @ 5 Mbps bitrate:

| Frames | Duration (500ms/frame) | Approx. Size |
|--------|------------------------|--------------|
| 5      | 2.5 seconds           | ~1.5 MB      |
| 10     | 5 seconds             | ~3 MB        |
| 20     | 10 seconds            | ~6 MB        |
| 50     | 25 seconds            | ~15 MB       |

*Actual sizes vary based on image complexity*

## Advanced Usage

### Custom Settings

The video recording uses these default settings:

```typescript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 5000000, // 5 Mbps
});
```

### Converting WebM to MP4

WebM files can be converted to MP4 using:

**FFmpeg (Command Line):**
```bash
ffmpeg -i aligned-faces.webm -c:v libx264 -preset slow -crf 22 aligned-faces.mp4
```

**Online Tools:**
- CloudConvert (https://cloudconvert.com)
- Online-Convert (https://www.online-convert.com)
- Convertio (https://convertio.co)

**Desktop Software:**
- HandBrake (free, cross-platform)
- VLC Media Player (free, convert via File > Convert)
- Adobe Media Encoder (professional)

### Importing into Video Editors

**Premiere Pro:**
1. Import WebM directly (2019+)
2. Or convert to MP4 first for older versions

**Final Cut Pro:**
1. Convert to ProRes or H.264/MP4
2. Use Compressor or FFmpeg

**DaVinci Resolve:**
1. Import WebM directly (v16+)
2. Works with free version

**iMovie:**
1. Convert to MP4 or MOV first
2. Use HandBrake or QuickTime conversion

## Troubleshooting

### Video won't generate

**Possible causes:**
1. **Browser not supported** - Check browser compatibility
2. **MediaRecorder API blocked** - Check permissions
3. **No valid frames** - Ensure faces were detected successfully

**Solutions:**
- Try Chrome or Firefox (best support)
- Check browser console for errors (F12)
- Ensure at least one image has green border (valid detection)

### Video file is corrupted

**Symptoms:**
- Won't play in media player
- 0 KB file size
- Download interrupted

**Solutions:**
- Let recording complete fully (watch progress bar)
- Don't close tab during recording
- Check disk space
- Try shorter sequence first (5-10 frames)

### Video plays too fast/slow

**This is normal!** The frame duration slider controls playback speed:

- **Too Fast**: Increase frame duration (move slider right)
- **Too Slow**: Decrease frame duration (move slider left)
- **Regenerate**: Click "Generate Video" again with new duration

### File size is too large

**Reduce size by:**
1. Using fewer frames (remove some images)
2. Shorter frame duration = shorter total video
3. Convert to MP4 with higher compression
4. Consider using GIF for very short sequences

### Browser shows "can't play video"

**Codec issues:**
- Update browser to latest version
- Install WebM codec pack (Windows)
- Convert to MP4 for universal playback
- Use VLC media player (plays everything)

## Console Logging

Monitor video generation in the browser console (F12):

```
🎬 Starting video generation with 10 frames
🎥 Recording started
📹 Rendered frame 1/10
📹 Rendered frame 2/10
...
📹 Rendered frame 10/10
✅ All frames rendered, stopping recorder...
✅ Video recording stopped, creating blob...
✅ Video download started!
```

If you see errors, they'll appear here with details.

## Best Practices

### For Best Quality

1. **Use sufficient frames** - 10-20 minimum for smooth animation
2. **Consistent zoom** - Don't change zoom between images
3. **Good source images** - High quality, clear faces
4. **Appropriate duration** - 333-500ms works well for most cases

### For Smallest Files

1. **Fewer frames** - Remove duplicates or similar images
2. **Shorter duration** - 200-333ms per frame
3. **Convert to MP4** - Usually more efficient than WebM
4. **Consider GIF** - For very short sequences (< 10 frames)

### For Social Media

**Instagram:**
- Convert to MP4
- Use 3:4 or 1:1 aspect ratio (already 1:1!)
- Max 60 seconds

**YouTube:**
- WebM works directly
- Or convert to MP4 for better compatibility
- Add audio track if needed

**Twitter:**
- Convert to MP4
- Max 140 seconds
- GIF may be better for short loops

**TikTok:**
- Convert to MP4
- 9:16 preferred (crop/resize needed)
- Add audio in editor

## Performance Tips

1. **Process in batches** - Don't upload 100 images at once
2. **Close other tabs** - Free up browser memory
3. **Use modern browser** - Chrome/Firefox recommended
4. **Wait for completion** - Don't interrupt recording

## Future Enhancements

Potential features:
- [ ] MP4 export option
- [ ] Custom bitrate control
- [ ] Audio track support
- [ ] Multiple aspect ratios
- [ ] Reverse playback option
- [ ] Export specific frame range

## See Also

- [GIF Generation Guide](./README_GIF_GENERATION.md) - For GIF export
- [Quick Start Guide](./QUICK_START.md) - General usage
- [Zoom Controls](./ZOOM_UI_CONTROLS.md) - Adjusting face zoom
