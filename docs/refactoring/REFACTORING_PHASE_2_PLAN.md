# TimelineController Refactoring - Phase 2 Plan

## Current Status ✅
- 4 modules extracted (Drag, Snap, Camera, Image)
- TimelineController: 2030 lines (from 2403)
- 15.5% reduction achieved
- All modules working with zero linter errors

## Phase 2 Goals 🎯

Extract 3 additional modules to further reduce TimelineController:
1. **TimelineEffects** (~350 lines)
2. **TimelineEventHandler** (~400 lines)  
3. **TimelineSceneController** (~150 lines)

**Target**: Reduce TimelineController to ~1000-1200 lines

## Phase 2 Extractions

### 1. TimelineEffects.js (~350 lines)
**Extract from TimelineController**:
- `triggerHapticFeedback()` - ~75 lines
- `triggerIOSHaptic()` - ~35 lines
- `triggerAudioFeedback()` - ~40 lines
- `tryAlternativeHaptic()` - ~20 lines
- `checkDeviceCapabilities()` - ~50 lines
- `showHapticIndicator()` - ~40 lines
- `updateTimelineVignette()` - ~40 lines
- `addCloseButton()` - ~60 lines
- `removeCloseButton()` - ~15 lines
- `addBackgroundOverlay()` - ~30 lines
- `getBackgroundOpacity()` - ~10 lines

**Benefits**:
- Isolates haptic/audio logic
- Centralizes UI effect management
- Easier to test feedback systems
- Better separation of concerns

### 2. TimelineEventHandler.js (~400 lines)
**Extract from TimelineController**:
- `onClick()` - ~80 lines (image enlargement)
- `onKeyDown()` - ~10 lines (Escape key)
- `onScroll()` - ~50 lines (scroll handling)
- `onMouseDown()` - ~75 lines (drag start)
- `onMouseEnter()` - ~5 lines (cursor change)
- `onMouseMove()` - ~120 lines (drag move)
- `onMouseUp()` - ~85 lines (drag end)
- Touch event handlers - ~30 lines

**Benefits**:
- Cleaner event coordination
- Centralized input handling
- Easier to add new events
- Better testability of event logic

### 3. TimelineSceneController.js (~150 lines)
**Extract from TimelineController**:
- `transitionToScene()` - ~30 lines
- `performOriginalTransition()` - ~20 lines
- `activateTimelineScene()` - ~60 lines
- `update()` - ~40 lines
- `onTransitionComplete()` - ~15 lines
- `onSceneChange()` - ~15 lines

**Benefits**:
- Isolated scene transition logic
- Cleaner timeline activation
- Better camera transition management
- Clearer state management

## Expected Results

### After Phase 2
```
TimelineController.js:          ~1130 lines (orchestrator)
TimelineDragHandler.js:           302 lines
TimelineSnapHandler.js:           249 lines
TimelineCameraController.js:      261 lines
TimelineImageManager.js:           453 lines
TimelineEffects.js:              ~350 lines (NEW)
TimelineEventHandler.js:         ~400 lines (NEW)
TimelineSceneController.js:      ~150 lines (NEW)
Total:                          ~3295 lines
```

### Metrics
- Main controller: 2403 → ~1130 lines (53% reduction!)
- 7 specialized modules
- Average module size: ~470 lines
- Much better code organization
- Significantly improved maintainability

## Implementation Strategy

1. **Create TimelineEffects.js first** - Extract all feedback/UI effects
2. **Create TimelineEventHandler.js** - Extract all event handlers
3. **Create TimelineSceneController.js** - Extract scene transition logic
4. **Update TimelineController** - Replace implementations with delegation
5. **Test thoroughly** - Ensure all functionality works
6. **Remove legacy code** - Clean up duplicates

## Timeline

- **Phase 2A**: Extract TimelineEffects (~30 min)
- **Phase 2B**: Extract TimelineEventHandler (~30 min)
- **Phase 2C**: Extract TimelineSceneController (~20 min)
- **Phase 2D**: Update TimelineController (~20 min)
- **Phase 2E**: Testing & cleanup (~20 min)

**Total estimated time**: ~2 hours

## Success Criteria

- ✅ TimelineController under 1200 lines
- ✅ 7 total modules
- ✅ Each module under 500 lines
- ✅ Zero linter errors
- ✅ All functionality working
- ✅ Better code organization
- ✅ Improved maintainability

