# TimelineController Refactoring Status

## Completed: TimelineDragHandler Module ✓

### Changes Made
1. Created `src/controls/TimelineDragHandler.js` (247 lines)
   - Extracted drag physics calculations
   - Extracted momentum handling (start/stop)
   - Extracted magnetic snap calculations
   - Extracted visual feedback
   - Extracted drag scale updates

2. Updated `TimelineController.js`:
   - Added import for TimelineDragHandler
   - Instantiates drag handler in `init()` method
   - Delegates physics calls to handler via `this.dragHandler`
   - Updated references: `this.dragPhysics` → `this.dragHandler.dragPhysics`

### Integration Status
- ✅ Drag handler instantiated
- ✅ Physics calculations delegated
- ✅ Momentum handling delegated
- ⚠️  **INCOMPLETE**: Duplicate methods still exist in TimelineController
- ⚠️  **INCOMPLETE**: Direct `this.dragPhysics` references need updates

### Next Steps

**Immediate (before testing):**
1. Remove duplicate methods from TimelineController:
   - `updateDragPhysics()` (lines ~2231-2279)
   - `calculateMagneticSnap()` (lines ~2281-2329)
   - `updatePhysicsVisualFeedback()` (lines ~2339-2351)
   - `updateDragScale()` (lines ~2353-2363)

2. Replace remaining `this.dragPhysics` references with `this.dragHandler.dragPhysics`

3. Update `this.calculateMagneticSnap()` call to use handler

**Testing:**
1. Start dev server: `npm run dev`
2. Test timeline dragging behavior
3. Test momentum/scroll physics
4. Verify smooth scroll sensitivity
5. Test magnetic snap behavior

### Line Count Impact

**Before:**
- TimelineController: 2403 lines

**After (Target):**
- TimelineController: ~2100 lines (removed ~300 lines)
- TimelineDragHandler: 247 lines

**Total lines: ~2347** (slight increase due to delegation overhead, but better organized)

### Benefits Gained
- ✅ Separated drag physics into dedicated module
- ✅ Each module now has clear responsibility
- ✅ Easier to test drag physics in isolation
- ✅ Reduces TimelineController complexity

### Pending Issues
1. **Duplicate code**: Original methods not removed yet
2. **Mixed references**: Some code uses `this.dragPhysics`, some uses `this.dragHandler`
3. **Needs cleanup**: Remove old implementations after verification

## Remaining Modules (Future Work)

### 1. TimelineSnapHandler.js (Next)
- Snap position calculations
- Magnetic snap behavior
- First-drag guard logic

### 2. TimelineCameraController.js
- Camera positioning
- Look-at management  
- FOV changes
- Hold-to-pullback behavior

### 3. TimelineImageManager.js
- Image positioning
- Image enlargement
- Year calculations

### 4. TimelineEffects.js
- Vignette effects
- Visual feedback
- Background blur coordination

