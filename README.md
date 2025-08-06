# Three.js Project

A modern Three.js project with Vite for fast development and building.

## Features

- 🎨 Interactive 3D timeline with image planes
- 🖱️ Mouse controls for camera movement and timeline navigation
- 📱 Responsive design with touch support
- ⚡ Fast development with Vite
- 🎯 Modern ES6+ JavaScript
- 📅 Dynamic events panel that updates with timeline navigation
- 🎭 Smooth scene transitions and animations
- 🔍 Image enlargement with background blur effects
- 🎛️ Debug panel for real-time parameter adjustment

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd threejs-project
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
threejs-project/
├── src/
│   └── main.js          # Main Three.js application
├── index.html           # HTML entry point
├── package.json         # Project dependencies and scripts
├── README.md           # This file
└── .gitignore          # Git ignore rules
```

## Controls

- **Mouse drag**: Rotate camera around the scene (initial scene) / Navigate timeline (timeline scene)
- **Mouse scroll**: Zoom in/out (initial scene) / Navigate timeline horizontally (timeline scene)
- **Touch swipe**: Navigate between scenes or timeline years on mobile devices
- **Click on timeline images**: Enlarge images for detailed view
- **Escape key**: Close enlarged images
- **Events panel toggle**: Click the calendar icon (📅) to open/close the events panel

## Timeline Navigation

- Navigate through years 2010-2019 by scrolling horizontally or dragging
- The timeline automatically snaps to the nearest year
- Events panel updates dynamically to show events for the current year
- Each year has multiple events with categories and descriptions

## Technologies Used

- [Three.js](https://threejs.org/) - 3D graphics library
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [GSAP](https://greensock.com/gsap/) - Animation library for smooth transitions
- Custom timeline controller for interactive navigation

## License

ISC 