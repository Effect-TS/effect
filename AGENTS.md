# EFFECT MONOREPO

**Generated:** 2026-01-05 | **Commit:** f28f353d5 | **Branch:** main

## OVERVIEW

TypeScript standard library for production-grade software. Core primitives: Effect (typed errors + DI), Stream (backpressure), Schema (bidirectional codecs), Layer (DI construction).

## STRUCTURE

```
effect/
├── packages/
│   ├── effect/          # Core library (~500 files, 14k+ LOC Effect.ts)
│   ├── platform*/       # Runtime abstractions (node/bun/browser)
│   ├── sql*/            # 14 SQL packages (base + 13 drivers)
│   ├── ai/              # Nested workspace: 6 AI providers
│   ├── cli/             # CLI framework
│   ├── cluster/         # Distributed primitives
│   ├── rpc/             # RPC framework
│   ├── experimental/    # Unstable features
│   ├── typeclass/       # FP abstractions
│   ├── vitest/          # Test integration
│   └── ...
├── scripts/             # Build tooling (circular, codemod, version)
└── .github/workflows/   # CI: check, pages, release, snapshot
```

## WHERE TO LOOK

| Task           | Location                        | Notes                              |
| -------------- | ------------------------------- | ---------------------------------- |
| Core types     | `packages/effect/src/*.ts`      | Effect, Stream, Schema, Layer      |
| Implementation | `packages/effect/src/internal/` | Never import directly              |
| Platform IO    | `packages/platform/src/`        | FileSystem, HttpClient, HttpServer |
| SQL queries    | `packages/sql/src/`             | SqlClient, Statement, Migrator     |
| AI providers   | `packages/ai/*/src/`            | OpenAI, Anthropic, Google, etc     |
| Test utilities | `packages/vitest/src/`          | it.effect, it.live, it.scoped      |
| CLI building   | `packages/cli/src/`             | Command, Options, Args             |

## CONVENTIONS

### Code Style

- **No semicolons**, double quotes, no trailing commas
- **2-space indent**, 120 char line width
- **Array<T>** not T[] (generic syntax)
- **`_` prefix** for unused vars/args
- **No console** in src/test dirs
- **No barrel imports** in src (import from subpaths)

### Module Pattern

- Public API: `src/*.ts` (re-exports from internal)
- Implementation: `src/internal/*.ts` (blocked via package.json exports)
- Entry: `src/index.ts` (every package)

### Naming

- **TypeId**: `Symbol.for("effect/Foo")` for nominal types
- **OpCodes**: `OP_*` constants in `internal/opCodes/`
- **STM types**: `t` prefix (tRef, tQueue, tMap)
- **Patch types**: `*Patch.ts` suffix

### API Design

- **Pipeable**: All types implement `Pipeable` interface
- **dual()**: Data-first AND data-last via `Function.dual()`
- **Generator syntax**: `Effect.gen(function*() { ... })`

### Effect Patterns

```typescript
// Service definition
class MyService extends Context.Tag("MyService")<MyService, { ... }>() {
  static Live = Layer.succeed(this, { ... })
}

// Typed error
class MyError extends Schema.TaggedError<MyError>()("MyError", { ... }) {}

// Resource
Effect.acquireRelease(acquire, release)
```

## ANTI-PATTERNS

- **NEVER import from `internal/`** - blocked at package level
- **NEVER use `any`** - type safety enforced
- **NEVER use non-null assertion (`!`)** - model optionality properly
- **NEVER use `as Type`** - use Schema/refinements
- **NEVER use `Array.push(...spread)`** - ESLint error
- **NEVER mutate** - all data structures immutable by default
- **NEVER throw** - use Effect error channel

## DEPRECATED

- `packages/effect/src/Secret.ts` - Multiple methods deprecated
- Check `@deprecated` JSDoc before using any API

## COMMANDS

```bash
# Development
pnpm check              # Type check all packages
pnpm test               # Run vitest
pnpm lint               # ESLint
pnpm lint-fix           # Auto-fix

# Build
pnpm build              # Full build (tsc + babel)
pnpm codegen            # Generate code

# Validation
pnpm circular           # Check circular deps
pnpm test-types         # tstyche type tests

# Release
pnpm changeset-version  # Bump versions
pnpm changeset-publish  # Build + test + publish
```

## TESTING

```typescript
import { describe, it } from "@effect/vitest"
import { Effect } from "effect"

describe("MyFeature", () => {
  it.effect("description", () =>
    Effect.gen(function* () {
      // TestClock, TestServices available
    })
  )

  it.live("real IO", () =>
    Effect.gen(function* () {
      // No test services
    })
  )

  it.scoped("with scope", () =>
    Effect.gen(function* () {
      // Automatic scope management
    })
  )
})
```

**Assertions**: `deepStrictEqual`, `strictEqual` from `@effect/vitest/utils`

## NOTES

- **pnpm only** - strict package manager
- **ESM-first** - `type: "module"` in all packages
- **TS 5.4+** - Uses latest features
- **Bun tests disabled** - See check.yml:49 comment
- **Nested AI workspace** - `packages/ai/*` has 6 sub-packages
- **`.index.ts` files** - Internal index re-exports (dot prefix)
