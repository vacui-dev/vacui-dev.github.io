
// Copyright (c) 2025 vacui.dev, all rights reserved

import { registerEntity } from '../Simulation/EntityRegistry';
import { InputTerminal } from './InputTerminal';

export const registerInputs = () => {
    registerEntity('InputTerminal', InputTerminal);
};
