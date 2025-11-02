# Zoom Controls Troubleshooting Guide

## How Zoom Controls Work

The zoom controls DO NOT automatically re-align images when you change the slider or click preset buttons. This is by design to avoid re-processing images unnecessarily.

### The Workflow:

1. **Set zoom BEFORE uploading** (recommended):
   - Adjust slider or click preset button
   - Upload your images
   - All images will be processed with the selected zoom level

2. **Change zoom AFTER uploading** (requires reprocessing):
   - Upload images (processed with current zoom)
   - Adjust slider or click preset button
   - **Click the "🔄 Reprocess with New Zoom!" button**
   - All images will be re-aligned with the new zoom level

## Visual Indicators

### When Zoom Changes

After you upload images and then change the zoom:

1. **Yellow Warning Banner** appears:
   ```
   ⚠️ Zoom level changed!
   Images were processed with 140px, but zoom is now 100px.
   Click "Reprocess" to apply the new zoom level.
   ```

2. **Reprocess Button** changes:
   - Turns **orange** and **pulses**
   - Text changes to "🔄 Reprocess with New Zoom!"
   - This makes it very obvious you need to click it

3. **Current zoom value** updates in the badge (e.g., "100px")

## Console Logging (For Debugging)

Open your browser's Developer Console (F12) to see detailed logs:

### When you change zoom:
```
🔍 Zoom changed from 140px to 100px
⚠️ You have 4 images. Click "Reprocess" to apply new zoom.
```

### When you upload images:
```
Processing image 1...
✅ Image 1 processed successfully
...
```

### When you reprocess:
```
🔄 Reprocessing 4 images with zoom level: 100px
🔍 Reprocessing image 1...
✅ Image 1 reprocessed successfully
...
✅ Reprocessing complete! Updated 4 images
```

## Common Issues & Solutions

### Issue 1: "Slider moves but images don't change"

**This is normal!** You need to click the "Reprocess" button.

**Solution:**
1. Look for the orange pulsing button
2. Look for the yellow warning banner
3. Click "🔄 Reprocess with New Zoom!"

### Issue 2: "Reprocess button doesn't seem to work"

**Check these:**
1. Open browser console (F12) - look for error messages
2. Make sure images were uploaded successfully (green borders)
3. Check that you're not clicking while images are loading
4. Look for console logs starting with 🔄

**Debugging steps:**
```javascript
// Open console and check:
1. Do you see "🔄 Reprocessing X images..."?
   - YES: Function is running
   - NO: Button click might not be working

2. Do you see "✅ Image X reprocessed successfully"?
   - YES: Reprocessing is working
   - NO: Check for error messages

3. Do you see "✅ Reprocessing complete!"?
   - YES: Should see updated images
   - NO: Process failed, check errors
```

### Issue 3: "Images look the same after reprocessing"

**Possible causes:**

1. **Zoom change is too small** - Try a bigger difference:
   - Change from 140px to 100px (very noticeable)
   - Not from 140px to 150px (subtle)

2. **React not re-rendering** - Each image gets a new ID on reprocess to force re-render
   - Check console for "Image X reprocessed successfully"
   - Try removing one image and reprocessing rest

3. **Cache issue** - Hard refresh:
   - Press Ctrl+Shift+R (Windows/Linux)
   - Press Cmd+Shift+R (Mac)

### Issue 4: "Warning banner doesn't appear"

**Check that:**
1. You uploaded images first
2. You changed the zoom slider/preset AFTER upload
3. Images are visible in the gallery

**Technical check:**
- Images were processed with zoom X
- Current zoom slider shows Y
- If X ≠ Y, banner should appear

### Issue 5: "Console shows errors"

**Common errors and fixes:**

**Error:** `Failed to execute 'drawImage' on 'CanvasRenderingContext2D'`
- **Cause:** Image failed to load
- **Fix:** Check that images uploaded successfully (green border)

**Error:** `No face detected`
- **Cause:** Face detector can't find face in image
- **Fix:** Use clearer images with visible faces
- **Try:** Uncheck "Fast Mode" for better detection

**Error:** `Cannot read properties of null`
- **Cause:** Canvas or context is null
- **Fix:** Refresh page and try again

## Testing the Zoom Controls

### Quick Test:

1. **Upload 2-3 test images**
2. **Check console** - should see processing logs
3. **Change zoom to 100px** - should see warning banner
4. **Click orange "Reprocess" button**
5. **Check console** - should see reprocessing logs
6. **Look at images** - faces should be smaller (more breathing space)

### Visual Comparison Test:

```
Before (140px):        After (100px):
┌────────────┐        ┌────────────┐
│   😊       │        │            │
│  face      │        │   😊       │
│  close     │        │  face far  │
└────────────┘        └────────────┘
```

## Expected Behavior Summary

| Action | What Happens | Visual Change |
|--------|-------------|---------------|
| Move slider | Number badge updates | Immediate |
| Click preset | Number badge updates | Immediate |
| Upload images | Images processed with current zoom | Shows aligned faces |
| Change zoom (after upload) | Warning appears, button turns orange | No change to images yet |
| Click Reprocess | Console logs, images re-align | Faces resize according to new zoom |

## Advanced Debugging

### Check State in Console:

While on the page, open console and type:
```javascript
// This won't work directly, but you can add a debug button
// Or check React DevTools
```

### React DevTools:

1. Install React DevTools browser extension
2. Open Components tab
3. Find `FaceDetector` component
4. Check state values:
   - `zoomLevel` - current slider value
   - `processedWithZoom` - zoom used for current images
   - `images` - array of processed images

### Network Tab:

Check if model files are loading:
1. Open DevTools > Network tab
2. Look for requests to `/models/`
3. Should see weight files being loaded
4. Check for any failed requests (red)

## If Nothing Works

### Nuclear Option (Reset Everything):

1. **Clear all images** - Click "Clear All"
2. **Refresh page** - Press F5
3. **Set zoom to 100px** - Before uploading
4. **Upload 1 test image** - Just one
5. **Check console** - Look for any errors
6. **Check image** - Should show face with breathing space

### Report an Issue:

If still not working, provide:
1. Browser and version
2. Screenshot of console logs
3. Screenshot of UI
4. Description of what you tried
5. Sample image (if possible)

## Understanding the Code

The zoom controls update state immediately, but images are only re-aligned when:
1. **New images uploaded** - uses current `zoomLevel`
2. **Reprocess clicked** - re-aligns existing images with current `zoomLevel`

This two-step process prevents expensive reprocessing on every slider movement.

## Tips for Best Experience

1. **Decide on zoom before upload** - Faster workflow
2. **Use console for debugging** - Shows exactly what's happening
3. **Test with 2-3 images first** - Don't upload 20 images for testing
4. **Try extreme values** - 100px vs 200px to see clear difference
5. **Be patient** - Reprocessing takes 1-3 seconds per image

## See Also

- [Zoom UI Controls Guide](./ZOOM_UI_CONTROLS.md) - General usage
- [Zoom Adjustment Guide](./ZOOM_ADJUSTMENT_GUIDE.md) - Technical details
- [Quick Start Guide](./QUICK_START.md) - General app usage
