# Example Suggestions: `@effect/docgen/Checker`

- **Package:** `@effect/docgen`
- **Source:** `packages/tools/docgen/src/Checker.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 9 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind               | Priority        |
| ----------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/docgen/Checker.checkFunctions`   |   93 | `root-declaration` | **recommended** |
| `@effect/docgen/Checker.checkClasses`     |  121 | `root-declaration` | **recommended** |
| `@effect/docgen/Checker.checkConstants`   |  137 | `root-declaration` | **recommended** |
| `@effect/docgen/Checker.checkInterfaces`  |  153 | `root-declaration` | **recommended** |
| `@effect/docgen/Checker.checkTypeAliases` |  169 | `root-declaration` | **recommended** |
| `@effect/docgen/Checker.checkNamespaces`  |  193 | `root-declaration` | **recommended** |
| `@effect/docgen/Checker.checkExports`     |  209 | `root-declaration` | **recommended** |
| `@effect/docgen/Checker.checkModule`      |  219 | `root-declaration` | **recommended** |
| `@effect/docgen/Checker.checkModules`     |  246 | `root-declaration` | **recommended** |

## Recommended

### `@effect/docgen/Checker.checkFunctions`

- **Source:** `packages/tools/docgen/src/Checker.ts:93`
- **Kind / category:** `root-declaration` / `validation`
- **Priority:** **recommended**
- **Current description:** Validates documentation for function declarations.
- **Signature hint:** `declare function checkFunctions(models: ReadonlyArray<Domain.Function>): Effect.Effect<string[], never, Configuration.Configuration | Parser.Source>`
- **Import guidance:** Start from `import { checkFunctions } from "@effect/docgen/Checker"` and use `checkFunctions`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `checkFunctions`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Checker.checkClasses`

- **Source:** `packages/tools/docgen/src/Checker.ts:121`
- **Kind / category:** `root-declaration` / `validation`
- **Priority:** **recommended**
- **Current description:** Validates documentation for class declarations and their documented members.
- **Signature hint:** `declare function checkClasses(models: ReadonlyArray<Domain.Class>): Effect.Effect<string[], never, Configuration.Configuration | Parser.Source>`
- **Import guidance:** Start from `import { checkClasses } from "@effect/docgen/Checker"` and use `checkClasses`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `checkClasses`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Checker.checkConstants`

- **Source:** `packages/tools/docgen/src/Checker.ts:137`
- **Kind / category:** `root-declaration` / `validation`
- **Priority:** **recommended**
- **Current description:** Validates documentation for constant declarations.
- **Signature hint:** `declare function checkConstants(models: ReadonlyArray<Domain.Constant>): Effect.Effect<string[], never, Configuration.Configuration | Parser.Source>`
- **Import guidance:** Start from `import { checkConstants } from "@effect/docgen/Checker"` and use `checkConstants`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `checkConstants`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Checker.checkInterfaces`

- **Source:** `packages/tools/docgen/src/Checker.ts:153`
- **Kind / category:** `root-declaration` / `validation`
- **Priority:** **recommended**
- **Current description:** Validates documentation for interface declarations.
- **Signature hint:** `declare function checkInterfaces(models: ReadonlyArray<Domain.Interface>): Effect.Effect<string[], never, Configuration.Configuration | Parser.Source>`
- **Import guidance:** Start from `import { checkInterfaces } from "@effect/docgen/Checker"` and use `checkInterfaces`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `checkInterfaces`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Checker.checkTypeAliases`

- **Source:** `packages/tools/docgen/src/Checker.ts:169`
- **Kind / category:** `root-declaration` / `validation`
- **Priority:** **recommended**
- **Current description:** Validates documentation for type alias declarations.
- **Signature hint:** `declare function checkTypeAliases(models: ReadonlyArray<Domain.TypeAlias>): Effect.Effect<string[], never, Configuration.Configuration | Parser.Source>`
- **Import guidance:** Start from `import { checkTypeAliases } from "@effect/docgen/Checker"` and use `checkTypeAliases`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `checkTypeAliases`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Checker.checkNamespaces`

- **Source:** `packages/tools/docgen/src/Checker.ts:193`
- **Kind / category:** `root-declaration` / `validation`
- **Priority:** **recommended**
- **Current description:** Validates documentation for namespaces and their nested declarations.
- **Signature hint:** `declare function checkNamespaces(models: ReadonlyArray<Domain.Namespace>): Effect.Effect<string[], never, Configuration.Configuration | Parser.Source>`
- **Import guidance:** Start from `import { checkNamespaces } from "@effect/docgen/Checker"` and use `checkNamespaces`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `checkNamespaces`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Checker.checkExports`

- **Source:** `packages/tools/docgen/src/Checker.ts:209`
- **Kind / category:** `root-declaration` / `validation`
- **Priority:** **recommended**
- **Current description:** Validates documentation for explicit export declarations.
- **Signature hint:** `declare function checkExports(models: ReadonlyArray<Domain.Export>): Effect.Effect<string[], never, Configuration.Configuration | Parser.Source>`
- **Import guidance:** Start from `import { checkExports } from "@effect/docgen/Checker"` and use `checkExports`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `checkExports`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Checker.checkModule`

- **Source:** `packages/tools/docgen/src/Checker.ts:219`
- **Kind / category:** `root-declaration` / `validation`
- **Priority:** **recommended**
- **Current description:** Validates every documented declaration in a parsed module.
- **Signature hint:** `declare function checkModule(module: Domain.Module): Effect.Effect<string[], never, Configuration.Configuration>`
- **Import guidance:** Start from `import { checkModule } from "@effect/docgen/Checker"` and use `checkModule`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `checkModule`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Checker.checkModules`

- **Source:** `packages/tools/docgen/src/Checker.ts:246`
- **Kind / category:** `root-declaration` / `validation`
- **Priority:** **recommended**
- **Current description:** Validates every documented declaration in a collection of parsed modules.
- **Signature hint:** `declare function checkModules(modules: ReadonlyArray<Domain.Module>): Effect.Effect<string[], never, Configuration.Configuration>`
- **Import guidance:** Start from `import { checkModules } from "@effect/docgen/Checker"` and use `checkModules`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `checkModules`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
