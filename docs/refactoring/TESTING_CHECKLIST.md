# Testing Checklist for TimelineController Refactoring

## Test Instructions

The dev server is running at **http://localhost:3002/**

Open the application in your browser and test the following behaviors:

## 1. Initial Scene Navigation ✓

### Test: Scroll to Timeline
- [ ] Scroll down to transition from initial scene to timeline
- Expected: Smooth camera transition
- Expected: Timeline scene activates
- Expected: First image (2010) is centered

## 2. Drag Physics Testing

### Test: Slow Drag (High Sensitivity)
- [ ] Drag the timeline slowly with your mouse
- Expected: High sensitivity - small mouse movement = large timeline movement
- Expected: Responsive feel, precise control
- Expected: No jitter or stuttering

### Test: Fast Drag (Low Sensitivity)  
- [ ] Drag the timeline quickly with your mouse
- Expected: Low sensitivity - prevents overshooting
- Expected: Controlled movement even at fast speeds
- Expected: Smooth transitions between sensitivity levels

### Test: Sensitivity Transitions
- [ ] Start dragging slow, speed up mid-drag
- Expected: Sensitivity smoothly decreases
- Expected: No jarring transitions
- Expected: Gradual adjustment to new speed

## 3. Momentum Behavior

### Test: Release During Slow Drag
- [ ] Drag slowly, then release mouse button
- Expected: Momentum continues movement
- Expected: Gradual deceleration (friction)
- Expected: Snaps to nearest image after settling

### Test: Release During Fast Drag
- [ ] Drag quickly, then release mouse button
- Expected: Momentum continues movement (less than slow drag)
- Expected: Controlled deceleration
- Expected: Snaps to nearest image after settling

### Test: Momentum Distance
- [ ] Drag for different distances, then release
- Expected: Longer drags = more momentum
- Expected: Momentum doesn't skip images
- Expected: Smooth snap to final position

## 4. Magnetic Snap Testing

### Test: Slow Drag Near Snap Point
- [ ] Drag slowly near an image snap position
- Expected: Magnetic pull feels smooth and gentle
- Expected: Pull gets stronger as you approach snap point
- Expected: No hard "snapping" during drag (only after release)

### Test: Fast Drag Near Snap Point
- [ ] Drag quickly past a snap point
- Expected: No magnetic effect (too fast)
- Expected: Continues with momentum
- Expected: Less influence from snap

### Test: Dead Zone
- [ ] Drag very close to a snap point
- Expected: Reduced magnetic pull (allows precise positioning)
- Expected: Can position exactly where you want
- Expected: No fighting against the magnetism

## 5. Visual Feedback

### Test: Cursor Changes
- [ ] Move mouse over timeline (in timeline scene)
- Expected: Cursor changes to "grab"

- [ ] Click and hold on timeline
- Expected: Cursor changes to "grabbing"

- [ ] Release mouse
- Expected: Cursor returns to "grab" or default

### Test: Visual Effects
- [ ] Drag across different positions
- Expected: Liquid distortion effect activates on drag
- Expected: Effect appears after actual drag movement starts
- Expected: Effect responds to drag direction and speed

## 6. Timeline Navigation

### Test: Scroll Navigation
- [ ] Use mouse wheel to scroll horizontally on timeline
- Expected: Smooth scrolling through timeline
- Expected: Momentum continues after wheel stops
- Expected: Snaps to nearest image after momentum

### Test: Different Scroll Speeds
- [ ] Scroll slowly with mouse wheel
- Expected: Gentle movement, high sensitivity
- [ ] Scroll quickly with mouse wheel
- Expected: Controlled movement, lower sensitivity

## 7. Image Enlargement During Drag

### Test: Drag with Image Enlarged
- [ ] Click to enlarge an image
- Expected: Image enlarges properly
- [ ] Try to drag while image is enlarged
- Expected: Image closes automatically
- Expected: Drag begins smoothly after close

## 8. Year Updates

### Test: Year Display Updates
- [ ] Drag through timeline
- Expected: Year display updates as images change
- Expected: Correct year displayed for each image position
- Expected: Smooth transitions between years

## 9. Performance Testing

### Test: Smooth Animation
- [ ] Watch during transitions and drags
- Expected: 60fps performance (check with browser dev tools)
- Expected: No frame drops
- Expected: Smooth animations throughout

### Test: Memory Usage
- [ ] Open browser dev tools
- Expected: Stable memory usage
- Expected: No memory leaks during extended use
- Expected: GC happens regularly

## 10. Error Cases

### Test: Edge Cases
- [ ] Drag to very left (first image)
- Expected: Doesn't go past first image
- Expected: Snaps to first position correctly

- [ ] Drag to very right (last image)
- Expected: Doesn't go past last image
- Expected: Snaps to last position correctly

- [ ] Quick multiple drags
- Expected: No conflicts between drag handlers
- Expected: State remains consistent

## Issues to Report

If you find any issues, report:
1. **What you were doing** (drag, scroll, etc.)
2. **What happened** (actual behavior)
3. **What should happen** (expected behavior)
4. **Browser/device info** (Chrome, Safari, etc.)

## Success Criteria

✅ **Refactoring is successful if:**
- All above tests pass
- No regressions from original behavior
- Performance is maintained
- Code is cleaner and more maintainable

## Next Steps After Testing

If tests pass:
1. Mark refactoring as complete
2. Update documentation
3. Optionally extract next module (snap handler)

If tests fail:
1. Identify issues
2. Debug and fix
3. Re-test problematic areas
4. Continue iteration until stable

