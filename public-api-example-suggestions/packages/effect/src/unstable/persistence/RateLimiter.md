# Example Suggestions: `effect/unstable/persistence/RateLimiter`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts`
- **Uncovered API records:** 41
- **Priorities:** 0 required, 9 recommended, 27 optional, 5 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                             | Line | Kind               | Priority        |
| ------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/persistence/RateLimiter.layerStoreRedis`                       | 1332 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/RateLimiter.layerStoreRedisConfig`                 | 1347 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/RateLimiter.RateLimiter (value)`                   |   73 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/RateLimiter.layer`                                 |  226 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/RateLimiter.RateLimitExceeded`                     |  370 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/RateLimiter.RateLimitStoreError`                   |  395 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/RateLimiter.RateLimiterErrorReason (value)`        |  417 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/RateLimiter.RateLimiterError`                      |  429 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/RateLimiter.makeStoreRedis`                        |  891 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/RateLimiter.make`                                  |   86 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.RateLimiterErrorReason (type)`         |  409 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.RateLimiterStore`                      |  592 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.layerStoreMemory`                      |  672 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.RateLimiter (type)`                    |   45 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.RateLimitExceeded.message`             |  384 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.ConsumeResult`                         |  465 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.ConsumeResult.delay`                   |  471 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.ConsumeResult.limit`                   |  476 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.ConsumeResult.remaining`               |  481 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.ConsumeResult.resetAfter`              |  486 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptivePhase`                         |  495 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions`                |  503 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.key`            |  507 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.tokens`         |  512 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.fallbackLimit`  |  517 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.fallbackWindow` |  522 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult`                 |  531 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult.delay`           |  535 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult.epoch`           |  540 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult.phase`           |  545 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions`               |  554 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.key`           |  558 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.epoch`         |  563 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.tokens`        |  568 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.status`        |  573 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.retryAfter`    |  578 | `member`           | **optional**    |
| `effect/unstable/persistence/RateLimiter.TypeId (value)`                        |   28 | `root-declaration` | **discouraged** |
| `effect/unstable/persistence/RateLimiter.TypeId (type)`                         |   36 | `root-declaration` | **discouraged** |
| `effect/unstable/persistence/RateLimiter.ErrorTypeId (value)`                   |  350 | `root-declaration` | **discouraged** |
| `effect/unstable/persistence/RateLimiter.ErrorTypeId (type)`                    |  358 | `root-declaration` | **discouraged** |
| `effect/unstable/persistence/RateLimiter.RateLimiterError.ErrorTypeId`          |  452 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/persistence/RateLimiter.layerStoreRedis`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:1332`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a Redis-backed `RateLimiterStore` using `makeStoreRedis`.
- **Signature hint:** `declare function layerStoreRedis(options?: { readonly prefix?: string | undefined; }): Layer.Layer<RateLimiterStore, never, Redis.Redis>`
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.layerStoreRedis`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RateLimiter.layerStoreRedis`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/RateLimiter.layerStoreRedisConfig`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:1347`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a Redis-backed `RateLimiterStore` from wrapped configuration options.
- **Signature hint:** `declare function layerStoreRedisConfig(options: Config.Wrap<{ readonly prefix?: string | undefined; }>): Layer.Layer<RateLimiterStore, Config.ConfigError, Redis.Redis>`
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.layerStoreRedisConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RateLimiter.layerStoreRedisConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/RateLimiter.RateLimiter (value)`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:73`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for persistent token-consumption services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.RateLimiter`.
- **Suggested snippet:** Consume `RateLimiter.RateLimiter` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/RateLimiter.layer`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:226`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `RateLimiter` using the current `RateLimiterStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RateLimiter.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/RateLimiter.RateLimitExceeded`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:370`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason for a rate-limit check that exceeded the configured limit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.RateLimitExceeded`.
- **Suggested snippet:** Create or capture `RateLimiter.RateLimitExceeded` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/RateLimiter.RateLimitStoreError`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:395`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason for failures in the backing `RateLimiterStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.RateLimitStoreError`.
- **Suggested snippet:** Create or capture `RateLimiter.RateLimitStoreError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/RateLimiter.RateLimiterErrorReason (value)`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:417`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Schema for all reasons that can be carried by `RateLimiterError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.RateLimiterErrorReason`.
- **Suggested snippet:** Create or capture `RateLimiter.RateLimiterErrorReason` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/RateLimiter.RateLimiterError`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:429`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised by rate limiter operations, wrapping a concrete failure `reason`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.RateLimiterError`.
- **Suggested snippet:** Create or capture `RateLimiter.RateLimiterError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/RateLimiter.makeStoreRedis`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:891`
- **Kind / category:** `root-declaration` / `RateLimiterStore`
- **Priority:** **recommended**
- **Current description:** Creates a Redis-backed `RateLimiterStore` using Lua scripts and the configured key prefix.
- **Signature hint:** `declare function makeStoreRedis(options?: { readonly prefix?: string | undefined; } | undefined): Effect.Effect<{ readonly fixedWindow: (options: { readonly key: string; readonly tokens: number; readonly refillRate: Duration.Duration; readonly limit: number | undefined; }) => Effect.Effect<readonly [count: number, ttl: number], RateLimiterError>; readonly tokenBucket: (options: { readonly key: string; readonly tokens: number; readonly limit: number; readonly refillRate: Duration.Duration; readonly allowOverflow: boolean; }) => Effect.Effect<number, RateLimiterError>; readonly adaptiveConsume: (options: AdaptiveConsumeOptions) => Effect.Effect<AdaptiveConsumeResult, RateLimiterError>; readonly adaptiveFeedback: (options: AdaptiveFeedbackOptions) => Effect.Effect<void, RateLimiterError>; }, never, Redis.Redis>`
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.makeStoreRedis`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RateLimiter.makeStoreRedis`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/persistence/RateLimiter.make`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:86`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `RateLimiter` from the current `RateLimiterStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.make`.
- **Suggested snippet:** Construct one representative value with `RateLimiter.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.RateLimiterErrorReason (type)`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:409`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of reasons carried by `RateLimiterError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/RateLimiter.RateLimiterErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.RateLimiterStore`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:592`
- **Kind / category:** `root-declaration` / `store`
- **Priority:** **optional**
- **Current description:** Defines the low-level backing store for rate-limit state.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.RateLimiterStore`.
- **Suggested snippet:** Consume `RateLimiter.RateLimiterStore` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.layerStoreMemory`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:672`
- **Kind / category:** `root-declaration` / `RateLimiterStore`
- **Priority:** **optional**
- **Current description:** Provides a process-local in-memory `RateLimiterStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.layerStoreMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RateLimiter.layerStoreMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.RateLimiter (type)`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:45`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service for consuming rate-limit tokens for a key using fixed-window or token-bucket algorithms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/RateLimiter.RateLimiter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.RateLimitExceeded.message`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:384`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Public message used when the rate limiter rejects a request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.RateLimitExceeded.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.ConsumeResult`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:465`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Metadata returned after consuming tokens from a rate limiter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/RateLimiter.ConsumeResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.ConsumeResult.delay`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:471`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The amount of delay to wait before making the next request, when the rate limiter is using the "delay" `onExceeded` strategy. It will be Duration.zero if the request is allowed immediately.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.ConsumeResult.delay` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.ConsumeResult.limit`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:476`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The maximum number of requests allowed in the current window.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.ConsumeResult.limit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.ConsumeResult.remaining`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:481`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The number of remaining requests in the current window.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.ConsumeResult.remaining` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.ConsumeResult.resetAfter`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:486`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The time until the rate limit fully resets.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.ConsumeResult.resetAfter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptivePhase`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:495`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Phase of adaptive rate limiting driven by server feedback.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/RateLimiter.AdaptivePhase`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:503`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Options for consuming tokens from the adaptive rate limiter store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.key`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:507`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The rate-limit key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.key` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.tokens`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:512`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The number of tokens to consume.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.tokens` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.fallbackLimit`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:517`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The fallback limit configured for the regular rate limiter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.fallbackLimit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.fallbackWindow`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:522`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The fallback window configured for the regular rate limiter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveConsumeOptions.fallbackWindow` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:531`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Metadata returned after consuming tokens from the adaptive rate limiter store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult.delay`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:535`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The amount of delay to wait before making the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult.delay` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult.epoch`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:540`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The adaptive state epoch used to correlate later response feedback.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult.epoch` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult.phase`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:545`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The adaptive phase observed by this consume operation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveConsumeResult.phase` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:554`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Options for reporting response feedback to the adaptive rate limiter store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.key`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:558`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The rate-limit key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.key` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.epoch`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:563`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The adaptive state epoch returned by `adaptiveConsume`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.epoch` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.tokens`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:568`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The number of tokens consumed by the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.tokens` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.status`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:573`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The HTTP response status code.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.status` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.retryAfter`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:578`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The parsed `Retry-After` delay, when present.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/RateLimiter.AdaptiveFeedbackOptions.retryAfter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/persistence/RateLimiter.TypeId (value)`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:28`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier for `RateLimiter` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RateLimiter.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/persistence/RateLimiter.TypeId (type)`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:36`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to brand `RateLimiter` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/persistence/RateLimiter.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/persistence/RateLimiter.ErrorTypeId (value)`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:350`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier for `RateLimiterError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RateLimiter } from "effect/unstable/persistence"` and use `RateLimiter.ErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RateLimiter.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/persistence/RateLimiter.ErrorTypeId (type)`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:358`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to brand `RateLimiterError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/persistence/RateLimiter.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/persistence/RateLimiter.RateLimiterError.ErrorTypeId`

- **Source:** `packages/effect/src/unstable/persistence/RateLimiter.ts:452`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a rate limiter error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/persistence/RateLimiter.RateLimiterError.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
