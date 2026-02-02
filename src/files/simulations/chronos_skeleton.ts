// Copyright (c) 2025 vacui.dev, all rights reserved

import { WorldConfig, Track } from "../../types/simulation";

// Orbital Period of Moon (Synodic) ~ 29.53 days
const MOON_PERIOD = 29.53;

// Generate Walking Animation Tracks locked to Moon Cycle
// 1 Step = 1 Full Moon Cycle
const generateTracks = (): Track[] => {
    const tracks: Track[] = [];
    
    // Right Leg (Femur)
    // Swing phase at Full Moon?
    tracks.push({
        id: 'track_leg_r',
        targetId: 'femur_r',
        property: 'rotation.x',
        loop: true,
        duration: MOON_PERIOD,
        keyframes: [
            { id: 'kf1', time: 0, value: 0, interpolation: 'linear', meta: { label: 'New Moon', description: 'Right Leg Neutral', tags: ['Phase', 'Anatomy'] } },
            { id: 'kf2', time: MOON_PERIOD * 0.25, value: -0.5, interpolation: 'linear', meta: { label: 'First Quarter', description: 'Right Leg Lift', tags: ['Phase', 'Anatomy'] } },
            { id: 'kf3', time: MOON_PERIOD * 0.5, value: 0, interpolation: 'linear', meta: { label: 'Full Moon', description: 'Right Leg Plant', tags: ['Phase', 'Anatomy'] } },
            { id: 'kf4', time: MOON_PERIOD * 0.75, value: 0.2, interpolation: 'linear', meta: { label: 'Last Quarter', description: 'Right Leg Push', tags: ['Phase', 'Anatomy'] } },
            { id: 'kf5', time: MOON_PERIOD, value: 0, interpolation: 'linear' }
        ]
    });

    // Left Leg (Inverse Phase)
    tracks.push({
        id: 'track_leg_l',
        targetId: 'femur_l',
        property: 'rotation.x',
        loop: true,
        duration: MOON_PERIOD,
        keyframes: [
            { id: 'kf_l1', time: 0, value: 0, interpolation: 'linear' },
            { id: 'kf_l2', time: MOON_PERIOD * 0.25, value: 0.2, interpolation: 'linear' },
            { id: 'kf_l3', time: MOON_PERIOD * 0.5, value: 0, interpolation: 'linear' },
            { id: 'kf_l4', time: MOON_PERIOD * 0.75, value: -0.5, interpolation: 'linear' },
            { id: 'kf_l5', time: MOON_PERIOD, value: 0, interpolation: 'linear' }
        ]
    });

    // Moon Position (Visual Marker)
    // We can also drive the Moon's position via timeline instead of OrbitalSystem if we wanted to prove a point
    // But let's stick to animating the Skeleton based on the "Concept" of the moon.

    return tracks;
};

export default {
    "gravity": { "x": 0, "y": 0, "z": 0 },
    "environment": "night",
    "description": "Chronos Skeleton: Walking at the speed of the Moon. One step per lunar cycle.",
    "entities": [
        // Celestial Bodies
        {
            "id": "sun",
            "name": "Sun",
            "type": "Sphere",
            "position": { "x": 0, "y": 0, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [2],
            "mass": 0,
            "color": "#ffaa00"
        },
        {
            "id": "earth",
            "name": "Earth",
            "type": "Planet",
            "position": { "x": 15, "y": 0, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [1],
            "mass": 1,
            "color": "#ffffff",
            "planetParams": {
                "radius": 1,
                "textureSeed": "earth",
                "waterLevel": 0.7,
                "cloudCover": 0.5,
                "rotationSpeed": 365,
                "axialTilt": 23.5
            },
            "orbitParams": {
                "radius": 15,
                "eccentricity": 0,
                "inclination": 0,
                "speed": 1,
                "epochOffset": 0
            }
        },
        {
            "id": "moon",
            "name": "Moon",
            "type": "Sphere",
            "position": { "x": 17, "y": 0, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.27],
            "mass": 0.1,
            "color": "#eeeeee",
            "orbitParams": {
                "radius": 3,
                "eccentricity": 0,
                "inclination": 0,
                "speed": 12.36, // Synodic months per year approx
                "epochOffset": 0,
                "parentBodyId": "earth"
            }
        },

        // THE CHRONOS SKELETON
        // Positioned above Earth to stride across the cosmos
        {
            "id": "pelvis",
            "name": "Pelvis",
            "type": "Box",
            "position": { "x": 15, "y": 3, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [1, 0.3, 0.5],
            "mass": 0, // Kinematic anchor
            "color": "#e3dac9"
        },
        // Right Leg
        {
            "id": "femur_r",
            "name": "Femur R",
            "type": "Bone",
            "position": { "x": 15.4, "y": 2, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.1, 0.1, 1.5, 8],
            "mass": 0, // Animated via Timeline
            "color": "#e3dac9"
        },
        // Left Leg
        {
            "id": "femur_l",
            "name": "Femur L",
            "type": "Bone",
            "position": { "x": 14.6, "y": 2, "z": 0 },
            "rotation": { "x": 0, "y": 0, "z": 0 },
            "args": [0.1, 0.1, 1.5, 8],
            "mass": 0, // Animated via Timeline
            "color": "#e3dac9"
        }
    ],
    "constraints": [],
    "tracks": generateTracks()
} as WorldConfig;