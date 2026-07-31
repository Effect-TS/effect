# Example Suggestions: `effect/Channel`

- **Package:** `effect`
- **Source:** `packages/effect/src/Channel.ts`
- **Uncovered API records:** 82
- **Priorities:** 3 required, 25 recommended, 50 optional, 4 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                     | Line | Kind               | Priority        |
| --------------------------------------- | ---: | ------------------ | --------------- |
| `effect/Channel.scoped`                 | 6815 | `root-declaration` | **required**    |
| `effect/Channel.interruptWhen`          | 7034 | `root-declaration` | **required**    |
| `effect/Channel.onError`                | 7106 | `root-declaration` | **required**    |
| `effect/Channel.fromTransformBracket`   |  399 | `root-declaration` | **recommended** |
| `effect/Channel.provide`                | 7460 | `root-declaration` | **recommended** |
| `effect/Channel.toQueueArray`           | 8443 | `root-declaration` | **recommended** |
| `effect/Channel.toPubSub`               | 8496 | `root-declaration` | **recommended** |
| `effect/Channel.toPubSubArray`          | 8622 | `root-declaration` | **recommended** |
| `effect/Channel.fromEffectDone`         | 1101 | `root-declaration` | **recommended** |
| `effect/Channel.fromEffectDrain`        | 1112 | `root-declaration` | **recommended** |
| `effect/Channel.mapDone`                | 1972 | `root-declaration` | **recommended** |
| `effect/Channel.mapDoneEffect`          | 2001 | `root-declaration` | **recommended** |
| `effect/Channel.mapInput`               | 2219 | `root-declaration` | **recommended** |
| `effect/Channel.mapInputError`          | 2247 | `root-declaration` | **recommended** |
| `effect/Channel.combine`                | 2770 | `root-declaration` | **recommended** |
| `effect/Channel.filterMap`              | 3373 | `root-declaration` | **recommended** |
| `effect/Channel.filterEffect`           | 3417 | `root-declaration` | **recommended** |
| `effect/Channel.filterMapEffect`        | 3469 | `root-declaration` | **recommended** |
| `effect/Channel.filterMapArray`         | 3586 | `root-declaration` | **recommended** |
| `effect/Channel.filterArrayEffect`      | 3635 | `root-declaration` | **recommended** |
| `effect/Channel.filterMapArrayEffect`   | 3677 | `root-declaration` | **recommended** |
| `effect/Channel.tapCause`               | 4150 | `root-declaration` | **recommended** |
| `effect/Channel.catchCauseIf`           | 4238 | `root-declaration` | **recommended** |
| `effect/Channel.catchCauseFilter`       | 4364 | `root-declaration` | **recommended** |
| `effect/Channel.catch`                  | 4565 | `root-declaration` | **recommended** |
| `effect/Channel.tapError`               | 4580 | `root-declaration` | **recommended** |
| `effect/Channel.catchIf`                | 4676 | `root-declaration` | **recommended** |
| `effect/Channel.catchFilter`            | 4919 | `root-declaration` | **recommended** |
| `effect/Channel.toPubSubTake`           | 8728 | `root-declaration` | **optional**    |
| `effect/Channel.endSync`                |  861 | `root-declaration` | **optional**    |
| `effect/Channel.fromEffectTake`         | 1128 | `root-declaration` | **optional**    |
| `effect/Channel.identity`               | 1190 | `root-declaration` | **optional**    |
| `effect/Channel.fromPubSubTake`         | 1615 | `root-declaration` | **optional**    |
| `effect/Channel.fromSchedule`           | 1626 | `root-declaration` | **optional**    |
| `effect/Channel.fromAsyncIterable`      | 1867 | `root-declaration` | **optional**    |
| `effect/Channel.fromAsyncIterableArray` | 1898 | `root-declaration` | **optional**    |
| `effect/Channel.orElseIfEmpty`          | 2888 | `root-declaration` | **optional**    |
| `effect/Channel.flattenTake`            | 3117 | `root-declaration` | **optional**    |
| `effect/Channel.repeat`                 | 3180 | `root-declaration` | **optional**    |
| `effect/Channel.forever`                | 3240 | `root-declaration` | **optional**    |
| `effect/Channel.schedule`               | 3258 | `root-declaration` | **optional**    |
| `effect/Channel.catchTag`               | 5078 | `root-declaration` | **optional**    |
| `effect/Channel.catchReasons`           | 5437 | `root-declaration` | **optional**    |
| `effect/Channel.mapError`               | 5711 | `root-declaration` | **optional**    |
| `effect/Channel.ignore`                 | 5774 | `root-declaration` | **optional**    |
| `effect/Channel.ignoreCause`            | 5836 | `root-declaration` | **optional**    |
| `effect/Channel.retry`                  | 5871 | `root-declaration` | **optional**    |
| `effect/Channel.mergeEffect`            | 6452 | `root-declaration` | **optional**    |
| `effect/Channel.decodeText`             | 6612 | `root-declaration` | **optional**    |
| `effect/Channel.encodeText`             | 6638 | `root-declaration` | **optional**    |
| `effect/Channel.buffer`                 | 6912 | `root-declaration` | **optional**    |
| `effect/Channel.bufferArray`            | 6978 | `root-declaration` | **optional**    |
| `effect/Channel.haltWhen`               | 7067 | `root-declaration` | **optional**    |
| `effect/Channel.onStart`                | 7181 | `root-declaration` | **optional**    |
| `effect/Channel.onFirst`                | 7213 | `root-declaration` | **optional**    |
| `effect/Channel.onEnd`                  | 7249 | `root-declaration` | **optional**    |
| `effect/Channel.contextWith`            | 7341 | `root-declaration` | **optional**    |
| `effect/Channel.provideContext`         | 7355 | `root-declaration` | **optional**    |
| `effect/Channel.provideService`         | 7383 | `root-declaration` | **optional**    |
| `effect/Channel.provideServiceEffect`   | 7423 | `root-declaration` | **optional**    |
| `effect/Channel.updateContext`          | 7508 | `root-declaration` | **optional**    |
| `effect/Channel.updateService`          | 7540 | `root-declaration` | **optional**    |
| `effect/Channel.withSpan`               | 7575 | `root-declaration` | **optional**    |
| `effect/Channel.Do`                     | 7620 | `root-declaration` | **optional**    |
| `effect/Channel.let`                    | 7674 | `root-declaration` | **optional**    |
| `effect/Channel.bind`                   | 7690 | `root-declaration` | **optional**    |
| `effect/Channel.bindTo`                 | 7796 | `root-declaration` | **optional**    |
| `effect/Channel.runForEachWhile`        | 7950 | `root-declaration` | **optional**    |
| `effect/Channel.runDone`                | 8012 | `root-declaration` | **optional**    |
| `effect/Channel.runHead`                | 8028 | `root-declaration` | **optional**    |
| `effect/Channel.runLast`                | 8055 | `root-declaration` | **optional**    |
| `effect/Channel.runFoldEffect`          | 8149 | `root-declaration` | **optional**    |
| `effect/Channel.runIntoQueue`           | 8283 | `root-declaration` | **optional**    |
| `effect/Channel.runIntoQueueArray`      | 8326 | `root-declaration` | **optional**    |
| `effect/Channel.runIntoPubSub`          | 8558 | `root-declaration` | **optional**    |
| `effect/Channel.runIntoPubSubArray`     | 8686 | `root-declaration` | **optional**    |
| `effect/Channel.ChannelUnify`           |  166 | `root-declaration` | **optional**    |
| `effect/Channel.ChannelUnifyIgnore`     |  186 | `root-declaration` | **optional**    |
| `effect/Channel.TypeId (type)`          |   55 | `root-declaration` | **discouraged** |
| `effect/Channel.TypeId (value)`         |   64 | `root-declaration` | **discouraged** |
| `effect/Channel.Variance`               |  207 | `root-declaration` | **discouraged** |
| `effect/Channel.VarianceStruct`         |  231 | `root-declaration` | **discouraged** |

## Required

### `effect/Channel.scoped`

