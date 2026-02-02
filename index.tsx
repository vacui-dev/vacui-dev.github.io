// Copyright (c) 2025 vacui.dev, all rights reserved

/// <reference lib="dom" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fix for React Three Fiber intrinsic elements
// Removed manual augmentation to prevent conflict with React DOM elements.
// @react-three/fiber should handle types automatically.
import { ThreeElements } from '@react-three/fiber'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);