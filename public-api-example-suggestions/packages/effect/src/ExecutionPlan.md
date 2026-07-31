# Example Suggestions: `effect/ExecutionPlan`

- **Package:** `effect`
- **Source:** `packages/effect/src/ExecutionPlan.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 2 recommended, 10 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind                    | Priority        |
| -------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/ExecutionPlan.isExecutionPlan`                   |   62 | `root-declaration`      | **recommended** |
| `effect/ExecutionPlan.merge`                             |  332 | `root-declaration`      | **recommended** |
| `effect/ExecutionPlan.Metadata`                          |  352 | `root-declaration`      | **optional**    |
| `effect/ExecutionPlan.CurrentMetadata`                   |  369 | `root-declaration`      | **optional**    |
| `effect/ExecutionPlan.ExecutionPlan.captureRequirements` |  111 | `member`                | **optional**    |
| `effect/ExecutionPlan.ConfigBase`                        |  136 | `root-declaration`      | **optional**    |
| `effect/ExecutionPlan.make`                              |  204 | `namespace`             | **optional**    |
| `effect/ExecutionPlan.make.Step`                         |  217 | `namespace-declaration` | **optional**    |
| `effect/ExecutionPlan.make.StepProvides`                 |  231 | `namespace-declaration` | **optional**    |
| `effect/ExecutionPlan.make.PlanProvides`                 |  248 | `namespace-declaration` | **optional**    |
| `effect/ExecutionPlan.make.StepInput`                    |  260 | `namespace-declaration` | **optional**    |
| `effect/ExecutionPlan.make.PlanInput`                    |  277 | `namespace-declaration` | **optional**    |
| `effect/ExecutionPlan.TypeId (type)`                     |   30 | `root-declaration`      | **discouraged** |
| `effect/ExecutionPlan.TypeId (value)`                    |   39 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/ExecutionPlan.isExecutionPlan`

- **Source:** `packages/effect/src/ExecutionPlan.ts:62`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if a value is an `ExecutionPlan` by checking for the `ExecutionPlan.TypeId` marker.
- **Signature hint:** `declare function isExecutionPlan(u: unknown): u is ExecutionPlan<any>`
- **Import guidance:** Start from `import { ExecutionPlan } from "effect"` and use `ExecutionPlan.isExecutionPlan`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `ExecutionPlan.isExecutionPlan` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ExecutionPlan.merge`

- **Source:** `packages/effect/src/ExecutionPlan.ts:332`
- **Kind / category:** `root-declaration` / `combining`
- **Priority:** **recommended**
- **Current description:** Combines multiple execution plans by concatenating their steps in order.
- **Signature hint:** `declare function merge<const Plans extends NonEmptyReadonlyArray<ExecutionPlan<any>>>(...plans: Plans): ExecutionPlan<{ provides: make.PlanProvides<Plans>; input: make.PlanInput<Plans>; error: Plans[number] extends ExecutionPlan<infer T> ? T['error'] : never; requirements: Plans[number] extends ExecutionPlan<infer T> ? T['requirements'] : never; }>`
- **Import guidance:** Start from `import { ExecutionPlan } from "effect"` and use `ExecutionPlan.merge`.
- **Suggested snippet:** Apply `ExecutionPlan.merge` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/ExecutionPlan.Metadata`

- **Source:** `packages/effect/src/ExecutionPlan.ts:352`
- **Kind / category:** `root-declaration` / `metadata`
- **Priority:** **optional**
- **Current description:** Metadata describing the currently running execution-plan attempt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ExecutionPlan.Metadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ExecutionPlan.CurrentMetadata`

- **Source:** `packages/effect/src/ExecutionPlan.ts:369`
- **Kind / category:** `root-declaration` / `metadata`
- **Priority:** **optional**
- **Current description:** Context reference containing metadata for the currently running execution-plan attempt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ExecutionPlan } from "effect"` and use `ExecutionPlan.CurrentMetadata`.
- **Suggested snippet:** Consume `ExecutionPlan.CurrentMetadata` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ExecutionPlan.ExecutionPlan.captureRequirements`

- **Source:** `packages/effect/src/ExecutionPlan.ts:111`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns an equivalent `ExecutionPlan` with the requirements satisfied, using the current context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/ExecutionPlan.ExecutionPlan.captureRequirements` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ExecutionPlan.ConfigBase`

- **Source:** `packages/effect/src/ExecutionPlan.ts:136`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base type-level configuration carried by an `ExecutionPlan`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ExecutionPlan.ConfigBase`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ExecutionPlan.make`

- **Source:** `packages/effect/src/ExecutionPlan.ts:204`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type helpers used by `ExecutionPlan.make`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ExecutionPlan.make`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ExecutionPlan.make.Step`

- **Source:** `packages/effect/src/ExecutionPlan.ts:217`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input shape for a single execution-plan step.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ExecutionPlan.make.Step`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ExecutionPlan.make.StepProvides`

- **Source:** `packages/effect/src/ExecutionPlan.ts:231`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the intersection of services provided by a list of execution-plan steps.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ExecutionPlan.make.StepProvides`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ExecutionPlan.make.PlanProvides`

- **Source:** `packages/effect/src/ExecutionPlan.ts:248`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the intersection of services provided by a list of execution plans.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ExecutionPlan.make.PlanProvides`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ExecutionPlan.make.StepInput`

- **Source:** `packages/effect/src/ExecutionPlan.ts:260`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the input type consumed by the `while` predicates and schedules in a list of execution-plan steps.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ExecutionPlan.make.StepInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ExecutionPlan.make.PlanInput`

- **Source:** `packages/effect/src/ExecutionPlan.ts:277`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the combined input type consumed by a list of execution plans.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ExecutionPlan.make.PlanInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/ExecutionPlan.TypeId (type)`

- **Source:** `packages/effect/src/ExecutionPlan.ts:30`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** String literal type used as the runtime type identifier for `ExecutionPlan` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/ExecutionPlan.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/ExecutionPlan.TypeId (value)`

- **Source:** `packages/effect/src/ExecutionPlan.ts:39`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier attached to `ExecutionPlan` values and used by `isExecutionPlan`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ExecutionPlan } from "effect"` and use `ExecutionPlan.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `ExecutionPlan.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