- **Source:** `packages/effect/src/Channel.ts:6815`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Runs a channel with a scope provided for the duration of the channel execution, removing the channel's `Scope` requirement.
- **Signature hint:** `declare function scoped<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>): Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Exclude<Env, Scope.Scope>>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.scoped`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.scoped`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `effect/Channel.interruptWhen`

- **Source:** `packages/effect/src/Channel.ts:7034`
- **Kind / category:** `root-declaration` / `interruption`
- **Priority:** **required**
- **Current description:** Interrupts a channel when another effect completes.
- **Signature hint:** `declare function interruptWhen<OutDone2, OutErr2, Env2>(effect: Effect.Effect<OutDone2, OutErr2, Env2>): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | OutErr2, OutDone | OutDone2, InElem, InErr, InDone, Env2 | Env> declare function interruptWhen<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutDone2, OutErr2, Env2>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, effect: Effect.Effect<OutDone2, OutErr2, Env2>): Channel<OutElem, OutErr | OutErr2, OutDone | OutDone2, InElem, InErr, InDone, Env2 | Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.interruptWhen`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.interruptWhen`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `effect/Channel.onError`

- **Source:** `packages/effect/src/Channel.ts:7106`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **required**
- **Current description:** Attaches a finalizer that runs only when the channel exits with failure.
- **Signature hint:** `declare function onError<OutDone, OutErr, Env2>(finalizer: (cause: Cause.Cause<OutErr>) => Effect.Effect<unknown, never, Env2>): <OutElem, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env2 | Env> declare function onError<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, Env2>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, finalizer: (cause: Cause.Cause<OutErr>) => Effect.Effect<unknown, never, Env2>): Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env2 | Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.onError`.
- **Suggested snippet:** Create or capture `Channel.onError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/Channel.fromTransformBracket`

