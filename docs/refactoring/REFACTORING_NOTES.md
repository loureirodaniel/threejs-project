# TimelineController Refactoring Plan

## Current State
- `TimelineController.js`: 2403 lines - violates 300-line guideline
- Contains multiple responsibilities mixed together

## Recommended Refactoring Strategy

### Phase 1: Extract Helper Modules

#### 1. `TimelineDragHandler.js` (Drag Physics)
**Responsibilities:**
- Drag physics calculations (`updateDragPhysics`, `updatePhysicsVisualFeedback`)
- Momentum behavior (`startDragMomentum`, `stopDragMomentum`)
- Mouse event handlers for dragging (`onMouseDown`, `onMouseMove`, `onMouseUp`)
- Sensitivity calculations and viewport scaling

**Methods to extract:**
- `updateDragPhysics(deltaX, deltaTime)`
- `updatePhysicsVisualFeedback()`
- `startDragMomentum()`
- `stopDragMomentum()`
- `updateDragScale()`

#### 2. `TimelineSnapHandler.js` (Magnetic Snap)
**Responsibilities:**
- Snap position calculations (`getSnapPositions`)
- Nearest index detection (`getNearestSnapIndex`)
- Snap animation and magnetic behavior
- First-drag guard logic

**Methods to extract:**
- `getSnapPositions()`
- `getNearestSnapIndex(offset)`
- `snapAfterDrag()`
- Magnetic snap calculations
- Drag threshold logic

#### 3. `TimelineCameraController.js` (Camera Management)
**Responsibilities:**
- Camera positioning and transitions
- Look-at management (`updateCameraLookAtForOriginalX`)
- FOV changes
- Hold-to-pullback behavior
- Scene transition animations

**Methods to extract:**
- `updateCameraLookAtForOriginalX(originalImageX)`
- `updateTimelineCameraConfig(config)`
- `startHoldToPullback()`
- `endHoldToPullback()`
- `performOriginalTransition(targetIndex, startConfig, endConfig)`

#### 4. `TimelineImageManager.js` (Image Handling)
**Responsibilities:**
- Image plane positioning (`moveTimelineImages`)
- Image enlargement state
- Image visibility management
- Year calculation (`getCurrentYear`, `updateCurrentYear`)

**Methods to extract:**
- `moveTimelineImages(deltaX)`
- `getEnlargedImage()`
- `isImageCurrentlyEnlarged()`
- `getCurrentYear()`
- `updateCurrentYear()`

#### 5. `TimelineEffects.js` (Visual Effects)
**Responsibilities:**
- Vignette effect updates
- Background blur integration
- Liquid effect management
- Visual feedback

**Methods to extract:**
- `updateTimelineVignette()`
- `getBackgroundOpacity()`
- Haptic feedback methods
- Visual feedback updates

### Phase 2: Refactor Main Controller

The main `TimelineController.js` should become an orchestrator that:
- Coordinates between the extracted modules
- Handles scene transitions
- Manages event listeners
- Provides public API for external systems

### Implementation Notes

1. **Preserve API**: Keep all public methods in the main controller
2. **Composition over Inheritance**: Pass dependencies to helper modules
3. **Event-Driven**: Use existing event bus for communication
4. **Gradual Migration**: Extract one module at a time, test thoroughly

### Benefits

- Each module stays under 300 lines
- Single Responsibility Principle
- Easier to test individual components
- Better code organization
- Reduced cognitive load

### Timeline

- Phase 1 (Helper Modules): 2-3 hours per module
- Phase 2 (Main Controller): 2-3 hours
- Testing and Integration: 3-4 hours
- **Total Estimate**: 1-2 days of focused work

