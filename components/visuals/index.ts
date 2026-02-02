
// Copyright (c) 2025 vacui.dev, all rights reserved

import { registerEntity } from '../Simulation/EntityRegistry';
import { Atmosphere } from './Atmosphere';
import { Fire } from './Fire';
import { MarketHand } from './MarketHand';
import { HarmonicRenderer } from './HarmonicRenderer';
import { Planet } from './Planet';

export const registerVisuals = () => {
    registerEntity('Atmosphere', Atmosphere);
    registerEntity('Fire', Fire);
    registerEntity('MarketHand', MarketHand);
    registerEntity('Harmonic', HarmonicRenderer);
    registerEntity('Planet', Planet);
};