- **Source:** `packages/effect/src/Channel.ts:399`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Channel` from a transformation function that operates on upstream pulls, but also provides a forked scope that closes when the resulting Channel completes.
- **Signature hint:** `declare function fromTransformBracket<OutElem, OutErr, OutDone, InElem, InErr, InDone, EX, EnvX, Env>(f: (upstream: Pull.Pull<InElem, InErr, InDone>, scope: Scope.Scope, forkedScope: Scope.Scope) => Effect.Effect<Pull.Pull<OutElem, OutErr, OutDone, EnvX>, EX, Env>): Channel<OutElem, Pull.ExcludeDone<OutErr> | EX, OutDone, InElem, InErr, InDone, Env | EnvX>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.fromTransformBracket`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.fromTransformBracket`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.provide`

- **Source:** `packages/effect/src/Channel.ts:7460`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Provides a `Layer` or `Context` to the channel, removing the corresponding service requirements.
- **Signature hint:** `declare function provide<A, E = never, R = never>(layer: Layer.Layer<A, E, R> | Context.Context<A>, options?: { readonly local?: boolean | undefined; } | undefined): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Exclude<Env, A> | R> declare function provide<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, A, E = never, R = never>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, layer: Layer.Layer<A, E, R> | Context.Context<A>, options?: { readonly local?: boolean | undefined; } | undefined): Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Exclude<Env, A> | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.provide`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.provide`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.toQueueArray`

- **Source:** `packages/effect/src/Channel.ts:8443`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped queue and forks an array-emitting channel to feed it.
- **Signature hint:** `declare function toQueueArray(options: { readonly capacity: 'unbounded'; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; }): <OutElem, OutErr, OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<Queue.Dequeue<OutElem, OutErr | Cause.Done>, never, Env | Scope.Scope> declare function toQueueArray<OutElem, OutErr, OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, unknown, unknown, unknown, Env>, options: { readonly capacity: 'unbounded'; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; }): Effect.Effect<Queue.Dequeue<OutElem, OutErr | Cause.Done>, never, Env | Scope.Scope>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.toQueueArray`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.toQueueArray`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.toPubSub`

- **Source:** `packages/effect/src/Channel.ts:8496`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **recommended**
- **Current description:** Converts a channel to a PubSub for concurrent consumption.
- **Signature hint:** `declare function toPubSub(options: { readonly capacity: 'unbounded'; readonly replay?: number | undefined; readonly shutdownOnEnd?: boolean | undefined; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; readonly replay?: number | undefined; readonly shutdownOnEnd?: boolean | undefined; }): <OutElem, OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<PubSub.PubSub<OutElem>, never, Env | Scope.Scope> declare function toPubSub<OutElem, OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>, options: { readonly capacity: 'unbounded'; readonly replay?: number | undefined; readonly shutdownOnEnd?: boolean | undefined; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; readonly replay?: number | undefined; readonly shutdownOnEnd?: boolean | undefined; }): Effect.Effect<PubSub.PubSub<OutElem>, never, Env | Scope.Scope>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.toPubSub`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.toPubSub`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.toPubSubArray`

- **Source:** `packages/effect/src/Channel.ts:8622`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **recommended**
- **Current description:** Converts an array-emitting channel to a scoped `PubSub` for concurrent consumption.
- **Signature hint:** `declare function toPubSubArray(options: { readonly capacity: 'unbounded'; readonly replay?: number | undefined; readonly shutdownOnEnd?: boolean | undefined; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; readonly replay?: number | undefined; readonly shutdownOnEnd?: boolean | undefined; }): <OutElem, OutErr, OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<PubSub.PubSub<OutElem>, never, Env | Scope.Scope> declare function toPubSubArray<OutElem, OutErr, OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, unknown, unknown, unknown, Env>, options: { readonly capacity: 'unbounded'; readonly replay?: number | undefined; readonly shutdownOnEnd?: boolean | undefined; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; readonly replay?: number | undefined; readonly shutdownOnEnd?: boolean | undefined; }): Effect.Effect<PubSub.PubSub<OutElem>, never, Env | Scope.Scope>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.toPubSubArray`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.toPubSubArray`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.fromEffectDone`

- **Source:** `packages/effect/src/Channel.ts:1101`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a channel that evaluates an effect and uses its successful value as the channel's done value without emitting any output elements.
- **Signature hint:** `declare function fromEffectDone<A, E, R>(effect: Effect.Effect<A, E, R>): Channel<never, Pull.ExcludeDone<E>, A, unknown, unknown, unknown, R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.fromEffectDone`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.fromEffectDone`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.fromEffectDrain`

- **Source:** `packages/effect/src/Channel.ts:1112`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Uses an effect and discards its result.
- **Signature hint:** `declare function fromEffectDrain<A, E, R>(effect: Effect.Effect<A, E, R>): Channel<never, E, void, unknown, unknown, unknown, R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.fromEffectDrain`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.fromEffectDrain`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.mapDone`

- **Source:** `packages/effect/src/Channel.ts:1972`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Maps the done value of this channel using the specified function.
- **Signature hint:** `declare function mapDone<OutDone, OutDone2>(f: (o: OutDone) => OutDone2): <OutElem, OutErr, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr, OutDone2, InElem, InErr, InDone, Env> declare function mapDone<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutDone2>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, f: (o: OutDone) => OutDone2): Channel<OutElem, OutErr, OutDone2, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.mapDone`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.mapDone`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.mapDoneEffect`

- **Source:** `packages/effect/src/Channel.ts:2001`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Maps the done value of this channel using the specified effectful function.
- **Signature hint:** `declare function mapDoneEffect<OutDone, OutDone2, E, R>(f: (o: OutDone) => Effect.Effect<OutDone2, E, R>): <OutElem, OutErr, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | E, OutDone2, InElem, InErr, InDone, Env | R> declare function mapDoneEffect<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutDone2, E, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, f: (o: OutDone) => Effect.Effect<OutDone2, E, R>): Channel<OutElem, OutErr | E, OutDone2, InElem, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.mapDoneEffect`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.mapDoneEffect`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.mapInput`

- **Source:** `packages/effect/src/Channel.ts:2219`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Returns a new channel which is the same as this one but applies the given function to the input channel’s input elements.
- **Signature hint:** `declare function mapInput<InElem, InElem2, InErr, R = never>(f: (i: InElem2) => Effect.Effect<InElem, InErr, R>): <OutElem, OutErr, OutDone, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env | R>) => Channel<OutElem, OutErr, OutDone, InElem2, InErr, InDone, Env> declare function mapInput<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, InElem2, R = never>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, f: (i: InElem2) => Effect.Effect<InElem, InErr, R>): Channel<OutElem, OutErr, OutDone, InElem2, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.mapInput`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.mapInput`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.mapInputError`

- **Source:** `packages/effect/src/Channel.ts:2247`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Returns a new channel which is the same as this one but applies the given function to the input errors.
- **Signature hint:** `declare function mapInputError<InErr, InErr2, R = never>(f: (i: InErr2) => Effect.Effect<InErr, InErr, R>): <OutElem, OutErr, OutDone, InElem, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env | R>) => Channel<OutElem, OutErr, OutDone, InElem, InErr2, InDone, Env> declare function mapInputError<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, InErr2, R = never>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, f: (i: InErr2) => Effect.Effect<InErr, InErr, R>): Channel<OutElem, OutErr, OutDone, InElem, InErr2, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.mapInputError`.
- **Suggested snippet:** Create or capture `Channel.mapInputError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.combine`

- **Source:** `packages/effect/src/Channel.ts:2770`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **recommended**
- **Current description:** Combines two channels with a stateful pull function.
- **Signature hint:** `declare function combine<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2, S, OutElem, OutErr, OutDone, A, E, R>(that: Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>, s: LazyArg<S>, f: (s: S, pullLeft: Pull.Pull<OutElem, OutErr, OutDone>, pullRight: Pull.Pull<OutElem2, OutErr2, OutDone2>) => Effect.Effect<readonly [A, S], E, R>): <InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<A, Pull.ExcludeDone<E>, Cause.Done.Extract<E>, InElem & InElem2, InErr & InErr2, InDone & InDone2, Env | Env2 | R> declare function combine<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2, S, A, E, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, that: Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>, s: LazyArg<S>, f: (s: S, pullLeft: Pull.Pull<OutElem, OutErr, OutDone>, pullRight: Pull.Pull<OutElem2, OutErr2, OutDone2>) => Effect.Effect<readonly [A, S], E, R>): Channel<A, Pull.ExcludeDone<E>, Cause.Done.Extract<E>, InElem & InElem2, InErr & InErr2, InDone & InDone2, Env | Env2 | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.combine`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.combine`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.filterMap`

- **Source:** `packages/effect/src/Channel.ts:3373`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters and maps output elements using a `Filter`.
- **Signature hint:** `declare function filterMap<OutElem, B, X>(filter: Filter.Filter<OutElem, B, X>): <OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<B, OutErr, OutDone, InElem, InErr, InDone, Env> declare function filterMap<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, B, X>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, filter: Filter.Filter<OutElem, B, X>): Channel<B, OutErr, OutDone, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.filterMap`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.filterMap`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.filterEffect`

- **Source:** `packages/effect/src/Channel.ts:3417`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters output elements with an effectful predicate.
- **Signature hint:** `declare function filterEffect<OutElem, E, R>(predicate: (a: OutElem) => Effect.Effect<boolean, E, R>): <OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R> declare function filterEffect<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, E, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, predicate: (a: OutElem) => Effect.Effect<boolean, E, R>): Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.filterEffect`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.filterEffect`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.filterMapEffect`

- **Source:** `packages/effect/src/Channel.ts:3469`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters and maps output elements using an effectful `Filter`.
- **Signature hint:** `declare function filterMapEffect<OutElem, B, X, EX, RX>(filter: Filter.FilterEffect<OutElem, B, X, EX, RX>): <OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<B, OutErr | EX, OutDone, InElem, InErr, InDone, Env | RX> declare function filterMapEffect<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, B, X, EX, RX>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, filter: Filter.FilterEffect<OutElem, B, X, EX, RX>): Channel<B, OutErr | EX, OutDone, InElem, InErr, InDone, Env | RX>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.filterMapEffect`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.filterMapEffect`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.filterMapArray`

- **Source:** `packages/effect/src/Channel.ts:3586`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters and maps each element inside emitted non-empty arrays using a `Filter`.
- **Signature hint:** `declare function filterMapArray<OutElem, B, X>(filter: Filter.Filter<Types.NoInfer<OutElem>, B, X>): <OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<Arr.NonEmptyReadonlyArray<B>, OutErr, OutDone, InElem, InErr, InDone, Env> declare function filterMapArray<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, B, X>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env>, filter: Filter.Filter<OutElem, B, X>): Channel<Arr.NonEmptyReadonlyArray<B>, OutErr, OutDone, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.filterMapArray`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.filterMapArray`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.filterArrayEffect`

- **Source:** `packages/effect/src/Channel.ts:3635`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters each element inside emitted non-empty arrays with an effectful predicate.
- **Signature hint:** `declare function filterArrayEffect<OutElem, E, R>(predicate: (a: Types.NoInfer<OutElem>, index: number) => Effect.Effect<boolean, E, R>): <OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr | E, OutDone, InElem, InErr, InDone, Env | R> declare function filterArrayEffect<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, E, R>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env>, predicate: (a: Types.NoInfer<OutElem>, index: number) => Effect.Effect<boolean, E, R>): Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr | E, OutDone, InElem, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.filterArrayEffect`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.filterArrayEffect`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.filterMapArrayEffect`

- **Source:** `packages/effect/src/Channel.ts:3677`
- **Kind / category:** `root-declaration` / `filtering`
- **Priority:** **recommended**
- **Current description:** Filters and maps each element inside emitted non-empty arrays using an effectful `Filter`.
- **Signature hint:** `declare function filterMapArrayEffect<OutElem, B, X, EX, RX>(filter: Filter.FilterEffect<Types.NoInfer<OutElem>, B, X, EX, RX>): <OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<Arr.NonEmptyReadonlyArray<B>, OutErr | EX, OutDone, InElem, InErr, InDone, Env | RX> declare function filterMapArrayEffect<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, B, X, EX, RX>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env>, filter: Filter.FilterEffect<OutElem, B, X, EX, RX>): Channel<Arr.NonEmptyReadonlyArray<B>, OutErr | EX, OutDone, InElem, InErr, InDone, Env | RX>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.filterMapArrayEffect`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.filterMapArrayEffect`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.tapCause`

- **Source:** `packages/effect/src/Channel.ts:4150`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Runs an effect with the full failure `Cause` when the channel fails, then fails the returned channel with the original cause.
- **Signature hint:** `declare function tapCause<OutErr, A, E, R>(f: (d: Cause.Cause<OutErr>) => Effect.Effect<A, E, R>): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | E, OutDone | void, InElem, InErr, InDone, Env | R> declare function tapCause<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, A, E, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, f: (d: Cause.Cause<OutErr>) => Effect.Effect<A, E, R>): Channel<OutElem, OutErr | E, OutDone | void, InElem, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.tapCause`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.tapCause`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.catchCauseIf`

- **Source:** `packages/effect/src/Channel.ts:4238`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Catches causes of failure that match a specific filter, allowing conditional error recovery based on the type of failure.
- **Signature hint:** `declare function catchCauseIf<OutErr, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>(predicate: Predicate.Predicate<Cause.Cause<OutErr>>, f: (cause: Cause.Cause<OutErr>) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem | OutElem1, OutErr | OutErr1, OutDone | OutDone1, InElem & InElem1, InErr & InErr1, InDone & InDone1, Env | Env1> declare function catchCauseIf<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, predicate: Predicate.Predicate<Cause.Cause<OutErr>>, f: (cause: Cause.Cause<OutErr>) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>): Channel<OutElem | OutElem1, OutErr | OutErr1, OutDone | OutDone1, InElem & InElem1, InErr & InErr1, InDone & InDone1, Env | Env1>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.catchCauseIf`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.catchCauseIf`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.catchCauseFilter`

- **Source:** `packages/effect/src/Channel.ts:4364`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Recovers from channel failures whose full `Cause` is selected by a `Filter`.
- **Signature hint:** `declare function catchCauseFilter<OutErr, EB, X extends Cause.Cause<any>, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>(filter: Filter.Filter<Cause.Cause<OutErr>, EB, X>, f: (failure: EB, cause: Cause.Cause<OutErr>) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem | OutElem1, Cause.Cause.Error<X> | OutErr1, OutDone | OutDone1, InElem & InElem1, InErr & InErr1, InDone & InDone1, Env | Env1> declare function catchCauseFilter<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, EB, X extends Cause.Cause<any>, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, filter: Filter.Filter<Cause.Cause<OutErr>, EB, X>, f: (failure: EB, cause: Cause.Cause<OutErr>) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>): Channel<OutElem | OutElem1, Cause.Cause.Error<X> | OutErr1, OutDone | OutDone1, InElem & InElem1, InErr & InErr1, InDone & InDone1, Env | Env1>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.catchCauseFilter`.
- **Suggested snippet:** Create one failing Channel whose error or cause matches the filter, apply `Channel.catchCauseFilter`, and assert the recovered value or recorded tap. Use one non-matching failure only to show propagation.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.catch`

