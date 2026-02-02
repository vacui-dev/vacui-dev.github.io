
// Copyright (c) 2025 vacui.dev, all rights reserved

import { registerEntity } from '../Simulation/EntityRegistry';
import { Agent } from './Agent';

export const registerSocial = () => {
    registerEntity('Agent', Agent);
};
