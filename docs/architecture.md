# Timeline Venezuela 2025 Architecture

## Overview
This document describes the architecture of Timeline Venezuela 2025, the Three.js-based interactive timeline experience, including folder structure, data management, camera responsibilities, and integration points with Cursor agents.

## Project Structure

```
timeline-venezuela-2025/
├── src/
│   ├── core/                    # Core application logic
│   │   ├── AppStateManager.js   # Central state management
│   │   ├── EventBus.js          # Event communication system
│   │   ├── AppEventHandlers.js  # Event handling logic
│   │   └── AppIntroSequence.js  # Intro animation logic
│   ├── components/              # Reusable UI components
│   │   ├── Button/
│   │   ├── Slider/
│   │   ├── Panel/
│   │   └── Section/
│   ├── features/                # Feature-based modules
│   │   ├── timeline/
│   │   │   ├── TimelineController.js
│   │   │   ├── TimelinePhysics.js
│   │   │   ├── TimelineTransitions.js
│   │   │   └── components/
│   │   ├── camera/
│   │   │   ├── CameraController.js
│   │   │   ├── CameraAnimations.js
│   │   │   └── CameraTransitions.js
│   │   ├── comments/
│   │   │   ├── CommentManager.js
│   │   │   ├── CommentStorage.js
│   │   │   ├── CommentModeration.js
│   │   │   ├── CommentUI.js
│   │   │   └── components/
│   │   │       ├── CommentForm.js
│   │   │       ├── CommentList.js
│   │   │       ├── CommentItem.js
│   │   │       └── CommentModeration.js
│   │   └── effects/
│   │       ├── EffectsManager.js
│   │       └── components/
│   ├── scene/                   # Three.js scene management
│   │   ├── SceneManager.js      # Main scene controller
│   │   ├── Lighting.js          # Lighting setup
│   │   ├── ImagePlanes.js       # Image plane management
│   │   └── TimelineScene.js     # Timeline scene logic
│   ├── ui/                      # User interface
│   │   ├── debug/               # Debug panel sections
│   │   ├── TitleOverlay.js      # Title display
│   │   └── TimelineNavigation.js
│   ├── utils/                   # Utility functions
│   │   ├── helpers.js
│   │   ├── performance.js
│   │   └── validation.js
│   └── App.js                   # Main application entry
├── assets/                      # Static assets
│   ├── images/
│   │   ├── timeline/            # Timeline images by year
│   │   │   ├── 2010/
│   │   │   ├── 2011/
│   │   │   └── ...
│   │   ├── ui/                  # UI images
│   │   └── textures/            # Three.js textures
│   ├── models/                  # 3D models
│   └── audio/                   # Audio files
├── dist/                        # Built application
├── tests/                       # Test files
│   ├── unit/
│   ├── integration/
│   └── visual/
└── docs/                        # Documentation
    ├── api/
    └── guides/
```

## Core Architecture Components

### 1. State Management (`AppStateManager`)
Centralized state management for the entire application.

**Responsibilities:**
- Manage application state (camera, timeline, effects, UI)
- Provide immutable state updates
- Emit state change events
- Handle state persistence

**Key Methods:**
```javascript
getState()                    // Get current state
setState(newState)           // Update state
subscribe(listener)          // Subscribe to changes
updateEffect(effect, props)  // Update specific effect
resetToDefaults()            // Reset to default values
```

### 2. Event System (`EventBus`)
Centralized event communication system.

**Responsibilities:**
- Handle inter-component communication
- Manage event subscriptions
- Provide event logging and debugging
- Support event prioritization

**Key Methods:**
```javascript
on(event, callback)          // Subscribe to event
emit(event, data)           // Emit event
off(event, callback)        // Unsubscribe
once(event, callback)       // Subscribe once
```

### 3. Scene Management (`SceneManager`)
Three.js scene controller and renderer management.

**Responsibilities:**
- Manage Three.js scene, camera, and renderer
- Handle window resize events
- Coordinate scene transitions
- Manage render loop

**Key Methods:**
```javascript
getScene()                  // Get Three.js scene
getCamera()                 // Get Three.js camera
getRenderer()               // Get Three.js renderer
render()                    // Render scene
updateControls()            // Update camera controls
```

## Camera System Architecture

### Camera Controller Hierarchy
```
CameraController (Main)
├── CameraAnimations (Timeline animations)
├── CameraTransitions (Scene transitions)
├── CameraPhysics (User interaction physics)
└── CameraDebug (Debug controls)
```

### Camera Responsibilities

#### 1. CameraController
- **Primary camera management**
- **Coordinate all camera behaviors**
- **Handle camera state synchronization**
- **Manage camera transitions**

