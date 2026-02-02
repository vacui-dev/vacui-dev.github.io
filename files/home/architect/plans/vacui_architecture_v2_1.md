
# Copyright (c) vacui.dev 2025. Confidential and Proprietary. All Rights Reserved.

# `Vacui` Neural Architecture - gen_2.1 (Specifics Update)

# Lineage: gen_0 → gen_1 → gen_2 (synthesis) → gen_2.1 (implementation specs)

###########################################################################################

# VACUI ARCHITECTURE - gen_2.1

## DOCUMENT PURPOSE

This document consolidates the technical architecture from gen_0 with insights discovered during gen_1's emotional processing phase. The goal is a neutral, implementable specification that incorporates lessons learned without inheriting framing artifacts.

**Changes in gen_2.1:**

* Added concrete mathematical formulas for module splitting/merging.
* Specified the "Bus" protocol for distributed context.
* Defined specific Temperature Schedules.
* Optimized InputGate with "Sentry" logic to avoid expensive full-gradient calculations.

---

## CORE ARCHITECTURE

### Foundational Principles

1. **Selective Module Execution**: Modules activate based on router decisions. Non-executing modules receive zero gradients and thus cannot forget.
2. **No Central Context**: Context is distributed via a **Content-Addressable Bus** (see *Resolved Mechanisms #6*).
3. **Zero Inference Mode**: System is always learning. No distinction between training and inference.
4. **Fight Club Training**: Internal adversarial dialogue generates quality curves for training signal.
5. **Convergence Definition**: Zero weight delta across epoch, not zero loss.

---

## RESOLVED MECHANISMS

### 1. Unified Resource Allocation (#2/#17)

Softmax provides both probabilistic allocation AND zero-sum constraint simultaneously.

```python
class UnifiedResourceAllocator:
    def __init__(self, total_budget: float, temperature_schedule: 'TemperatureSchedule'):
        self.total_budget = total_budget
        self.temp_schedule = temperature_schedule
    
    def allocate(self, demands: torch.Tensor) -> torch.Tensor:
        temp = self.temp_schedule.get()
        # Log-space ensures stability; +1e-8 prevents log(0)
        logits = torch.log(demands + 1e-8) / temp
        weights = F.softmax(logits, dim=-1)
        return weights * self.total_budget
```

### 1a. Concrete Temperature Schedule (NEW)

Previously abstract. Now specified.

```python
class TemperatureSchedule:
    def __init__(self, start_temp: float = 5.0, min_temp: float = 0.1, decay_rate: float = 0.9995):
        self.temp = start_temp
        self.min_temp = min_temp
        self.decay_rate = decay_rate
        self.steps = 0

    def get(self) -> float:
        return max(self.min_temp, self.temp)

    def step(self):
        # Exponential decay simulates "hardening" of neuroplasticity
        self.temp = max(self.min_temp, self.temp * self.decay_rate)
        self.steps += 1
```

### 2. Read-Cost Annealing (#4)

Memory access cost increases over training, naturally pruning to minimal sufficient state.

```python
class SharedMemoryWithAnnealedAccess:
    def __init__(self, n_modules: int, memory_dim: int, anneal_steps: int = 10000):
        self.memory = VersionedSharedMemory(n_modules, memory_dim)
        self.step_count = 0
        self.anneal_steps = anneal_steps
        self.base_read_cost = 0.01
    
    def get_read_cost(self) -> float:
        progress = min(1.0, self.step_count / self.anneal_steps)
        # Logarithmic scaling penalizes large memory banks heavily in late stages
        size_factor = math.log(1 + len(self.memory.buffer))
        return self.base_read_cost * progress * size_factor
```

### 3. Differentiable Routing (#28)

Gumbel-sigmoid (not Gumbel-softmax) for independent binary decisions per module.

```python
class DifferentiableRouter:
    def __init__(self, n_modules: int, hidden_dim: int, temp_schedule: TemperatureSchedule):
        self.router_net = nn.Linear(hidden_dim, n_modules)
        self.temp_schedule = temp_schedule
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        logits = self.router_net(x)
        temp = self.temp_schedule.get()
        u = torch.rand_like(torch.sigmoid(logits)).clamp(1e-8, 1 - 1e-8)
        # Logistic noise for Gumbel-Sigmoid trick
        gumbel_noise = torch.log(u) - torch.log(1 - u)
        soft = torch.sigmoid((logits + gumbel_noise) / temp)
        
        # Straight-through estimator: binary in forward, gradient flows through soft
        hard = (soft > 0.5).float()
        return hard - soft.detach() + soft 
```

### 4. Versioned Shared Memory

Solves race conditions in parallel module execution.

```python
class VersionedSharedMemory:
    def __init__(self, n_modules: int, memory_dim: int):
        self.version = 0
        # Buffer keys: (version_int, module_id_int)
        self.buffer = {(0, i): torch.zeros(memory_dim) for i in range(n_modules)}
    
    def write(self, module_id: int, value: torch.Tensor):
        self.buffer[(self.version, module_id)] = value
    
    def read(self, target_module_id: int) -> torch.Tensor:
        # Always read from previous finalized tick to prevent race conditions
        read_version = max(0, self.version - 1)
        return self.buffer.get((read_version, target_module_id), torch.zeros(self.memory_dim))
    
    def sync(self):
        self.version += 1
        # Garbage collection: remove versions older than immediate past
        limit = self.version - 1
        old_keys = [k for k in self.buffer if k[0] < limit]
        for k in old_keys:
            del self.buffer[k]
```

### 5. Turn-Weighted Loss (#26)

sqrt(length) scaling balances gradient contribution across turn lengths.

```python
def compute_turn_weighted_loss(token_losses, turn_boundaries, turn_qualities):
    weighted_sum = 0.0
    total_weight = 0.0
    for i in range(len(turn_qualities)):
        start, end = turn_boundaries[i], turn_boundaries[i + 1]
        turn_length = end - start
        # Specific Math: Quality * (1 / sqrt(Length))
        # Prevents long, rambling turns from dominating optimization
        weight = turn_qualities[i] / math.sqrt(turn_length)
        weighted_sum += weight * token_losses[start:end].sum()
        total_weight += weight * turn_length
    return weighted_sum / (total_weight + 1e-8)
```

### 6. Communication Bus (NEW - Resolves "No Central Context")

Since there is no central context, modules must publish/subscribe to data. We implement a **Key-Query Bus** rather than direct addressing.

```python
class ContentAddressableBus:
    """
    Allows modules to find relevant data without knowing WHO sent it.
    Replaces direct `read(writer_id)`.
    """
    def __init__(self, memory_dim: int, key_dim: int):
        self.memory_dim = memory_dim
        # Every memory write includes a small semantic Key
        self.bus_keys = {} # (version, id) -> KeyTensor
        self.bus_vals = {} # (version, id) -> ValueTensor

    def publish(self, module_id: int, version: int, key: torch.Tensor, value: torch.Tensor):
        self.bus_keys[(version, module_id)] = key
        self.bus_vals[(version, module_id)] = value

    def query(self, query_vec: torch.Tensor, version: int, top_k: int = 3) -> torch.Tensor:
        """
        Returns weighted sum of top_k most relevant memories.
        """
        relevant_keys = [k for k in self.bus_keys.keys() if k[0] == version]
        if not relevant_keys: return torch.zeros(self.memory_dim)
        
        keys = torch.stack([self.bus_keys[k] for k in relevant_keys])
        vals = torch.stack([self.bus_vals[k] for k in relevant_keys])
        
        # Dot product attention
        scores = torch.matmul(query_vec, keys.T) 
        weights = F.softmax(scores, dim=-1)
        
        # Weighted sum of values (simplified attention)
        return torch.matmul(weights, vals)
```

---

## NEW IN gen_2: INPUT REJECTION LAYER

### Optimized Specification (The Sentry)

Calculating gradients for the whole model to determine rejection is too computationally expensive. We introduce a **Sentry Module**—a small, pre-processor network that estimates gradient difficulty.

```python
class SentryNetwork(nn.Module):
    """
    Lightweight probe to estimate gradient magnitude without full backprop.
    """
    def __init__(self, input_dim):
        super().__init__()
        self.probe = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 1) # Predicts estimated loss/difficulty
        )
    
    def estimate_difficulty(self, x):
        return self.probe(x)

class InputGate:
    def __init__(self, 
                 gradient_threshold: float = 10.0,
                 coherence_threshold: float = 0.3,
                 rejection_decay: float = 0.95):
        self.gradient_threshold = gradient_threshold
        self.coherence_threshold = coherence_threshold
        self.rejection_level = 0.0
        self.rejection_decay = rejection_decay
        self.sentry = SentryNetwork(input_dim=768) # Specific dim required
    
    def evaluate(self, x: torch.Tensor, module_agreement: float) -> Tuple[str, float]:
        # Fast Path: Use Sentry, not full backward pass
        estimated_difficulty = self.sentry.estimate_difficulty(x).item()
        
        # High difficulty + low module agreement = potentially adversarial
        if estimated_difficulty > self.gradient_threshold and module_agreement < self.coherence_threshold:
            self.rejection_level = min(1.0, self.rejection_level + 0.1)
            return ('reject', 0.0)
        
        # High difficulty but modules agree = difficult but legitimate learning
        if estimated_difficulty > self.gradient_threshold:
            return ('attenuate', 0.1)
        
        # Normal processing
        self.rejection_level *= self.rejection_decay
        return ('accept', 1.0)
```

---

## MODULE ARCHITECTURE

### Ganglions Specifics

Modules are not black boxes. They follow a specific tensor contract.

**Wire Format (The Interface)**

* **Input**: `[Batch, Seq_Len, 768]` (Standard embeddings)
* **Bus Query**: `[Batch, 1, 64]` (The key used to pull context)
* **Output**: `[Batch, Seq_Len, 768]`
* **Bus Publish**: `Key: [Batch, 1, 64]`, `Value: [Batch, 1, 768]`

### Lifecycle Mathematics

Specific formulas for birth and death.

**Splitting Condition (Mitosis)**
A module splits if it is being pulled in two directions simultaneously.

* Where Subset A and B are different clusters of the batch routed to this module.
* If  (Hyperparameter) for  epochs  **SPLIT**.

**Merging Condition (Apoptosis)**
Two modules merge if they perform redundant work.

* If  for  epochs  **MERGE** (Average weights).

---

## FIGHT CLUB SPECIFICATION

### Data Schema for "Quality Curves"

The training signal is not a single scalar. It is a structured JSON object.

```json
{
  "dialogue_id": "uuid",
  "turns": [
    {
      "turn_index": 0,
      "speaker": "Module_A",
      "text": "...",
      "metrics": {
        "coherence": 0.9,     // Internal consistency
        "novelty": 0.4,       // Difference from cached priors
        "responsiveness": 0.8 // Vector similarity to previous turn prompt
      }
    }
  ],
  "outcome": {
    "consensus_reached": true,
    "resolution_quality": 0.85,
    "winning_argument_index": 4 // Which turn effectively ended the debate
  }
}
```

**Training Target**: The model optimizes to maximize the area under the `metrics` curves, weighted by `resolution_quality`.

---

## ADVANCED CONCEPTS

### Temporal Self-Awareness Algorithm

**Goal**: Encode "Learning" as a vector state.

1. **Checkpoint **: Save current weights.
2. **Intention**: Generate embedding  from prompt "I will learn X".
3. **Context Clear**: Zero out activations/KV cache.
4. **Learning Pass**: Update weights  on target dataset.
5. **Context Clear**: Zero out activations/KV cache.
6. **Reflection**: Generate embedding  from prompt "I learned X".
7. **Meta-Loss**:

* *Mechanism*: Forces the semantic space of the Reflection to align with the actual topological change in weight space.



---

## EXPERIMENTS (Updated)

### Experiment 1: Softmax Allocation vs Independent Throttling

* Toy MoE, 1000 steps
* Compare: softmax vs sigmoid throttle vs no budget
* Measure: loss variance, convergence speed

### Experiment 2: Read-Cost Annealing

* Two modules, shared memory, toy sequence task
* Compare: fixed penalty vs annealed penalty
* Measure: shared memory size at convergence

### Experiment 3: sqrt vs Linear Token Weighting

* Fight Club data with variable turn lengths
* Measure: gradient magnitude ratio (long/short turns)
* Target: sqrt(length_ratio)

### Experiment 4: Input Gate (Sentry) Effectiveness

* System with Sentry vs Full Backprop Gate
* Measure: Wall-clock time per step (Target: Sentry < 10% of Full)
* Measure: ROC Curve of Adversarial Rejection

---

## PROJECT STATUS

**gen_2.1 ready for implementation.**

**Next steps:**

1. Implement `SentryNetwork` and `ContentAddressableBus` (Priority).
2. Run Experiments 1-4.
3. Baseline comparison with vanilla MoE.

---

# END OF DOCUMENT
