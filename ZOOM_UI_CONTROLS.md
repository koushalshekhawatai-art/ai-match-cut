# Zoom UI Controls - User Guide

The Face Detector now includes interactive zoom controls, allowing you to adjust how close-up or wide the aligned faces appear.

## UI Components

### 1. Zoom Level Slider

A horizontal slider that lets you smoothly adjust zoom from loose (80px) to tight (240px).

**Location:** Below the "Use Fast Mode" checkbox

**Range:**
- Minimum: 80px (very wide, lots of breathing space)
- Maximum: 240px (very tight crop)
- Step: 10px increments
- Default: 140px (balanced)

### 2. Preset Buttons

Six quick-select buttons for common zoom levels:

| Preset | Value | Description |
|--------|-------|-------------|
| **Wide** | 100px | Maximum breathing space - shows shoulders, hair, background |
| **Loose** | 120px | Generous framing with good context |
| **Default** | 140px | Recommended - balanced face and space |
| **Medium** | 160px | Closer crop, less background |
| **Close** | 180px | Tight crop focusing on face |
| **Tight** | 200px | Very tight crop, maximum face detail |

### 3. Current Value Display

A small badge showing the current zoom value in pixels (e.g., "140px")

### 4. Reprocess Button

After uploading images, you can change the zoom level and click **"🔄 Reprocess with New Zoom"** to re-align all existing images with the new setting.

## How to Use

### Before Upload

1. **Adjust the slider** to your desired zoom level
2. **Or click a preset** button for quick selection
3. Upload your images - they'll be processed with the selected zoom

### After Upload

1. **Change the zoom** using the slider or preset buttons
2. Click **"🔄 Reprocess with New Zoom"**
3. Wait for processing - all images will be re-aligned
4. Generate your GIF with the new zoom level

## Visual Guide

```
80-100px:   Wide Shot
[              😊              ]
Much breathing space, shows shoulders

120-140px:  Balanced (Default)
[          😊          ]
Good balance of face and context

160-180px:  Close-up
[      😊      ]
Focused on face, minimal background

200-240px:  Tight Crop
[  😊  ]
Maximum face detail, cropped tight
```

## Tips for Choosing Zoom Level

### Use Wide/Loose (80-120px) when:
- Creating cinematic match cuts
- Want to show facial expressions AND body language
- Images have interesting backgrounds
- Making a photo montage

### Use Default (140px) when:
- General purpose face GIFs
- Unsure what zoom to use
- Want balanced results
- Mixing different face orientations

### Use Medium/Close (160-180px) when:
- Focusing on facial features
- Doing face comparisons
- Creating tight portrait sequences
- Source images have faces at different distances

### Use Tight (200-240px) when:
- Maximum detail on facial features
- Doing expression analysis
- Creating dramatic close-ups
- All faces are already at similar distances

## Workflow Examples

### Example 1: Testing Different Zoom Levels

1. Upload 3-5 test images
2. Generate GIF with default (140px)
3. Adjust slider to 100px
4. Click "Reprocess with New Zoom"
5. Generate new GIF to compare
6. Repeat with different values to find your preference

### Example 2: Creating a Match Cut Sequence

1. Set zoom to **100px (Wide)**
2. Upload 8-10 images of different people
3. All faces align with maximum breathing space
4. Generate GIF for smooth transitions
5. Perfect for video editing match cuts!

### Example 3: Face Comparison GIF

1. Set zoom to **160px (Medium)**
2. Upload images of people you want to compare
3. Reprocess if needed
4. Generate GIF showing similarities/differences

## Technical Details

### What the Zoom Value Means

The zoom value represents the **pixel distance between the eyes** in the final 500x500px canvas:

- **80px** = eyes are 16% of canvas width (very small face)
- **140px** = eyes are 28% of canvas width (default)
- **200px** = eyes are 40% of canvas width (large face)

### How Reprocessing Works

When you click "Reprocess with New Zoom":
1. Original images are still stored in memory
2. Face detection runs again (same landmarks)
3. Alignment is recalculated with new zoom
4. Canvases are regenerated
5. No need to re-upload images!

### Performance

- **Slider adjustment**: Instant (just updates state)
- **Reprocessing**: 1-3 seconds per image
- **GIF generation**: Independent of zoom level

## Keyboard Shortcuts

While the slider is focused:
- **Arrow Left/Right**: Adjust by 10px
- **Page Up/Down**: Adjust by 50px
- **Home**: Set to minimum (80px)
- **End**: Set to maximum (240px)

## Troubleshooting

### Faces still look too zoomed in

- Move slider to the left (lower values)
- Try 80-100px range
- Click "Wide" preset button
- Check that images uploaded successfully

### Faces are too small

- Move slider to the right (higher values)
- Try 180-220px range
- Click "Close" or "Tight" preset
- Ensure source images have clear faces

### Reprocess button not working

- Check browser console for errors
- Ensure images loaded successfully
- Try clearing and re-uploading images
- Refresh the page if needed

### Inconsistent results

- Use same zoom level for all images
- Reprocess all images after changing zoom
- Ensure "Use Fast Mode" is consistent
- Check that all faces were detected

## Best Practices

1. **Start with default (140px)** - works for most cases
2. **Test with 2-3 images first** - find your preferred zoom
3. **Use reprocess feature** - no need to re-upload
4. **Keep zoom consistent** - for smooth GIF transitions
5. **Lower for variety** - if faces are at different distances in sources
6. **Higher for consistency** - if all source faces are similar distance

## Integration with Other Features

### With Fast Mode
- Fast mode + any zoom = faster processing
- Accuracy same as standard mode, just quicker detection

### With GIF Generation
- Zoom doesn't affect GIF file size
- Only affects visual framing
- Can generate multiple GIFs with different zooms from same images

### With Multi-Image Upload
- Set zoom before uploading multiple files
- Or reprocess all at once after upload
- All images use same zoom for consistency

## See Also

- [Zoom Adjustment Guide](./ZOOM_ADJUSTMENT_GUIDE.md) - Programmatic zoom control
- [Quick Start Guide](./QUICK_START.md) - General usage
- [GIF Generation Guide](./README_GIF_GENERATION.md) - Creating GIFs