- **Source:** `packages/effect/src/Channel.ts:4565`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Recovers from typed channel errors by running a fallback channel.
- **Signature hint:** `declare const _catch: { <OutErr, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>(f: (d: OutErr) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem | OutElem1, OutErr1, OutDone | OutDone1, InElem & InElem1, InErr & InErr1, InDone & InDone1, Env | Env1>; <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, f: (d: OutErr) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>): Channel<OutElem | OutElem1, OutErr1, OutDone | OutDone1, InElem & InElem1, InErr & InErr1, InDone & InDone1, Env | Env1>; } export { _catch as catch }`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.catch`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Recovers from typed channel errors by running a fallback channel. Call `Channel.catch` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.tapError`

- **Source:** `packages/effect/src/Channel.ts:4580`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Runs an effect when the channel fails with a typed error, then preserves the original channel failure.
- **Signature hint:** `declare function tapError<OutErr, A, E, R>(f: (d: OutErr) => Effect.Effect<A, E, R>): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | E, OutDone | void, InElem, InErr, InDone, Env | R> declare function tapError<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, A, E, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, f: (d: OutErr) => Effect.Effect<A, E, R>): Channel<OutElem, OutErr | E, OutDone | void, InElem, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.tapError`.
- **Suggested snippet:** Create or capture `Channel.tapError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.catchIf`

- **Source:** `packages/effect/src/Channel.ts:4676`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Recovers from typed channel errors that match a predicate or refinement.
- **Signature hint:** `declare function catchIf<OutErr, EB extends OutErr, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(refinement: Predicate.Refinement<OutErr, EB>, f: (failure: EB) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>, orElse?: ((failure: Exclude<OutErr, EB>) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem | OutElem1 | Exclude<OutElem2, Types.unassigned>, OutErr1 | OutErr2 | (OutElem2 extends Types.unassigned ? Exclude<OutErr, EB> : never), OutDone | OutDone1 | OutDone2, InElem & InElem1 & InElem2, InErr & InErr1 & InErr2, InDone & InDone1 & InDone2, Env | Env1 | Env2> declare function catchIf<OutErr, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(predicate: Predicate.Predicate<OutErr>, f: (failure: OutErr) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>, orElse?: ((failure: OutErr) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem | OutElem1 | Exclude<OutElem2, Types.unassigned>, OutErr1 | OutErr2 | (OutElem2 extends Types.unassigned ? OutErr : never), OutDone | OutDone1 | OutDone2, InElem & InElem1 & InElem2, InErr & InErr1 & InErr2, InDone & InDone1 & InDone2, Env | Env1 | Env2> declare function catchIf<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, EB extends OutErr, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, refinement: Predicate.Refinement<OutErr, EB>, f: (failure: EB) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>, orElse?: ((failure: Exclude<OutErr, EB>) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): Channel<OutElem | OutElem1 | Exclude<OutElem2, Types.unassigned>, OutErr1 | OutErr2 | (OutElem2 extends Types.unassigned ? Exclude<OutErr, EB> : never), OutDone | OutDone1 | OutDone2, InElem & InElem1 & InElem2, InErr & InErr1 & InErr2, InDone & InDone1 & InDone2, Env | Env1 | Env2> declare function catchIf<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, predicate: Predicate.Predicate<OutErr>, f: (failure: OutErr) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>, orElse?: ((failure: OutErr) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): Channel<OutElem | OutElem1 | Exclude<OutElem2, Types.unassigned>, OutErr1 | OutErr2 | (OutElem2 extends Types.unassigned ? OutErr : never), OutDone | OutDone1 | OutDone2, InElem & InElem1 & InElem2, InErr & InErr1 & InErr2, InDone & InDone1 & InDone2, Env | Env1 | Env2>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.catchIf`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.catchIf`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Channel.catchFilter`

- **Source:** `packages/effect/src/Channel.ts:4919`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Recovers from typed channel errors selected by a `Filter`.
- **Signature hint:** `declare function catchFilter<OutErr, EB, X, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(filter: Filter.Filter<OutErr, EB, X>, f: (failure: EB) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>, orElse?: ((failure: X) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem | OutElem1 | Exclude<OutElem2, Types.unassigned>, OutErr1 | OutErr2 | (OutElem2 extends Types.unassigned ? X : never), OutDone | OutDone1 | OutDone2, InElem & InElem1 & InElem2, InErr & InErr1 & InErr2, InDone & InDone1 & InDone2, Env | Env1 | Env2> declare function catchFilter<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, EB, X, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, filter: Filter.Filter<OutErr, EB, X>, f: (failure: EB) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>, orElse?: ((failure: X) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): Channel<OutElem | OutElem1 | Exclude<OutElem2, Types.unassigned>, OutErr1 | OutErr2 | (OutElem2 extends Types.unassigned ? X : never), OutDone | OutDone1 | OutDone2, InElem & InElem1 & InElem2, InErr & InErr1 & InErr2, InDone & InDone1 & InDone2, Env | Env1 | Env2>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.catchFilter`.
- **Suggested snippet:** Create one failing Channel whose error or cause matches the filter, apply `Channel.catchFilter`, and assert the recovered value or recorded tap. Use one non-matching failure only to show propagation.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Channel.toPubSubTake`

- **Source:** `packages/effect/src/Channel.ts:8728`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **optional**
- **Current description:** Converts a channel to a scoped `PubSub` of `Take` values.
- **Signature hint:** `declare function toPubSubTake(options: { readonly capacity: 'unbounded'; readonly replay?: number | undefined; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; readonly replay?: number | undefined; }): <OutElem, OutErr, OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutDone>, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<PubSub.PubSub<Take.Take<OutElem, OutErr, OutDone>>, never, Env | Scope.Scope> declare function toPubSubTake<OutElem, OutErr, OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, unknown, unknown, unknown, Env>, options: { readonly capacity: 'unbounded'; readonly replay?: number | undefined; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; readonly replay?: number | undefined; }): Effect.Effect<PubSub.PubSub<Take.Take<OutElem, OutErr, OutDone>>, never, Env | Scope.Scope>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.toPubSubTake`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.toPubSubTake`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.endSync`

- **Source:** `packages/effect/src/Channel.ts:861`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Channel` that immediately ends with the lazily evaluated value.
- **Signature hint:** `declare function endSync<A>(evaluate: LazyArg<A>): Channel<never, never, A>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.endSync`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.endSync`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.fromEffectTake`

- **Source:** `packages/effect/src/Channel.ts:1128`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a channel from an effect that produces a `Take`.
- **Signature hint:** `declare function fromEffectTake<A, E, Done, E2, R>(effect: Effect.Effect<Take.Take<A, E, Done>, E2, R>): Channel<Arr.NonEmptyReadonlyArray<A>, E | E2, Done, unknown, unknown, unknown, R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.fromEffectTake`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.fromEffectTake`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.identity`

- **Source:** `packages/effect/src/Channel.ts:1190`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a channel that forwards upstream input elements, input errors, and the upstream done value unchanged.
- **Signature hint:** `declare function identity<Elem, Err, Done>(): Channel<Elem, Err, Done, Elem, Err, Done>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.identity`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.identity`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.fromPubSubTake`

- **Source:** `packages/effect/src/Channel.ts:1615`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Subscribes to a `PubSub` of `Take` values and exposes them as a channel.
- **Signature hint:** `declare function fromPubSubTake<A, E, Done>(pubsub: PubSub.PubSub<Take.Take<A, E, Done>>): Channel<Arr.NonEmptyReadonlyArray<A>, E, Done>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.fromPubSubTake`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.fromPubSubTake`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.fromSchedule`

- **Source:** `packages/effect/src/Channel.ts:1626`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a Channel from a Schedule.
- **Signature hint:** `declare function fromSchedule<O, E, R>(schedule: Schedule.Schedule<O, unknown, E, R>): Channel<O, E, O, unknown, unknown, unknown, R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.fromSchedule`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.fromSchedule`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.fromAsyncIterable`

