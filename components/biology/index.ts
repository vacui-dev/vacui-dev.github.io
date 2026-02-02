
// Copyright (c) 2025 vacui.dev, all rights reserved

import { registerEntity } from '../Simulation/EntityRegistry';
import { Bone } from './Bone';

export const registerBiology = () => {
    registerEntity('Bone', Bone);
};
