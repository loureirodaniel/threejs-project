# Three.js Project

A modern Three.js project with Vite for fast development and building.

## Features

- 🎨 Interactive 3D scene with rotating cubes
- 🖱️ Mouse controls for camera movement
- 📱 Responsive design
- ⚡ Fast development with Vite
- 🎯 Modern ES6+ JavaScript

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

- **Mouse drag**: Rotate camera around the scene
- **Mouse scroll**: Zoom in/out
- **Right mouse drag**: Pan camera

## Technologies Used

- [Three.js](https://threejs.org/) - 3D graphics library
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) - Camera controls

## License

ISC 