- **Source:** `packages/effect/src/Channel.ts:1867`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a channel that pulls values from an `AsyncIterable`.
- **Signature hint:** `declare function fromAsyncIterable<A, D, E>(iterable: AsyncIterable<A, D>, onError: (error: unknown) => E): Channel<A, E, D>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.fromAsyncIterable`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.fromAsyncIterable`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.fromAsyncIterableArray`

- **Source:** `packages/effect/src/Channel.ts:1898`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a channel from an `AsyncIterable`, emitting each yielded value as a single-element non-empty array.
- **Signature hint:** `declare function fromAsyncIterableArray<A, D, E>(iterable: AsyncIterable<A, D>, onError: (error: unknown) => E): Channel<Arr.NonEmptyReadonlyArray<A>, E, D>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.fromAsyncIterableArray`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.fromAsyncIterableArray`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.orElseIfEmpty`

- **Source:** `packages/effect/src/Channel.ts:2888`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **optional**
- **Current description:** Runs a fallback channel if this channel completes without emitting any output elements.
- **Signature hint:** `declare function orElseIfEmpty<OutDone, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>(f: (leftover: Types.NoInfer<OutDone>) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>): <OutElem, OutErr, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem | OutElem1, OutErr1 | OutErr, OutDone | OutDone1, InElem & InElem1, InErr & InErr1, InDone & InDone1, Env1 | Env> declare function orElseIfEmpty<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, f: (leftover: Types.NoInfer<OutDone>) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>): Channel<OutElem | OutElem1, OutErr1 | OutErr, OutDone | OutDone1, InElem & InElem1, InErr & InErr1, InDone & InDone1, Env1 | Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.orElseIfEmpty`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.orElseIfEmpty`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.flattenTake`

- **Source:** `packages/effect/src/Channel.ts:3117`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Flattens a channel that emits `Take` values into a channel that emits the `Take` outputs directly.
- **Signature hint:** `declare function flattenTake<OutElem, OutErr, OutDone, OutErr2, OutDone2, InElem, InErr, InDone, Env>(self: Channel<Take.Take<OutElem, OutErr, OutDone>, OutErr2, OutDone2, InElem, InErr, InDone, Env>): Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr | OutErr2, OutDone, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.flattenTake`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.flattenTake`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.repeat`

- **Source:** `packages/effect/src/Channel.ts:3180`
- **Kind / category:** `root-declaration` / `repetition`
- **Priority:** **optional**
- **Current description:** Repeats this channel according to the provided schedule.
- **Signature hint:** `declare function repeat<SO, OutDone, SE, SR>(schedule: Schedule.Schedule<SO, Types.NoInfer<OutDone>, SE, SR> | (($: <SO, SE, SR>(_: Schedule.Schedule<SO, NoInfer<OutDone>, SE, SR>) => Schedule.Schedule<SO, OutDone, SE, SR>) => Schedule.Schedule<SO, Types.NoInfer<OutDone>, SE, SR>)): <OutElem, OutErr, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr | SE, OutDone, InElem, InErr, InDone, Env | SR>) => Channel<OutElem, OutErr | SE, OutDone, InElem, InErr, InDone, Env | SR> declare function repeat<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, SO, SE, SR>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, schedule: Schedule.Schedule<SO, OutDone, SE, SR> | (($: <SO, SE, SR>(_: Schedule.Schedule<SO, NoInfer<OutDone>, SE, SR>) => Schedule.Schedule<SO, OutDone, SE, SR>) => Schedule.Schedule<SO, Types.NoInfer<OutDone>, SE, SR>)): Channel<OutElem, OutErr | SE, OutDone, InElem, InErr, InDone, Env | SR>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.repeat`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.repeat`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.forever`

- **Source:** `packages/effect/src/Channel.ts:3240`
- **Kind / category:** `root-declaration` / `repetition`
- **Priority:** **optional**
- **Current description:** Repeats this channel forever.
- **Signature hint:** `declare function forever<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>): Channel<OutElem, OutErr, never, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.forever`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.forever`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.schedule`

- **Source:** `packages/effect/src/Channel.ts:3258`
- **Kind / category:** `root-declaration` / `sequencing`
- **Priority:** **optional**
- **Current description:** Runs a schedule step for each output element while preserving the emitted elements.
- **Signature hint:** `declare function schedule<SO, OutElem, SE, SR>(schedule: Schedule.Schedule<SO, Types.NoInfer<OutElem>, SE, SR>): <OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr | SE, OutDone, InElem, InErr, InDone, Env | SR>) => Channel<OutElem, OutErr | SE, OutDone | SO, InElem, InErr, InDone, Env | SR> declare function schedule<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, SO, SE, SR>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, schedule: Schedule.Schedule<SO, OutElem, SE, SR>): Channel<OutElem, OutErr | SE, OutDone | SO, InElem, InErr, InDone, Env | SR>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.schedule`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.schedule`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.catchTag`

- **Source:** `packages/effect/src/Channel.ts:5078`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Recovers from tagged channel errors whose `_tag` matches one or more tags.
- **Signature hint:** `declare function catchTag<OutErr, const K extends Types.Tags<OutErr> | Arr.NonEmptyReadonlyArray<Types.Tags<OutErr>>, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(k: K, f: (e: Types.ExtractTag<NoInfer<OutErr>, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>, orElse?: ((e: Types.ExcludeTag<NoInfer<OutErr>, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem | OutElem1 | Exclude<OutElem2, Types.unassigned>, OutErr1 | OutErr2 | (OutElem2 extends Types.unassigned ? Types.ExcludeTag<OutErr, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K> : never), OutDone | OutDone1 | OutDone2, InElem & InElem1 & InElem2, InErr & InErr1 & InErr2, InDone & InDone1 & InDone2, Env | Env1 | Env2> declare function catchTag<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, const K extends Types.Tags<OutErr> | Arr.NonEmptyReadonlyArray<Types.Tags<OutErr>>, OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, k: K, f: (e: Types.ExtractTag<NoInfer<OutErr>, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>) => Channel<OutElem1, OutErr1, OutDone1, InElem1, InErr1, InDone1, Env1>, orElse?: ((e: Types.ExcludeTag<NoInfer<OutErr>, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K>) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): Channel<OutElem | OutElem1 | Exclude<OutElem2, Types.unassigned>, OutErr1 | OutErr2 | (OutElem2 extends Types.unassigned ? Types.ExcludeTag<OutErr, K extends Arr.NonEmptyReadonlyArray<string> ? K[number] : K> : never), OutDone | OutDone1 | OutDone2, InElem & InElem1 & InElem2, InErr & InErr1 & InErr2, InDone & InDone1 & InDone2, Env | Env1 | Env2>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.catchTag`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.catchTag`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.catchReasons`