#### 2. CameraAnimations
- **Timeline-based camera movements**
- **Keyframe animation system**
- **Easing and interpolation**
- **Animation sequencing**

#### 3. CameraTransitions
- **Scene-to-scene transitions**
- **Smooth camera path generation**
- **Transition interruption handling**
- **Crossfade effects**

#### 4. CameraPhysics
- **User input handling (mouse, touch, scroll)**
- **Momentum and inertia**
- **Boundary constraints**
- **Smooth movement calculations**

### Camera State Management
```javascript
const cameraState = {
  position: { x: 0, y: 0, z: 5 },
  rotation: { x: 0, y: 0, z: 0 },
  target: { x: 0, y: 0, z: 0 },
  fov: 75,
  near: 0.1,
  far: 1000,
  behavior: 'idle', // idle, animating, transitioning, user-controlled
  constraints: {
    minX: -10, maxX: 10,
    minY: -5, maxY: 5,
    minZ: 1, maxZ: 20
  }
};
```

## Image Asset Management

### Directory Structure
```
assets/images/timeline/
├── 2010/
│   ├── 2010-01-15-launch.jpg
│   ├── 2010-06-20-milestone.jpg
│   └── metadata.json
├── 2011/
│   ├── 2011-03-10-update.jpg
│   └── metadata.json
└── ...
```

### Image Loading Strategy
1. **Lazy Loading**: Load images only when needed
2. **Progressive Loading**: Show placeholders while loading
3. **Caching**: Store loaded images in IndexedDB
4. **Fallbacks**: WebP with JPEG fallback
5. **Responsive**: Multiple sizes for different viewports

### Image Metadata Structure
```json
{
  "year": 2010,
  "date": "2010-01-15",
  "title": "Project Launch",
  "description": "The beginning of our journey",
  "tags": ["milestone", "launch"],
  "camera": {
    "position": { "x": 0, "y": 0, "z": 5 },
    "target": { "x": 0, "y": 0, "z": 0 }
  },
  "sizes": {
    "thumbnail": "2010-01-15-launch-thumb.jpg",
    "medium": "2010-01-15-launch-med.jpg",
    "large": "2010-01-15-launch-large.jpg"
  }
}
```

## Debug UI System

### Automatic Debug Control Generation
Every Three.js object added to the scene automatically gets debug controls:

```javascript
class DebugControlGenerator {
  generateControls(object, name) {
    const controls = {};
    
    // Position controls (1-10 range)
    if (object.position) {
      controls[`${name}PositionX`] = this.createSlider('Position X', 1, 10, object.position.x);
      controls[`${name}PositionY`] = this.createSlider('Position Y', 1, 10, object.position.y);
      controls[`${name}PositionZ`] = this.createSlider('Position Z', 1, 10, object.position.z);
    }
    
    // Rotation controls (1-10 range)
    if (object.rotation) {
      controls[`${name}RotationX`] = this.createSlider('Rotation X', 1, 10, object.rotation.x);
      controls[`${name}RotationY`] = this.createSlider('Rotation Y', 1, 10, object.rotation.y);
      controls[`${name}RotationZ`] = this.createSlider('Rotation Z', 1, 10, object.rotation.z);
    }
    
    // Scale controls (1-10 range)
    if (object.scale) {
      controls[`${name}ScaleX`] = this.createSlider('Scale X', 1, 10, object.scale.x);
      controls[`${name}ScaleY`] = this.createSlider('Scale Y', 1, 10, object.scale.y);
      controls[`${name}ScaleZ`] = this.createSlider('Scale Z', 1, 10, object.scale.z);
    }
    
    return controls;
  }
}
```

### Debug UI Integration
- **Real-time Updates**: Changes immediately affect Three.js objects
- **State Synchronization**: Debug UI always reflects actual object state
- **Grouped Controls**: Related controls grouped in collapsible sections
- **Reset Functionality**: Reset buttons for each control group
- **Value Display**: Current values shown in labels

## Performance Architecture

### Rendering Pipeline
1. **Scene Culling**: Frustum culling for off-screen objects
2. **LOD System**: Level of detail based on distance
3. **Instanced Rendering**: For repeated objects
4. **Texture Atlasing**: Reduce draw calls
5. **Occlusion Culling**: Hide objects behind others

### Memory Management
- **Object Pooling**: Reuse Three.js objects
- **Texture Streaming**: Load/unload textures as needed
- **Geometry Optimization**: Use BufferGeometry
- **Material Sharing**: Reuse materials where possible

### Performance Monitoring
```javascript
class PerformanceMonitor {
  trackFPS() {
    // Monitor frame rate
  }
  
  trackMemory() {
    // Monitor memory usage
  }
  
  trackDrawCalls() {
    // Monitor render calls
  }
  
  generateReport() {
    // Generate performance report
  }
}
```

