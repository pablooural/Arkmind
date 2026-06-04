# 0002. Quién actualiza `Transaction.status` después de un rollback

**Fecha:** 2026-06-02
**Estado:** ✅ accepted
**IA autora:** Mavis
**Módulos afectados:** `rollback-engine`, `transactions.ts`

---

## Contexto

El SPEC del módulo `rollback-engine` dice (textual):

> "El módulo NO actualiza `Transaction.status` — eso es responsabilidad del caller."

Pero el código actual de `transactions.ts → rollbackTransaction()` hace exactamente eso:

```typescript
async rollbackTransaction(transactionId: string): Promise<boolean> {
  const transaction = this.transactions.get(transactionId);
  if (!transaction) return false;
  if (!transaction.snapshotId) return false;

  const success = await snapshotManager.rollback(transaction.snapshotId);
  if (success) {
    transaction.status = "rolled_back";
  }
  return success;
}
```

Hay **dos problemas** entrelazados:

1. **Forma del retorno:** el código trata `rollback()` como `Promise<boolean>`, pero el
   nuevo contrato de `rollback-engine` devuelve `Promise<RollbackResult>` (discriminated union).
   El caller no puede leer `.success` ni `.failedFiles` sin migración.

2. **Responsabilidad de actualizar `Transaction.status`:** el SPEC dice que el caller
   debe hacerlo, pero el SPEC NO dice explícitamente "y el caller debe traducir
   `RollbackResult → Transaction.status`". Eso queda implícito.

---

## Decisión propuesta

**Adoptar el path #1** descrito en el SPEC de `rollback-engine`:

1. El módulo `rollback-engine` implementa `rollback()` con la nueva firma
   `Promise<RollbackResult>`.
2. El caller (`transactions.ts → rollbackTransaction()`) lee `RollbackResult` y
   actualiza `Transaction.status` según el resultado:
   - `success: true` → `transaction.status = "rolled_back"`
   - `success: false` → `transaction.status = "rollback_failed"` (nuevo estado)
3. NO se acopla `snapshots.ts` a `transactions.ts`. La responsabilidad queda en el caller.

### Cambio de schema en `Transaction.status`

**Antes:**
```typescript
type TransactionStatus = "pending" | "validated" | "executed" | "confirmed" | "rolled_back"
```

**Después (propuesto):**
```typescript
type TransactionStatus = "pending" | "validated" | "executed" | "confirmed" |
                         "rolled_back" | "rollback_failed"
```

Añadir `"rollback_failed"` requiere ADR y consenso (es un cambio en `types.ts`,
NO-GO-ZONE).

---

## Consecuencias

**Positivas:**
- Contrato de `rollback-engine` más rico (la UI puede mostrar QUÉ falló, no solo "falló")
- Sesgo honesto: el caller sabe exactamente qué restaurar y qué no
- `snapshots.ts` no necesita importar de `transactions.ts` → respeta la jerarquía
- Mejor logging: se puede persistir el `RollbackResult` en el op-journal (módulo futuro)

**Negativas:**
- Un nuevo valor en `Transaction.status` (`rollback_failed`) → cambio en `types.ts` (NO-GO-ZONE)
- El caller necesita manejar dos ramas del discriminated union, no solo un boolean
- Migración conceptual: lo que era "rollback que falla silenciosamente" ahora es
  explícitamente "rollback que falla con reporte"

**Riesgos:**
- Si la UI actual no contempla `rollback_failed`, podría mostrar estado raro → mitigable
  con default a `"rolled_back"` hasta que UI se actualice
- Si se añaden más estados a `Transaction` en el futuro, el caller crece → aceptable

---

## Plan de implementación

Cuando el módulo `rollback-engine` se implemente:

1. Definir `RollbackResult` y `RollbackFailure` localmente en `snapshots.ts` con
   el comentario `// TODO: move to types.ts after this ADR accepted`
2. Implementar `rollback()` con la nueva firma
3. Añadir `"rollback_failed"` a `TransactionStatus` (cambio en `types.ts`, este ADR
   lo autoriza)
4. Mover `RollbackResult` y `RollbackFailure` a `types.ts`
5. Actualizar `transactions.ts → rollbackTransaction()` para traducir el resultado
6. Actualizar `transactions.ts → confirmTransaction()` si lee el estado
7. Cerrar este ADR (mover a `accepted`)

---

## Estado

🟡 **proposed** — pendiente de consenso. Si el `rollback-engine` se implementa
siguiendo este path, el ADR pasa a `accepted` automáticamente. Si se elige el
path alternativo (acoplar `snapshots.ts` con `transactions.ts`), hay que
rechazarlo y abrir uno nuevo.
