# Example Suggestions: `effect/Crypto`

- **Package:** `effect`
- **Source:** `packages/effect/src/Crypto.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 1 recommended, 10 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                     | Line | Kind               | Priority        |
| --------------------------------------- | ---: | ------------------ | --------------- |
| `effect/Crypto.Crypto`                  |  174 | `root-declaration` | **recommended** |
| `effect/Crypto.Crypto.randomBytes`      |   93 | `member`           | **optional**    |
| `effect/Crypto.Crypto.digest`           |   98 | `member`           | **optional**    |
| `effect/Crypto.Crypto.random`           |  107 | `member`           | **optional**    |
| `effect/Crypto.Crypto.randomBoolean`    |  112 | `member`           | **optional**    |
| `effect/Crypto.Crypto.randomInt`        |  118 | `member`           | **optional**    |
| `effect/Crypto.Crypto.randomBetween`    |  124 | `member`           | **optional**    |
| `effect/Crypto.Crypto.randomIntBetween` |  135 | `member`           | **optional**    |
| `effect/Crypto.Crypto.randomShuffle`    |  143 | `member`           | **optional**    |
| `effect/Crypto.Crypto.randomUUIDv4`     |  148 | `member`           | **optional**    |
| `effect/Crypto.Crypto.randomUUIDv7`     |  153 | `member`           | **optional**    |
| `effect/Crypto.Crypto.nextIntUnsafe`    |   83 | `member`           | **discouraged** |
| `effect/Crypto.Crypto.nextDoubleUnsafe` |   88 | `member`           | **discouraged** |

## Recommended

### `effect/Crypto.Crypto`

- **Source:** `packages/effect/src/Crypto.ts:174`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for platform cryptography.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Crypto } from "effect"` and use `Crypto.Crypto`.
- **Suggested snippet:** Consume `Crypto.Crypto` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Crypto.Crypto.randomBytes`

- **Source:** `packages/effect/src/Crypto.ts:93`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generates cryptographically secure random bytes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.randomBytes` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Crypto.Crypto.digest`

- **Source:** `packages/effect/src/Crypto.ts:98`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Computes a cryptographic digest for the supplied data.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.digest` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Crypto.Crypto.random`

- **Source:** `packages/effect/src/Crypto.ts:107`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generates a cryptographically secure random number between 0 (inclusive) and 1 (exclusive).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.random` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Crypto.Crypto.randomBoolean`

- **Source:** `packages/effect/src/Crypto.ts:112`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generates a cryptographically secure random boolean.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.randomBoolean` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Crypto.Crypto.randomInt`

- **Source:** `packages/effect/src/Crypto.ts:118`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generates a cryptographically secure random integer between `Number.MIN_SAFE_INTEGER` and `Number.MAX_SAFE_INTEGER` (both inclusive).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.randomInt` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Crypto.Crypto.randomBetween`

- **Source:** `packages/effect/src/Crypto.ts:124`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generates a cryptographically secure random number between `min` (inclusive) and `max` (exclusive).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.randomBetween` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Crypto.Crypto.randomIntBetween`

- **Source:** `packages/effect/src/Crypto.ts:135`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generates a cryptographically secure random integer between `min` and `max`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.randomIntBetween` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Crypto.Crypto.randomShuffle`

- **Source:** `packages/effect/src/Crypto.ts:143`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Uses the cryptographically secure random generator to shuffle the supplied iterable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.randomShuffle` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Crypto.Crypto.randomUUIDv4`

- **Source:** `packages/effect/src/Crypto.ts:148`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generates a cryptographically secure UUIDv4 string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.randomUUIDv4` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Crypto.Crypto.randomUUIDv7`

- **Source:** `packages/effect/src/Crypto.ts:153`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generates a cryptographically secure UUIDv7 string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Crypto.Crypto.randomUUIDv7` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Crypto.Crypto.nextIntUnsafe`

- **Source:** `packages/effect/src/Crypto.ts:83`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Generates a random integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (both inclusive).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Crypto.Crypto.nextIntUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Crypto.Crypto.nextDoubleUnsafe`

- **Source:** `packages/effect/src/Crypto.ts:88`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Generates a random number in the range 0 (inclusive) to 1 (exclusive).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Crypto.Crypto.nextDoubleUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