- **Source:** `packages/effect/src/Channel.ts:5437`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Catches multiple reasons within a tagged error using an object of handlers.
- **Signature hint:** `declare function catchReasons<K extends Types.Tags<OutErr>, OutErr, Cases extends { [RK in Types.ReasonTags<Types.ExtractTag<Types.NoInfer<OutErr>, K>>]+?: (reason: Types.ExtractReason<Types.ExtractTag<Types.NoInfer<OutErr>, K>, RK>, error: Types.NarrowReason<Types.ExtractTag<Types.NoInfer<OutErr>, K>, RK>) => Channel<any, any, any, any, any, any, any>; }, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(errorTag: K, cases: Cases, orElse?: ((reason: Types.ExcludeReason<Types.ExtractTag<Types.NoInfer<OutErr>, K>, Extract<keyof Cases, string>>, error: Types.OmitReason<Types.ExtractTag<Types.NoInfer<OutErr>, K>, Extract<keyof Cases, string>>) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem | Exclude<OutElem2, Types.unassigned> | { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<infer OutElem1, any, any, any, any, any, any> ? OutElem1 : never; }[keyof Cases], Types.ExcludeTag<OutErr, K> | OutErr2 | (OutElem2 extends Types.unassigned ? Types.ExtractTag<OutErr, K> : never) | { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, infer OutErr1, any, any, any, any, any> ? OutErr1 : never; }[keyof Cases], OutDone | OutDone2 | { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, infer OutDone1, any, any, any, any> ? OutDone1 : never; }[keyof Cases], InElem & InElem2 & { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, any, infer InElem1, any, any, any> ? InElem1 : never; }[keyof Cases], InErr & InErr2 & { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, any, any, infer InErr1, any, any> ? InErr1 : never; }[keyof Cases], InDone & InDone2 & { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, any, any, any, infer InDone1, any> ? InDone1 : never; }[keyof Cases], Env | Env2 | { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, any, any, any, any, infer Env1> ? Env1 : never; }[keyof Cases]> declare function catchReasons<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, K extends Types.Tags<OutErr>, Cases extends { [RK in Types.ReasonTags<Types.ExtractTag<OutErr, K>>]+?: (reason: Types.ExtractReason<Types.ExtractTag<OutErr, K>, RK>, error: Types.NarrowReason<Types.ExtractTag<OutErr, K>, RK>) => Channel<any, any, any, any, any, any, any>; }, OutElem2 = Types.unassigned, OutErr2 = never, OutDone2 = never, InElem2 = unknown, InErr2 = unknown, InDone2 = unknown, Env2 = never>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, errorTag: K, cases: Cases, orElse?: ((reason: Types.ExcludeReason<Types.ExtractTag<Types.NoInfer<OutErr>, K>, Extract<keyof Cases, string>>, error: Types.OmitReason<Types.ExtractTag<Types.NoInfer<OutErr>, K>, Extract<keyof Cases, string>>) => Channel<OutElem2, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>) | undefined): Channel<OutElem | Exclude<OutElem2, Types.unassigned> | { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<infer OutElem1, any, any, any, any, any, any> ? OutElem1 : never; }[keyof Cases], Types.ExcludeTag<OutErr, K> | OutErr2 | (OutElem2 extends Types.unassigned ? Types.ExtractTag<OutErr, K> : never) | { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, infer OutErr1, any, any, any, any, any> ? OutErr1 : never; }[keyof Cases], OutDone | OutDone2 | { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, infer OutDone1, any, any, any, any> ? OutDone1 : never; }[keyof Cases], InElem & InElem2 & { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, any, infer InElem1, any, any, any> ? InElem1 : never; }[keyof Cases], InErr & InErr2 & { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, any, any, infer InErr1, any, any> ? InErr1 : never; }[keyof Cases], InDone & InDone2 & { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, any, any, any, infer InDone1, any> ? InDone1 : never; }[keyof Cases], Env | Env2 | { [RK in keyof Cases]: Cases[RK] extends (...args: Array<any>) => Channel<any, any, any, any, any, any, infer Env1> ? Env1 : never; }[keyof Cases]>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.catchReasons`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.catchReasons`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.mapError`

- **Source:** `packages/effect/src/Channel.ts:5711`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Returns a new channel, which is the same as this one, except the failure value of the returned channel is created by applying the specified function to the failure value of this channel.
- **Signature hint:** `declare function mapError<OutErr, OutErr2>(f: (err: OutErr) => OutErr2): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr2, OutDone, InElem, InErr, InDone, Env> declare function mapError<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutErr2>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, f: (err: OutErr) => OutErr2): Channel<OutElem, OutErr2, OutDone, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.mapError`.
- **Suggested snippet:** Create or capture `Channel.mapError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.ignore`

- **Source:** `packages/effect/src/Channel.ts:5774`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Ignores all errors in the channel, converting them to an empty channel.
- **Signature hint:** `declare function ignore<Arg extends Channel<any, any, any, any, any, any, any> | { readonly log?: boolean | Severity | undefined; } | undefined = { readonly log?: boolean | Severity | undefined; }>(selfOrOptions: Arg, options?: { readonly log?: boolean | Severity | undefined; } | undefined): [Arg] extends [Channel<infer OutElem, infer _OutErr, infer OutDone, infer InElem, infer InErr, infer InDone, infer Env>] ? Channel<OutElem, never, OutDone | void, InElem, InErr, InDone, Env> : <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, never, OutDone | void, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.ignore`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Ignores all errors in the channel, converting them to an empty channel. Call `Channel.ignore` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.ignoreCause`

- **Source:** `packages/effect/src/Channel.ts:5836`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Ignores all errors in the channel including defects, converting them to an empty channel.
- **Signature hint:** `declare function ignoreCause<Arg extends Channel<any, any, any, any, any, any, any> | { readonly log?: boolean | Severity | undefined; } | undefined = { readonly log?: boolean | Severity | undefined; }>(selfOrOptions: Arg, options?: { readonly log?: boolean | Severity | undefined; } | undefined): [Arg] extends [Channel<infer OutElem, infer _OutErr, infer OutDone, infer InElem, infer InErr, infer InDone, infer Env>] ? Channel<OutElem, never, OutDone | void, InElem, InErr, InDone, Env> : <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, never, OutDone | void, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.ignoreCause`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Ignores all errors in the channel including defects, converting them to an empty channel. Call `Channel.ignoreCause` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.retry`

- **Source:** `packages/effect/src/Channel.ts:5871`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Returns a new channel that retries this channel according to the specified schedule whenever it fails.
- **Signature hint:** `declare function retry<SO, OutErr, SE, SR>(schedule: Schedule.Schedule<SO, Types.NoInfer<OutErr>, SE, SR> | (($: <SO, SE, SR>(_: Schedule.Schedule<SO, Types.NoInfer<OutErr>, SE, SR>) => Schedule.Schedule<SO, OutErr, SE, SR>) => Schedule.Schedule<SO, Types.NoInfer<OutErr>, SE, SR>)): <OutElem, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr | SE, OutDone, InElem, InErr, InDone, Env | SR>) => Channel<OutElem, OutErr | SE, OutDone, InElem, InErr, InDone, Env | SR> declare function retry<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, SO, SE, SR>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, schedule: Schedule.Schedule<SO, OutErr, SE, SR> | (($: <SO, SE, SR>(_: Schedule.Schedule<SO, Types.NoInfer<OutErr>, SE, SR>) => Schedule.Schedule<SO, OutErr, SE, SR>) => Schedule.Schedule<SO, Types.NoInfer<OutErr>, SE, SR>)): Channel<OutElem, OutErr | SE, OutDone, InElem, InErr, InDone, Env | SR>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.retry`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.retry`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.mergeEffect`

- **Source:** `packages/effect/src/Channel.ts:6452`
- **Kind / category:** `root-declaration` / `combining`
- **Priority:** **optional**
- **Current description:** Runs an effect concurrently with a channel while emitting only the channel's output elements.
- **Signature hint:** `declare function mergeEffect<X, E, R>(effect: Effect.Effect<X, E, R>): <OutElem, OutDone, OutErr, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R> declare function mergeEffect<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, X, E, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, effect: Effect.Effect<X, E, R>): Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.mergeEffect`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.mergeEffect`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.decodeText`

- **Source:** `packages/effect/src/Channel.ts:6612`
- **Kind / category:** `root-declaration` / `String manipulation`
- **Priority:** **optional**
- **Current description:** Decodes incoming `Uint8Array` chunks into strings using `TextDecoder`.
- **Signature hint:** `declare function decodeText<Err, Done>(encoding?: string, options?: TextDecoderOptions): Channel<Arr.NonEmptyReadonlyArray<string>, Err, Done, Arr.NonEmptyReadonlyArray<Uint8Array>, Err, Done>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.decodeText`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.decodeText`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.encodeText`

- **Source:** `packages/effect/src/Channel.ts:6638`
- **Kind / category:** `root-declaration` / `String manipulation`
- **Priority:** **optional**
- **Current description:** Encodes incoming string chunks into `Uint8Array` values using `TextEncoder`.
- **Signature hint:** `declare function encodeText<Err, Done>(): Channel<Arr.NonEmptyReadonlyArray<Uint8Array>, Err, Done, Arr.NonEmptyReadonlyArray<string>, Err, Done>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.encodeText`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.encodeText`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.buffer`

- **Source:** `packages/effect/src/Channel.ts:6912`
- **Kind / category:** `root-declaration` / `Buffering`
- **Priority:** **optional**
- **Current description:** Buffers individual output elements in a queue with the configured `capacity` so a faster producer can progress independently of a slower consumer.
- **Signature hint:** `declare function buffer(options: { readonly capacity: 'unbounded'; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; }): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env> declare function buffer<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, options: { readonly capacity: 'unbounded'; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; }): Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.buffer`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.buffer`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.bufferArray`

