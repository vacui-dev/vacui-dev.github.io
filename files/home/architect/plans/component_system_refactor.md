# Architectural Plan: The Holon Component System

**Objective:** Refactor the Entity system from a flat property bag into a **Fractal Node Architecture (Holon System)**. Entities will become "Compound Nodes" capable of containing their own internal node graphs, exposing inputs/outputs via a Membrane, and interacting via standardized Protocols.

**End Goals:**
1.  **MIDI Visualizer Parity:** Reproduce the "Audio Reactive Sphere" capabilities (FFT -> Geometry) entirely within the new node system.
2.  **RPG Systems:** Implement Inventory, Looting, Trading, and Combat using State Nodes and Protocol Handshakes.

---

## Phase 1: The Data Structure (The Skeleton)
**Goal:** Define the schema that allows an Entity to *be* a Node Graph.

- [ ] **Define `PortDefinition` Schema** in `types/nodes.ts`
    - `id`: string
    - `type`: 'Signal' | 'Value' | 'Data' | 'Geometry' | 'Item' | 'Audio'
    - `direction`: 'Input' | 'Output'
- [ ] **Refactor `Entity` Interface**
    - Add `internalGraph`: The network of components inside the entity.
    - Add `membrane`: Mapping of internal node sockets to external Entity ports.
    - *Migration Strategy:* Keep existing `position`, `rotation`, `mass` for now, but treat them as "Native Properties" that can be driven by the graph.
- [ ] **Define `Component` (Atomic Node) Registry**
    - Create a registry that maps `NodeType` to specific behavior functions (Initialize, Execute, Cleanup).

### 🛑 Validation Checkpoint 1
- **Unit Test (`GraphSchemaTests.ts`):**
    - Create a mock `Entity` JSON structure containing a nested `internalGraph`.
    - Verify that `membrane` mappings point to valid internal nodes.
    - Verify serialization/deserialization of the new structure.

---

## Phase 2: The Recursive Engine (The Pulse)
**Goal:** Update `SignalEngine` to execute nested graphs and handle state.

- [ ] **Update `SignalEngine` for Recursion**
    - If a node is a `CompoundNode` (an Entity), recursively call `evaluateGraph` on its internal graph.
    - Map inputs from the parent graph to the `InputNode` of the child graph.
    - Map outputs from the `OutputNode` of the child graph back to the parent graph.
- [ ] **Implement State Nodes**
    - Unlike "Pulse" nodes (Math), State nodes (Inventory, Health) persist data between frames.
    - Add `nodeState` registry to `SignalEngine` to track persistent values by Node ID.
- [ ] **Implement Bridge Components**
    - `InputNode`: Reads values from the Membrane (Parent Graph -> Internal).
    - `OutputNode`: Writes values to the Membrane (Internal -> Parent Graph).

### 🛑 Validation Checkpoint 2
- **Unit Test (`RecursionTests.ts`):**
    - Create a `MathAdder` entity (Internal Graph: `Input A` -> `Math.Add` -> `Output`).
    - Place this Entity as a node inside a Master Graph.
    - Feed values 5 and 3 into the Entity. Verify Output is 8.
- **Regression Test:**
    - Verify existing `LogicSystem` graphs (Flappy Bird, Mech) still function by wrapping them in a default "Logic Container" if necessary.

---

## Phase 3: MIDI Visualizer Implementation (High Frequency)
**Goal:** Achieve feature parity with the provided "Visualizer" code examples using the new system.

- [ ] **Implement Audio Nodes**
    - `AudioSource`: Wraps `Tone.Player` or Microphone input.
    - `AudioAnalyze`: Wraps `Tone.FFT` / `Tone.Meter`. Outputs `frequency`, `amplitude`.
- [ ] **Implement Geometry Nodes**
    - `ShapeGenerator`: Inputs (Theta), Outputs (Radius).
    - `PolarConverter`: Inputs (Radius, Angle), Outputs (Vector3).
    - `Projection`: Inputs (Vector3, Time), Outputs (Vector3).
