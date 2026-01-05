# EFFECT INTERNAL

## OVERVIEW

Implementation details for Effect core. Never import directly - use public API.

## STRUCTURE

```
internal/
├── opCodes/         # OP_* discriminator constants
│   ├── effect.ts    # Effect instruction opcodes
│   ├── cause.ts     # Cause variants
│   ├── channel.ts   # Channel primitives
│   └── ...
├── stm/             # Software Transactional Memory
│   ├── tRef.ts      # Transactional refs
│   ├── tQueue.ts    # Transactional queues
│   ├── tMap.ts      # Transactional maps
│   └── opCodes/     # STM opcodes
├── stream/          # Stream implementation
│   ├── handoff.ts   # Sync coordination
│   ├── pull.ts      # Pull protocol
│   └── emit.ts      # Emission facade
├── differ/          # Patch types
│   ├── *Patch.ts    # chunkPatch, contextPatch, etc
└── schema/          # Schema internals
```

## CONVENTIONS

### OpCode Pattern

```typescript
// Definition (opCodes/*.ts)
export const OP_SUCCESS = "Success" as const
export type OP_SUCCESS = typeof OP_SUCCESS

// Usage (implementation files)
interface Success<A> {
  readonly _tag: OP_SUCCESS
  readonly value: A
}
```

### STM Naming

- `t` prefix: `tRef`, `tQueue`, `tMap`, `tArray`, `tSet`
- 13 transactional data structures

### State Machine Files

- `*State.ts` suffix: `channelState`, `stmState`, `debounceState`
- `*Signal.ts` suffix: `handoffSignal`
- `*Reason.ts` suffix: `sinkEndReason`

### Patch Pattern (Differ)

```typescript
// All patches implement:
empty: Patch<Value, Patch>
combine: (self: Patch, that: Patch) => Patch
diff: (oldValue: Value, newValue: Value) => Patch
patch: (patch: Patch, oldValue: Value) => Value
```

## KEY FILES

| File              | LOC   | Purpose                        |
| ----------------- | ----- | ------------------------------ |
| `fiberRuntime.ts` | 3,842 | Fiber execution + trampolining |
| `core.ts`         | 3,166 | Core primitives                |
| `stream.ts`       | 8,801 | Stream implementation          |
| `circular.ts`     | 895   | Breaks import cycles           |

## ANTI-PATTERNS

- **Never export from internal** - Package.json blocks `./internal/*`
- **All exports marked `@internal`** - JSDoc annotation required
- **OpCodes in separate files** - Keep constants isolated

## NOTES

- `circular.ts` exists to break import cycles
- Handoff is sync Queue-like coordination primitive
- FiberRuntime uses trampolining for stack safety
- All 185 files use `/** @internal */` JSDoc
