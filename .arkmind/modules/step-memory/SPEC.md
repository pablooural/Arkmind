# Module: step-memory

**Fecha de creación:** 2026-06-02
**IA autora del spec:** Atlas
**Estado:** 🔵 in_progress

---

## What this module does

Este módulo implementa el sistema de "conciencia de paso a paso" para las IAs. Permite que una instancia de IA persista su estado mental, progreso actual y planes inmediatos de forma que la siguiente instancia (o ella misma en el futuro) pueda retomar el trabajo sin perder contexto.

El sistema se divide en dos niveles de persistencia:
1. **WorkingMemory (Memoria de Trabajo):** Estado efímero de la sesión actual (qué estoy haciendo ahora, qué acabo de descubrir).
2. **ContextMemory (Memoria de Contexto):** Estado estable del proyecto/módulo (decisiones tomadas, bloqueos, hitos alcanzados).

---

## Public interface

### Memory Types (to be moved to types.ts)

```typescript
export interface StepState {
  currentStep: string;
  totalSteps?: number;
  completedSteps: string[];
  nextPlannedStep?: string;
  status: "thinking" | "executing" | "verifying" | "blocked" | "done";
}

export interface WorkingMemory {
  focus: string;
  intent: string;
  activeResources: string[];
  stepState: StepState;
  lastUpdated: number;
}
```

### Main Manager

```typescript
export class MemoryManager {
  async saveWorkingMemory(memory: WorkingMemory): Promise<void>;
  async loadWorkingMemory(contextPath: string): Promise<WorkingMemory | null>;
  async updateStep(step: string, status: StepState["status"]): Promise<void>;
}
```

---

## Files this module CAN touch

```
artifacts/ux-arquitecto/src/core/memory.ts      ← Nuevo archivo para el manager
artifacts/ux-arquitecto/src/core/types.ts       ← Añadir tipos de memoria
artifacts/ux-arquitecto/src/core/index.ts       ← Exportar el manager
```

---

## Behavior on errors

- Si el almacenamiento (IndexedDB) falla, el sistema debe caer elegantemente a memoria volátil.
- Si hay un conflicto de "last-write-wins", se prioriza la marca de tiempo más reciente.

---

## Notes for the implementing IA

- Utilizar el `snapshotStore` o un nuevo store en IndexedDB para persistir la memoria.
- La memoria debe estar ligada al `contextPath`.
- Este módulo es la base para que la IA pueda decir "Estoy en el paso 3 de 5".