- [ ] **Implement `VisualOutput` Node**
    - Configurable Renderer (Sphere, Tube, Particles).
    - Accepts `Geometry` signal.
    - *Success Criteria:* Can recreate the "Audio Mandala" purely via nodes.

### 🛑 Validation Checkpoint 3
- **Integration Test (`VisualizerTests.ts`):**
    - construct a graph: `AudioSource` -> `FFT` -> `Math.Mult` -> `Shape.Circle` -> `VisualOutput`.
    - Mock Audio Input (Sine Wave).
    - Verify `VisualOutput` receives oscillating geometry data matching the sine wave frequency.

---

## Phase 4: RPG Systems (Low Frequency / Stateful)
**Goal:** Implement Inventory, Health, and Interaction logic.

- [ ] **Implement Data Nodes**
    - `InventoryNode`: Holds `Array<Item>`. Inputs: `AddItem`, `RemoveItem`. Outputs: `HasItem`.
    - `StatNode`: Holds `Float` (e.g., Health). Inputs: `Modify` (+/-). Outputs: `CurrentValue`.
- [ ] **Implement "Property Drivers"**
    - `PropertyOutput`: A node that writes to the Entity's native ECS properties (`position`, `color`).
    - Example: `Health` < 10 -> `ColorOutput` (Red).
- [ ] **Implement Interaction Logic**
    - `SignalTrigger`: Fires when an interaction (click/collision) occurs.

### 🛑 Validation Checkpoint 4
- **Unit Test (`RPGTests.ts`):**
    - Create a `Chest` entity with an `InventoryNode` containing 1 Gold.
    - Create a `Player` entity with an empty `InventoryNode`.
    - Trigger a "Loot" signal.
    - Verify `Chest` inventory is empty and `Player` inventory has 1 Gold.
    - Verify `Chest` emits "Empty" signal (could change color).

---

## Phase 5: Interaction & Protocols (The Nervous System)
**Goal:** Dynamic wiring between entities based on capability matching.

- [ ] **Create `Protocol` Registry**
    - Define schema for Interfaces (e.g., `Tradeable`, `Damageable`).
    - `Tradeable` Protocol: Requires `Input: OfferItem`, `Output: AcceptItem`.
- [ ] **Implement Dynamic Wiring System**
    - When Entity A collides with Entity B:
        1. Query Registry: "Does B support Protocol X?"
        2. If yes, temporarily create graph edges connecting A's outputs to B's inputs.
- [ ] **Refactor `LogicSystem`**
    - Move from global system to a per-Entity evaluation loop (or optimized batch).

### 🛑 Validation Checkpoint 5
- **Integration Test (`ProtocolTests.ts`):**
    - Create `Attacker` (Outputs `DamageSignal`).
    - Create `Target` (Implements `Damageable` Protocol -> `HealthNode`).
    - Create `Rock` (No Protocol).
    - Verify `Attacker` hitting `Target` reduces Health.
    - Verify `Attacker` hitting `Rock` does nothing.

---

## Phase 6: Tooling (The Architect's Interface)
**Goal:** Make it usable via the UI.

- [ ] **Update `NodeConstruct` App**
    - Add "Dive In" button to Compound Nodes.
    - Breadcrumb navigation for nested graphs.
- [ ] **Update `SimulationEditor`**
    - Visual indication of Exposed Ports on entities.
    - Drag-and-drop wiring between Entities in the world view (Conceptual).

---

## Final Acceptance Test (The "Golden Path")
1.  **Scene Setup:**
    - **Player:** Has `Inventory`, `Health`, and a `Scanner`.
    - **Loot Box:** Has `Inventory` (Items) and `AudioSource` (Humming sound).
    - **Enemy:** Has `Health` and `AI` (Logic Graph).
2.  **Action:**
    - Player approaches Loot Box.
    - Player's `Scanner` (Visual Node) pulses faster due to Loot Box's `AudioSource` (Reactive).
    - Player "Interacts". Loot transfers to Player.
    - Loot Box visual changes (Property Driver).
    - Player attacks Enemy. Enemy Health drops.
3.  **Verification:**
    - If all the above happens via **Graph Evaluation** (not hardcoded TS logic), the refactor is a success.