- **Source:** `packages/effect/src/Channel.ts:6978`
- **Kind / category:** `root-declaration` / `Buffering`
- **Priority:** **optional**
- **Current description:** Buffers array output elements in a queue with the configured `capacity` so a faster producer can progress independently of a slower consumer.
- **Signature hint:** `declare function bufferArray(options: { readonly capacity: 'unbounded'; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; }): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env> declare function bufferArray<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env>, options: { readonly capacity: 'unbounded'; } | { readonly capacity: number; readonly strategy?: 'dropping' | 'sliding' | 'suspend' | undefined; }): Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.bufferArray`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.bufferArray`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.haltWhen`

- **Source:** `packages/effect/src/Channel.ts:7067`
- **Kind / category:** `root-declaration` / `interruption`
- **Priority:** **optional**
- **Current description:** Stops a channel when the specified effect completes or fails.
- **Signature hint:** `declare function haltWhen<OutDone2, OutErr2, Env2>(effect: Effect.Effect<OutDone2, OutErr2, Env2>): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | OutErr2, OutDone | OutDone2, InElem, InErr, InDone, Env2 | Env> declare function haltWhen<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, OutDone2, OutErr2, Env2>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, effect: Effect.Effect<OutDone2, OutErr2, Env2>): Channel<OutElem, OutErr | OutErr2, OutDone | OutDone2, InElem, InErr, InDone, Env2 | Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.haltWhen`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.haltWhen`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.onStart`

- **Source:** `packages/effect/src/Channel.ts:7181`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Runs an effect before the channel starts.
- **Signature hint:** `declare function onStart<A, E, R>(onStart: Effect.Effect<A, E, R>): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R> declare function onStart<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, A, E, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, onStart: Effect.Effect<A, E, R>): Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.onStart`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.onStart`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.onFirst`

- **Source:** `packages/effect/src/Channel.ts:7213`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Runs an effect the first time the channel emits an output element.
- **Signature hint:** `declare function onFirst<OutElem, A, E, R>(onFirst: (element: Types.NoInfer<OutElem>) => Effect.Effect<A, E, R>): <OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R> declare function onFirst<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, A, E, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, onFirst: (element: Types.NoInfer<OutElem>) => Effect.Effect<A, E, R>): Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.onFirst`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.onFirst`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.onEnd`

- **Source:** `packages/effect/src/Channel.ts:7249`
- **Kind / category:** `root-declaration` / `hooks`
- **Priority:** **optional**
- **Current description:** Runs an effect when the channel completes successfully.
- **Signature hint:** `declare function onEnd<A, E, R>(onEnd: Effect.Effect<A, E, R>): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R> declare function onEnd<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, A, E, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, onEnd: Effect.Effect<A, E, R>): Channel<OutElem, OutErr | E, OutDone, InElem, InErr, InDone, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.onEnd`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.onEnd`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.contextWith`

- **Source:** `packages/effect/src/Channel.ts:7341`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Creates a channel from the specified services.
- **Signature hint:** `declare function contextWith<Env, OutElem, OutErr, OutDone, InElem, InErr, InDone, Env2>(f: (context: Context.Context<Env>) => Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env2>): Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env | Env2>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.contextWith`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.contextWith`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.provideContext`

- **Source:** `packages/effect/src/Channel.ts:7355`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Provides a `Context` to the channel, removing the corresponding service requirements from the returned channel.
- **Signature hint:** `declare function provideContext<R2>(context: Context.Context<R2>): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Exclude<Env, R2>> declare function provideContext<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, R2>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, context: Context.Context<R2>): Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Exclude<Env, R2>>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.provideContext`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.provideContext`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.provideService`

- **Source:** `packages/effect/src/Channel.ts:7383`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Provides a concrete service for a context key, removing that service requirement from the returned channel.
- **Signature hint:** `declare function provideService<I, S>(key: Context.Key<I, S>, service: NoInfer<S>): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Exclude<Env, I>> declare function provideService<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, I, S>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, key: Context.Key<I, S>, service: NoInfer<S>): Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Exclude<Env, I>>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.provideService`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.provideService`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.provideServiceEffect`

- **Source:** `packages/effect/src/Channel.ts:7423`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Provides a service to the channel after obtaining it from an effect.
- **Signature hint:** `declare function provideServiceEffect<I, S, ES, RS>(key: Context.Key<I, S>, service: Effect.Effect<NoInfer<S>, ES, RS>): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<OutElem, OutErr | ES, OutDone, InElem, InErr, InDone, Exclude<Env, I> | RS> declare function provideServiceEffect<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, I, S, ES, RS>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, key: Context.Key<I, S>, service: Effect.Effect<NoInfer<S>, ES, RS>): Channel<OutElem, OutErr | ES, OutDone, InElem, InErr, InDone, Exclude<Env, I> | RS>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.provideServiceEffect`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.provideServiceEffect`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.updateContext`

- **Source:** `packages/effect/src/Channel.ts:7508`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Transforms the current context before running the channel.
- **Signature hint:** `declare function updateContext<Env, R2>(f: (context: Context.Context<R2>) => Context.Context<Env>): <OutElem, OutErr, OutDone, InElem, InErr, InDone>(self: Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>) => Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, R2> declare function updateContext<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, R2>(self: Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>, f: (context: Context.Context<R2>) => Context.Context<Env>): Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, R2>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.updateContext`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.updateContext`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.updateService`

- **Source:** `packages/effect/src/Channel.ts:7540`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Updates a service in the current context before running the channel.
- **Signature hint:** `declare function updateService<I, S>(key: Context.Key<I, S>, f: (service: NoInfer<S>) => S): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>) => Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env | I> declare function updateService<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, I, S>(self: Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>, service: Context.Key<I, S>, f: (service: NoInfer<S>) => S): Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env | I>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.updateService`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.updateService`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.withSpan`

- **Source:** `packages/effect/src/Channel.ts:7575`
- **Kind / category:** `root-declaration` / `tracing`
- **Priority:** **optional**
- **Current description:** Runs the channel inside a tracing span with the specified name and options.
- **Signature hint:** `declare function withSpan(name: string, options?: SpanOptions): <OutElem, OutErr, OutDone, InElem, InErr, InDone, R>(self: Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, R>) => Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Exclude<R, ParentSpan>> declare function withSpan<OutElem, OutErr, OutDone, InElem, InErr, InDone, R>(self: Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, R>, name: string, options?: SpanOptions): Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Exclude<R, ParentSpan>>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.withSpan`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.withSpan`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.Do`

- **Source:** `packages/effect/src/Channel.ts:7620`
- **Kind / category:** `root-declaration` / `do notation`
- **Priority:** **optional**
- **Current description:** The starting channel for Do notation, emitting an empty object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.Do`.
- **Suggested snippet:** Use `Channel.Do` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.let`

- **Source:** `packages/effect/src/Channel.ts:7674`
- **Kind / category:** `root-declaration` / `do notation`
- **Priority:** **optional**
- **Current description:** Adds a computed field to each object emitted by a channel.
- **Signature hint:** `declare function let<N extends string, OutElem extends object, B>(name: Exclude<N, keyof OutElem>, f: (a: NoInfer<OutElem>) => B): <OutErr, OutDone, InElem, InErr, InDone, R>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, R>) => Channel<{ [K in N | keyof OutElem]: K extends keyof OutElem ? OutElem[K] : B; }, OutErr, OutDone, InElem, InErr, InDone, R> declare function let<OutElem extends object, OutErr, OutDone, InElem, InErr, InDone, R, N extends string, B>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, R>, name: Exclude<N, keyof OutElem>, f: (a: NoInfer<OutElem>) => B): Channel<{ [K in N | keyof OutElem]: K extends keyof OutElem ? OutElem[K] : B; }, OutErr, OutDone, InElem, InErr, InDone, R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.let`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.let`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.bind`

- **Source:** `packages/effect/src/Channel.ts:7690`
- **Kind / category:** `root-declaration` / `do notation`
- **Priority:** **optional**
- **Current description:** Adds a field to each object emitted by a channel by running another channel derived from that object.
- **Signature hint:** `declare function bind<N extends string, OutElem extends object, B, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>(name: Exclude<N, keyof OutElem>, f: (a: NoInfer<OutElem>) => Channel<B, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>, options?: { readonly concurrency?: number | 'unbounded' | undefined; readonly bufferSize?: number | undefined; }): <OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<{ [K in N | keyof OutElem]: K extends keyof OutElem ? OutElem[K] : B; }, OutErr2 | OutErr, OutDone, InElem & InElem2, InErr & InErr2, InDone & InDone2, Env2 | Env> declare function bind<OutElem extends object, OutErr, OutDone, InElem, InErr, InDone, Env, N extends string, B, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, name: Exclude<N, keyof OutElem>, f: (a: NoInfer<OutElem>) => Channel<B, OutErr2, OutDone2, InElem2, InErr2, InDone2, Env2>, options?: { readonly concurrency?: number | 'unbounded' | undefined; readonly bufferSize?: number | undefined; }): Channel<{ [K in N | keyof OutElem]: K extends keyof OutElem ? OutElem[K] : B; }, OutErr2 | OutErr, OutDone, InElem & InElem2, InErr & InErr2, InDone & InDone2, Env2 | Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.bind`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.bind`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.bindTo`

