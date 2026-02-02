// Copyright (c) 2025 vacui.dev, all rights reserved

import { Entity, Constraint } from "../types/simulation";

/**
 * Chemistry Kernel
 * Manages atomic interactions, valency checks, and bond formation.
 * This isn't just visual; it creates actual physics constraints between atoms.
 */
class ChemistryKernel {
    
    private ELEMENTS: Record<string, { radius: number, color: string, mass: number }> = {
        'H': { radius: 0.1, color: '#ffffff', mass: 1 },
        'C': { radius: 0.15, color: '#333333', mass: 12 },
        'O': { radius: 0.14, color: '#ff0000', mass: 16 },
        'N': { radius: 0.14, color: '#0000ff', mass: 14 },
        'Au': { radius: 0.2, color: '#ffd700', mass: 197 }
    };

    public getElementProps(symbol: string) {
        return this.ELEMENTS[symbol] || { radius: 0.1, color: '#ff00ff', mass: 1 };
    }

    /**
     * Simulation Step: Check for proximity reactions
     * If reactive atoms touch, they bond.
     */
    public solveReactions(entities: Entity[], constraints: Constraint[]): { newConstraints: Constraint[], events: string[] } {
        const newConstraints: Constraint[] = [];
        const events: string[] = [];
        
        const atoms = entities.filter(e => e.type === 'Molecule' && e.chemicalParams?.isReactive);

        // Simple O(N^2) check for demo purposes (Spatial hash would be better for large sims)
        for (let i = 0; i < atoms.length; i++) {
            for (let j = i + 1; j < atoms.length; j++) {
                const a = atoms[i];
                const b = atoms[j];
                
                // Check if already bonded
                const alreadyBonded = constraints.some(c => 
                    (c.bodyA === a.id && c.bodyB === b.id) || (c.bodyA === b.id && c.bodyB === a.id)
                );
                if (alreadyBonded) continue;

                // Check Valency
                if ((a.chemicalParams?.bonds?.length || 0) >= (a.chemicalParams?.valency || 0)) continue;
                if ((b.chemicalParams?.bonds?.length || 0) >= (b.chemicalParams?.valency || 0)) continue;

                // Check Distance
                const distSq = (a.position.x - b.position.x)**2 + (a.position.y - b.position.y)**2 + (a.position.z - b.position.z)**2;
                const bondDist = (this.getElementProps(a.chemicalParams!.element).radius + this.getElementProps(b.chemicalParams!.element).radius) * 1.2;
                
                if (distSq < bondDist * bondDist) {
                    // REACT!
                    // Create a bond constraint
                    const bondId = `bond_${a.id}_${b.id}_${Date.now()}`;
                    newConstraints.push({
                        id: bondId,
                        type: 'Spring', // Chemical bonds vibrate
                        bodyA: a.id,
                        bodyB: b.id,
                        stiffness: 100, // Strong bond
                        damping: 5,
                        restLength: bondDist * 0.8,
                        renderAs: 'bond'
                    });
                    
                    events.push(`Reaction: ${a.chemicalParams?.element} + ${b.chemicalParams?.element} bonded.`);
                    
                    // Update internal state (In a real engine, we'd emit an update back to the main state)
                    // Here we just return the new constraint to be added
                }
            }
        }

        return { newConstraints, events };
    }
}

export const chemistryKernel = new ChemistryKernel();