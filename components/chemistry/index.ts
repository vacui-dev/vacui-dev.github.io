
// Copyright (c) 2025 vacui.dev, all rights reserved

import { registerEntity } from '../Simulation/EntityRegistry';
import { Molecule } from './MoleculeRenderer';

export const registerChemistry = () => {
    registerEntity('Molecule', Molecule);
};