## Comment System Architecture

### Comment System Components

#### 1. CommentManager
Central comment management and coordination.

**Responsibilities:**
- Manage comment lifecycle (create, read, update, delete)
- Coordinate between UI, storage, and moderation
- Handle comment events and notifications
- Manage comment state synchronization

**Key Methods:**
```javascript
addComment(eventId, commentData)     // Add new comment
getComments(eventId)                 // Get comments for event
updateComment(commentId, updates)    // Update comment
deleteComment(commentId)             // Delete comment
likeComment(commentId)               // Like/unlike comment
replyToComment(commentId, replyData) // Reply to comment
```

#### 2. CommentStorage
Persistent storage for comments and user data.

**Responsibilities:**
- Store comments in JSON files by event
- Manage user profiles and preferences
- Handle data persistence and retrieval
- Implement caching for performance

**Storage Structure:**
```
assets/data/comments/
├── 2010/
│   ├── 2010-01-15-launch-comments.json
│   └── 2010-06-20-milestone-comments.json
├── 2015/
│   └── 2015-03-15-breakthrough-comments.json
└── users/
    ├── user-profiles.json
    └── user-preferences.json
```

#### 3. CommentModeration
Content moderation and safety features.

**Responsibilities:**
- Filter inappropriate content
- Handle reported comments
- Manage user bans and restrictions
- Provide moderation tools and interfaces

**Key Features:**
- Automatic content filtering
- Manual moderation queue
- User reporting system
- Moderation analytics

#### 4. CommentUI
User interface for comment interactions.

**Responsibilities:**
- Display comments in 3D space
- Handle user interactions
- Manage comment forms and editing
- Provide visual feedback

**UI Components:**
- Comment bubbles in 3D space
- Comment form overlay
- Comment list panel
- Moderation interface

### Comment Data Flow

```javascript
// Comment creation flow
1. User clicks on timeline event
2. CommentUI shows comment form
3. User submits comment
4. CommentManager validates comment
5. CommentModeration checks content
6. CommentStorage saves comment
7. CommentUI updates display
8. EventBus emits commentAdded event
```

### Comment State Management

```javascript
const commentState = {
  comments: {
    [eventId]: [commentObjects]
  },
  ui: {
    selectedEvent: eventId,
    showComments: boolean,
    commentFormVisible: boolean,
    moderationMode: boolean
  },
  settings: {
    maxCommentsPerEvent: 50,
    autoModeration: boolean,
    allowReplies: boolean,
    allowLikes: boolean
  }
};
```

## Integration with Cursor Agents

### Cursor Agent Interface
```javascript
class CursorAgentInterface {
  // Read scene state
  getSceneState() {
    return this.stateManager.getState();
  }
  
  // Modify objects safely
  updateObject(objectId, properties) {
    this.validateProperties(properties);
    this.sceneManager.updateObject(objectId, properties);
    this.updateDebugUI(objectId, properties);
  }
  
  // Animate changes
  animateObject(objectId, animationConfig) {
    this.animationManager.animate(objectId, animationConfig);
  }
  
  // Get debug controls
  getDebugControls() {
    return this.debugPanel.getControls();
  }
  
  // Comment system methods
  addComment(eventId, commentData) {
    return this.commentManager.addComment(eventId, commentData);
  }
  
  getComments(eventId) {
    return this.commentManager.getComments(eventId);
  }
  
  moderateComments(eventId) {
    return this.commentManager.moderateComments(eventId);
  }
}
```

### Human Language Mapping
- **"Move camera to position"** → `cameraController.moveTo(x, y, z)`
- **"Animate object smoothly"** → `animationManager.smoothAnimate(objectId, config)`
- **"Add image to timeline"** → `timelineManager.addImage(year, imageData)`
- **"Update lighting"** → `lightingManager.updateLights(lightConfig)`

## Security and Stability

### Input Validation
- Validate all user inputs
- Sanitize image URLs
- Limit camera movement ranges
- Rate limit automated changes

### Error Handling
- Try-catch around all Three.js operations
- Fallback behaviors for failed operations
- Comprehensive error logging
- Graceful degradation

### State Recovery
- Save state snapshots
- Provide undo/redo functionality
- Auto-save important state
- Recovery from errors

## Testing Architecture

### Unit Testing
- Test individual components
- Mock Three.js dependencies
- Test state management
- Test event handling

### Integration Testing
- Test component interactions
- Test camera transitions
- Test timeline navigation
- Test image loading

### Visual Regression Testing
- Capture scene screenshots
- Compare before/after changes
- Test multiple viewport sizes
- Verify camera positions

This architecture provides a solid foundation for the Three.js timeline project while ensuring maintainability, performance, and ease of integration with Cursor agents.