- **Source:** `packages/effect/src/Channel.ts:7796`
- **Kind / category:** `root-declaration` / `do notation`
- **Priority:** **optional**
- **Current description:** Wraps each output element in an object under the specified field name.
- **Signature hint:** `declare function bindTo<N extends string>(name: N): <OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>) => Channel<{ [K in N]: OutElem; }, OutErr, OutDone, InElem, InErr, InDone, Env> declare function bindTo<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env, N extends string>(self: Channel<OutElem, OutErr, OutDone, InElem, InErr, InDone, Env>, name: N): Channel<{ [K in N]: OutElem; }, OutErr, OutDone, InElem, InErr, InDone, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.bindTo`.
- **Suggested snippet:** Create a finite Channel, apply `Channel.bindTo`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.runForEachWhile`

- **Source:** `packages/effect/src/Channel.ts:7950`
- **Kind / category:** `root-declaration` / `execution`
- **Priority:** **optional**
- **Current description:** Runs a channel and applies an effectful predicate to each output element until the predicate returns `false`.
- **Signature hint:** `declare function runForEachWhile<OutElem, EX, RX>(f: (o: OutElem) => Effect.Effect<boolean, EX, RX>): <OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<void, OutErr | EX, Env | RX> declare function runForEachWhile<OutElem, OutErr, OutDone, Env, EX, RX>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>, f: (o: OutElem) => Effect.Effect<boolean, EX, RX>): Effect.Effect<void, OutErr | EX, Env | RX>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.runForEachWhile`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.runForEachWhile`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.runDone`

- **Source:** `packages/effect/src/Channel.ts:8012`
- **Kind / category:** `root-declaration` / `execution`
- **Priority:** **optional**
- **Current description:** Runs a channel and outputs the done value.
- **Signature hint:** `declare function runDone<OutElem, OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>): Effect.Effect<OutDone, OutErr, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.runDone`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.runDone`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.runHead`

- **Source:** `packages/effect/src/Channel.ts:8028`
- **Kind / category:** `root-declaration` / `execution`
- **Priority:** **optional**
- **Current description:** Runs a channel until the first output element is available, returning it in an `Option`.
- **Signature hint:** `declare function runHead<OutElem, OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>): Effect.Effect<Option.Option<OutElem>, OutErr, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.runHead`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.runHead`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.runLast`

- **Source:** `packages/effect/src/Channel.ts:8055`
- **Kind / category:** `root-declaration` / `execution`
- **Priority:** **optional**
- **Current description:** Runs a channel to completion and returns the last output element in an `Option`.
- **Signature hint:** `declare function runLast<OutElem, OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>): Effect.Effect<Option.Option<OutElem>, OutErr, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.runLast`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.runLast`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.runFoldEffect`

- **Source:** `packages/effect/src/Channel.ts:8149`
- **Kind / category:** `root-declaration` / `execution`
- **Priority:** **optional**
- **Current description:** Runs a channel and effectfully folds all output elements with an accumulator.
- **Signature hint:** `declare function runFoldEffect<OutElem, Z, E, R>(initial: LazyArg<Z>, f: (acc: Z, o: OutElem) => Effect.Effect<Z, E, R>): <OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<Z, OutErr | E, Env | R> declare function runFoldEffect<OutElem, OutErr, OutDone, Env, Z, E, R>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>, initial: LazyArg<Z>, f: (acc: Z, o: OutElem) => Effect.Effect<Z, E, R>): Effect.Effect<Z, OutErr | E, Env | R>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.runFoldEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.runFoldEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.runIntoQueue`

- **Source:** `packages/effect/src/Channel.ts:8283`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **optional**
- **Current description:** Runs a channel and offers each output element into a queue.
- **Signature hint:** `declare function runIntoQueue<OutElem, OutErr>(queue: Queue.Queue<OutElem, OutErr | Cause.Done>): <OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<void, never, Env> declare function runIntoQueue<OutElem, OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>, queue: Queue.Queue<OutElem, OutErr | Cause.Done>): Effect.Effect<void, never, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.runIntoQueue`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.runIntoQueue`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.runIntoQueueArray`

- **Source:** `packages/effect/src/Channel.ts:8326`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **optional**
- **Current description:** Runs a channel that emits non-empty arrays and offers each array element into a queue.
- **Signature hint:** `declare function runIntoQueueArray<OutElem, OutErr>(queue: Queue.Queue<OutElem, OutErr | Cause.Done>): <OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<void, never, Env> declare function runIntoQueueArray<OutElem, OutErr, OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, unknown, unknown, unknown, Env>, queue: Queue.Queue<OutElem, OutErr | Cause.Done>): Effect.Effect<void, never, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.runIntoQueueArray`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.runIntoQueueArray`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.runIntoPubSub`

- **Source:** `packages/effect/src/Channel.ts:8558`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **optional**
- **Current description:** Runs a channel and publishes each output element to a `PubSub`.
- **Signature hint:** `declare function runIntoPubSub<OutElem>(pubsub: PubSub.PubSub<OutElem>, options?: { readonly shutdownOnEnd?: boolean | undefined; } | undefined): <OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<void, never, Env> declare function runIntoPubSub<OutElem, OutErr, OutDone, Env>(self: Channel<OutElem, OutErr, OutDone, unknown, unknown, unknown, Env>, pubsub: PubSub.PubSub<OutElem>, options?: { readonly shutdownOnEnd?: boolean | undefined; } | undefined): Effect.Effect<void, never, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.runIntoPubSub`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.runIntoPubSub`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.runIntoPubSubArray`

- **Source:** `packages/effect/src/Channel.ts:8686`
- **Kind / category:** `root-declaration` / `destructors`
- **Priority:** **optional**
- **Current description:** Runs an array-emitting channel and publishes each array element to a `PubSub`.
- **Signature hint:** `declare function runIntoPubSubArray<OutElem>(pubsub: PubSub.PubSub<OutElem>, options?: { readonly shutdownOnEnd?: boolean | undefined; } | undefined): <OutErr, OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, unknown, unknown, unknown, Env>) => Effect.Effect<OutDone, OutErr, Env> declare function runIntoPubSubArray<OutElem, OutErr, OutDone, Env>(self: Channel<Arr.NonEmptyReadonlyArray<OutElem>, OutErr, OutDone, unknown, unknown, unknown, Env>, pubsub: PubSub.PubSub<OutElem>, options?: { readonly shutdownOnEnd?: boolean | undefined; } | undefined): Effect.Effect<OutDone, OutErr, Env>`
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.runIntoPubSubArray`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Channel.runIntoPubSubArray`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.ChannelUnify`

- **Source:** `packages/effect/src/Channel.ts:166`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level unification support for `Channel` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Channel.ChannelUnify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Channel.ChannelUnifyIgnore`

- **Source:** `packages/effect/src/Channel.ts:186`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Marker used by `Unify` while resolving `Channel` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Channel.ChannelUnifyIgnore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Channel.TypeId (type)`

- **Source:** `packages/effect/src/Channel.ts:55`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** String literal type used as the unique brand for `Channel` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Channel.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Channel.TypeId (value)`

- **Source:** `packages/effect/src/Channel.ts:64`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier stored on `Channel` values and used by `isChannel` to recognize them.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Channel } from "effect"` and use `Channel.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Channel.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Channel.Variance`

- **Source:** `packages/effect/src/Channel.ts:207`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Phantom variance marker for the type parameters of `Channel`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Channel.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Channel.VarianceStruct`

- **Source:** `packages/effect/src/Channel.ts:231`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Structural encoding used by `Variance` to record each `Channel` type parameter's variance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Channel.VarianceStruct` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
