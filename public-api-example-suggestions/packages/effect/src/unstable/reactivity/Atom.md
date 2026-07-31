# Example Suggestions: `effect/unstable/reactivity/Atom`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts`
- **Uncovered API records:** 76
- **Priorities:** 0 required, 25 recommended, 40 optional, 11 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/reactivity/Atom.make`                          |  415 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.context`                       |  726 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.defaultMemoMap`                |  787 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.runtime`                       |  795 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.subscriptionRef`               |  905 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.fn`                            | 1128 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.mount`                         | 2422 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.isAtom`                        |   84 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.setIdleTTL`                    |  213 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.withReactivity`                |  809 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.fnSync`                        | 1026 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.pull`                          | 1246 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.withFallback`                  | 1388 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.keepAlive`                     | 1468 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.autoDispose`                   | 1484 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.setLazy`                       | 1501 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.withLabel`                     | 1560 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.initialValue`                  | 1587 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.transform`                     | 1608 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.map`                           | 1677 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.mapResult`                     | 1701 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.debounce`                      | 1734 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.withRefresh`                   | 1772 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.swr`                           | 1801 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.optimisticFn`                  | 1999 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/Atom.AtomContext`                   |  160 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.WriteContext`                  |  200 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.isWritable`                    |  361 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.readable`                      |  369 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.writable`                      |  387 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.family`                        | 1345 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.optimistic`                    | 1896 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.batch`                         | 2066 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.windowFocusSignal`             | 2083 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.makeRefreshOnSignal`           | 2109 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.refreshOnWindowFocus`          | 2128 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.kvs`                           | 2148 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.searchParam`                   | 2213 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.toStream`                      | 2305 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.toStreamResult`                | 2319 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.get`                           | 2328 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.modify`                        | 2338 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.set`                           | 2355 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.update`                        | 2371 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.getResult`                     | 2392 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.refresh`                       | 2408 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.Serializable`                  | 2456 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.isSerializable`                | 2470 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.serializable`                  | 2483 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.withServerValue`               | 2522 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.withServerValueInitial`        | 2541 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.getServerValue`                | 2555 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.Atom`                          |   66 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.Type`                          |   92 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.Success`                       |  100 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.PullSuccess`                   |  108 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.Failure`                       |  116 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.WithoutSerializable`           |  124 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.Writable`                      |  149 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.AtomRuntime`                   |  615 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.RuntimeFactory`                |  702 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.RuntimeFactory.withReactivity` |  715 | `member`           | **optional**    |
| `effect/unstable/reactivity/Atom.FnContext`                     |  993 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.AtomResultFn`                  | 1076 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.PullResult`                    | 1235 | `root-declaration` | **optional**    |
| `effect/unstable/reactivity/Atom.TypeId (type)`                 |   50 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.TypeId (value)`                |   58 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.WritableTypeId (value)`        |  133 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.WritableTypeId (type)`         |  141 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.Reset (value)`                 | 1091 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.Reset (type)`                  | 1099 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.Interrupt (value)`             | 1112 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.Interrupt (type)`              | 1120 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.SerializableTypeId (value)`    | 2435 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.SerializableTypeId (type)`     | 2443 | `root-declaration` | **discouraged** |
| `effect/unstable/reactivity/Atom.ServerValueTypeId`             | 2514 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/reactivity/Atom.make`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:415`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an atom from a synchronous value or read function, or from an `Effect` or `Stream` whose state is exposed as an `AsyncResult`; plain values create writable state atoms.
- **Signature hint:** `declare function make<A, E>(create: (get: AtomContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: { readonly initialValue?: A | undefined; readonly uninterruptible?: boolean | undefined; }): Atom<AsyncResult.AsyncResult<A, E>> declare function make<A, E>(effect: Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: { readonly initialValue?: A; readonly uninterruptible?: boolean | undefined; }): Atom<AsyncResult.AsyncResult<A, E>> declare function make<A>(create: (get: AtomContext) => A): Atom<A> declare function make<A>(initialValue: A): Writable<A>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.make`.
- **Suggested snippet:** Construct one representative value with `Atom.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.context`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:726`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `RuntimeFactory` backed by the supplied `Layer.MemoMap`.
- **Signature hint:** `declare function context(options: { readonly memoMap: Layer.MemoMap; }): RuntimeFactory`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.context`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `RuntimeFactory` backed by the supplied `Layer.MemoMap`. Call `Atom.context` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.defaultMemoMap`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:787`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **recommended**
- **Current description:** Default `Layer.MemoMap` used by the module-level `runtime` factory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.defaultMemoMap`.
- **Suggested snippet:** Use `Atom.defaultMemoMap` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.runtime`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:795`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **recommended**
- **Current description:** Default `RuntimeFactory` created with `defaultMemoMap`.
- **Signature hint:** `declare function runtime<R, E>(create: Layer.Layer<R, E, AtomRegistry | Reactivity.Reactivity> | ((get: AtomContext) => Layer.Layer<R, E, AtomRegistry | Reactivity.Reactivity>)): AtomRuntime<R, E>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.runtime`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Default `RuntimeFactory` created with `defaultMemoMap`. Call `Atom.runtime` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.subscriptionRef`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:905`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a writable atom backed by a `SubscriptionRef`, or by an effect that produces one, updating from ref changes and writing atom updates back to the ref.
- **Signature hint:** `declare function subscriptionRef<A>(ref: SubscriptionRef.SubscriptionRef<A> | ((get: AtomContext) => SubscriptionRef.SubscriptionRef<A>)): Writable<A> declare function subscriptionRef<A, E>(effect: Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, Scope.Scope | AtomRegistry> | ((get: AtomContext) => Effect.Effect<SubscriptionRef.SubscriptionRef<A>, E, Scope.Scope | AtomRegistry>)): Writable<AsyncResult.AsyncResult<A, E>, A>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.subscriptionRef`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a writable atom backed by a `SubscriptionRef`, or by an effect that produces one, updating from ref changes and writing atom updates back to the ref. Call `Atom.subscriptionRef` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.fn`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1128`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a writable atom for an `Effect` or `Stream` function; writing an argument starts the computation and exposes its state as an `AsyncResult`.
- **Signature hint:** `declare function fn<Arg>(): <E, A>(fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: { readonly initialValue?: A | undefined; readonly concurrent?: boolean | undefined; }) => AtomResultFn<Arg, A, E> declare function fn<E, A, Arg = void>(fn: (arg: Arg, get: FnContext) => Effect.Effect<A, E, Scope.Scope | AtomRegistry>, options?: { readonly initialValue?: A | undefined; readonly concurrent?: boolean | undefined; }): AtomResultFn<Arg, A, E>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.fn`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a writable atom for an `Effect` or `Stream` function; writing an argument starts the computation and exposes its state as an `AsyncResult`. Call `Atom.fn` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.mount`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2422`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Mounts an atom in the `AtomRegistry` for the lifetime of the current scope.
- **Signature hint:** `declare function mount<A>(self: Atom<A>): Effect.Effect<void, never, AtomRegistry | Scope.Scope>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.mount`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Atom.mount`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.isAtom`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:84`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an `Atom`.
- **Signature hint:** `declare function isAtom(u: unknown): u is Atom<any>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.isAtom`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Atom.isAtom` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.setIdleTTL`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:213`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a copy of an atom with an idle time-to-live: finite durations dispose it after inactivity, while an infinite duration keeps it alive.
- **Signature hint:** `declare function setIdleTTL(duration: Duration.Input): <A extends Atom<any>>(self: A) => A declare function setIdleTTL<A extends Atom<any>>(self: A, duration: Duration.Input): A`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.setIdleTTL`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a copy of an atom with an idle time-to-live: finite durations dispose it after inactivity, while an infinite duration keeps it alive. Call `Atom.setIdleTTL` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.withReactivity`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:809`
- **Kind / category:** `root-declaration` / `reactivity`
- **Priority:** **recommended**
- **Current description:** Returns `Rx.runtime.withReactivity` for refreshing an atom whenever the keys change in the `Reactivity` service.
- **Signature hint:** `declare function withReactivity(keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): <A extends Atom<any>>(atom: A) => A`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.withReactivity`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns `Rx.runtime.withReactivity` for refreshing an atom whenever the keys change in the `Reactivity` service. Call `Atom.withReactivity` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.fnSync`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1026`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a writable atom for a synchronous function; writing an argument re-runs the function, returning `Option.none` before the first call unless an initial value is supplied.
- **Signature hint:** `declare function fnSync<Arg>(): { <A>(f: (arg: Arg, get: FnContext) => A): Writable<Option.Option<A>, Arg>; <A>(f: (arg: Arg, get: FnContext) => A, options: { readonly initialValue: A; }): Writable<A, Arg>; } declare function fnSync<A, Arg = void>(f: (arg: Arg, get: FnContext) => A): Writable<Option.Option<A>, Arg> declare function fnSync<A, Arg = void>(f: (arg: Arg, get: FnContext) => A, options: { readonly initialValue: A; }): Writable<A, Arg>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.fnSync`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a writable atom for a synchronous function; writing an argument re-runs the function, returning `Option.none` before the first call unless an initial value is supplied. Call `Atom.fnSync` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.pull`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1246`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a writable atom that pulls an initial chunk from a stream and then pulls the next chunk whenever it is written to, accumulating items unless `disableAccumulation` is enabled.
- **Signature hint:** `declare function pull<A, E>(create: ((get: AtomContext) => Stream.Stream<A, E, AtomRegistry>) | Stream.Stream<A, E, AtomRegistry>, options?: { readonly disableAccumulation?: boolean | undefined; }): Writable<PullResult<A, E>, void>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.pull`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a writable atom that pulls an initial chunk from a stream and then pulls the next chunk whenever it is written to, accumulating items unless `disableAccumulation` is enabled. Call `Atom.pull` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.withFallback`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1388`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Uses a fallback `AsyncResult` atom while the primary atom is `Initial`, marking the fallback result as waiting until the primary atom produces a non-initial result.
- **Signature hint:** `declare function withFallback<E2, A2>(fallback: Atom<AsyncResult.AsyncResult<A2, E2>>): <R extends Atom<AsyncResult.AsyncResult<any, any>>>(self: R) => [R] extends [Writable<infer _, infer RW>] ? Writable<AsyncResult.AsyncResult<AsyncResult.AsyncResult.Success<Type<R>> | A2, AsyncResult.AsyncResult.Failure<Type<R>> | E2>, RW> : Atom<AsyncResult.AsyncResult<AsyncResult.AsyncResult.Success<Type<R>> | A2, AsyncResult.AsyncResult.Failure<Type<R>> | E2>> declare function withFallback<R extends Atom<AsyncResult.AsyncResult<any, any>>, A2, E2>(self: R, fallback: Atom<AsyncResult.AsyncResult<A2, E2>>): [R] extends [Writable<infer _, infer RW>] ? Writable<AsyncResult.AsyncResult<AsyncResult.AsyncResult.Success<Type<R>> | A2, AsyncResult.AsyncResult.Failure<Type<R>> | E2>, RW> : Atom<AsyncResult.AsyncResult<AsyncResult.AsyncResult.Success<Type<R>> | A2, AsyncResult.AsyncResult.Failure<Type<R>> | E2>>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.withFallback`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Uses a fallback `AsyncResult` atom while the primary atom is `Initial`, marking the fallback result as waiting until the primary atom produces a non-initial result. Call `Atom.withFallback` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.keepAlive`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1468`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a copy of an atom that remains cached and mounted even when no subscribers are using it.
- **Signature hint:** `declare function keepAlive<A extends Atom<any>>(self: A): A`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.keepAlive`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a copy of an atom that remains cached and mounted even when no subscribers are using it. Call `Atom.keepAlive` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.autoDispose`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1484`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Allows a reactive value to be disposed of when it is not in use.
- **Signature hint:** `declare function autoDispose<A extends Atom<any>>(self: A): A`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.autoDispose`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Allows a reactive value to be disposed of when it is not in use. Call `Atom.autoDispose` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.setLazy`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1501`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets whether an atom should be lazy.
- **Signature hint:** `declare function setLazy(lazy: boolean): <A extends Atom<any>>(self: A) => A declare function setLazy<A extends Atom<any>>(self: A, lazy: boolean): A`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.setLazy`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets whether an atom should be lazy. Call `Atom.setLazy` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.withLabel`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1560`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Attaches a diagnostic label to an atom.
- **Signature hint:** `declare function withLabel(name: string): <A extends Atom<any>>(self: A) => A declare function withLabel<A extends Atom<any>>(self: A, name: string): A`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.withLabel`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Attaches a diagnostic label to an atom. Call `Atom.withLabel` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.initialValue`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1587`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Pairs an atom with an initial value for registry initialization.
- **Signature hint:** `declare function initialValue<A>(initialValue: A): (self: Atom<A>) => readonly [Atom<A>, A] declare function initialValue<A>(self: Atom<A>, initialValue: A): readonly [Atom<A>, A]`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.initialValue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Pairs an atom with an initial value for registry initialization. Call `Atom.initialValue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.transform`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1608`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Creates a derived atom by reading another atom with a custom `AtomContext` function.
- **Signature hint:** `declare function transform<R extends Atom<any>, B>(f: (get: AtomContext, atom: R) => B, options?: { readonly initialValueTarget?: Atom<B> | undefined; }): (self: R) => [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B> declare function transform<R extends Atom<any>, B>(self: R, f: (get: AtomContext, atom: R) => B, options?: { readonly initialValueTarget?: Atom<B> | undefined; }): [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.transform`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a derived atom by reading another atom with a custom `AtomContext` function. Call `Atom.transform` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.map`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1677`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Maps the current value of an atom with a pure function.
- **Signature hint:** `declare function map<R extends Atom<any>, B>(f: (_: Type<R>) => B): (self: R) => [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B> declare function map<R extends Atom<any>, B>(self: R, f: (_: Type<R>) => B): [R] extends [Writable<infer _, infer RW>] ? Writable<B, RW> : Atom<B>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.map`.
- **Suggested snippet:** Apply `Atom.map` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.mapResult`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1701`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Maps the successful value inside an `AsyncResult` atom.
- **Signature hint:** `declare function mapResult<R extends Atom<AsyncResult.AsyncResult<any, any>>, B>(f: (_: AsyncResult.AsyncResult.Success<Type<R>>) => B): (self: R) => [R] extends [Writable<infer _, infer RW>] ? Writable<AsyncResult.AsyncResult<B, AsyncResult.AsyncResult.Failure<Type<R>>>, RW> : Atom<AsyncResult.AsyncResult<B, AsyncResult.AsyncResult.Failure<Type<R>>>> declare function mapResult<R extends Atom<AsyncResult.AsyncResult<any, any>>, B>(self: R, f: (_: AsyncResult.AsyncResult.Success<Type<R>>) => B): [R] extends [Writable<infer _, infer RW>] ? Writable<AsyncResult.AsyncResult<B, AsyncResult.AsyncResult.Failure<Type<R>>>, RW> : Atom<AsyncResult.AsyncResult<B, AsyncResult.AsyncResult.Failure<Type<R>>>>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.mapResult`.
- **Suggested snippet:** Apply `Atom.mapResult` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.debounce`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1734`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Creates an atom that publishes source changes only after the source has stopped changing for the specified duration.
- **Signature hint:** `declare function debounce(duration: Duration.Input): <A extends Atom<any>>(self: A) => WithoutSerializable<A> declare function debounce<A extends Atom<any>>(self: A, duration: Duration.Input): WithoutSerializable<A>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.debounce`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an atom that publishes source changes only after the source has stopped changing for the specified duration. Call `Atom.debounce` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.withRefresh`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1772`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Creates a derived atom that reads the source and schedules a refresh after the specified duration.
- **Signature hint:** `declare function withRefresh(duration: Duration.Input): <A extends Atom<any>>(self: A) => WithoutSerializable<A> declare function withRefresh<A extends Atom<any>>(self: A, duration: Duration.Input): WithoutSerializable<A>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.withRefresh`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a derived atom that reads the source and schedules a refresh after the specified duration. Call `Atom.withRefresh` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.swr`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1801`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds stale-while-revalidate refresh behavior to an async result atom.
- **Signature hint:** `declare function swr(options: { readonly staleTime: Duration.Input; readonly revalidateOnMount?: boolean | undefined; readonly revalidateOnFocus?: boolean | 'always' | undefined; readonly focusSignal?: Atom<any> | undefined; }): <R extends Atom<AsyncResult.AsyncResult<any, any>>>(self: R) => WithoutSerializable<R> declare function swr<R extends Atom<AsyncResult.AsyncResult<any, any>>>(self: R, options: { readonly staleTime: Duration.Input; readonly revalidateOnMount?: boolean | undefined; readonly revalidateOnFocus?: boolean | 'always' | undefined; readonly focusSignal?: Atom<any> | undefined; }): WithoutSerializable<R>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.swr`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds stale-while-revalidate refresh behavior to an async result atom. Call `Atom.swr` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/Atom.optimisticFn`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1999`
- **Kind / category:** `root-declaration` / `Optimistic`
- **Priority:** **recommended**
- **Current description:** Creates an `AtomResultFn` that applies an optimistic update before running the underlying mutation.
- **Signature hint:** `declare function optimisticFn<A, W, XA, XE, OW = void>(options: { readonly reducer: (current: NoInfer<A>, update: OW) => NoInfer<W>; readonly fn: AtomResultFn<OW, XA, XE> | ((set: (result: NoInfer<W>) => void) => AtomResultFn<OW, XA, XE>); }): (self: Writable<A, Atom<AsyncResult.AsyncResult<W, unknown>>>) => AtomResultFn<OW, XA, XE> declare function optimisticFn<A, W, XA, XE, OW = void>(self: Writable<A, Atom<AsyncResult.AsyncResult<W, unknown>>>, options: { readonly reducer: (current: NoInfer<A>, update: OW) => NoInfer<W>; readonly fn: AtomResultFn<OW, XA, XE> | ((set: (result: NoInfer<W>) => void) => AtomResultFn<OW, XA, XE>); }): AtomResultFn<OW, XA, XE>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.optimisticFn`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an `AtomResultFn` that applies an optimistic update before running the underlying mutation. Call `Atom.optimisticFn` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/reactivity/Atom.AtomContext`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:160`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **optional**
- **Current description:** Context passed to atom read functions for reading dependencies, awaiting `AsyncResult` or `Option` values, managing subscriptions and finalizers, refreshing atoms, and updating writable atoms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.AtomContext`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.WriteContext`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:200`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **optional**
- **Current description:** Context passed to writable atom write functions for reading atoms, refreshing or setting the current atom, and writing to other writable atoms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.WriteContext`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.isWritable`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:361`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when an atom is writable.
- **Signature hint:** `declare function isWritable<R, W>(atom: Atom<R>): atom is Writable<R, W>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.isWritable`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Atom.isWritable` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.readable`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:369`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a read-only atom from a read function and an optional custom refresh registration callback.
- **Signature hint:** `declare function readable<A>(read: (get: AtomContext) => A, refresh?: (f: <A>(atom: Atom<A>) => void) => void): Atom<A>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.readable`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a read-only atom from a read function and an optional custom refresh registration callback. Call `Atom.readable` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.writable`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:387`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a writable atom from read and write functions, with an optional custom refresh registration callback.
- **Signature hint:** `declare function writable<R, W>(read: (get: AtomContext) => R, write: (ctx: WriteContext<R>, value: W) => void, refresh?: (f: <A>(atom: Atom<A>) => void) => void): Writable<R, W>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.writable`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a writable atom from read and write functions, with an optional custom refresh registration callback. Call `Atom.writable` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.family`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1345`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a memoized atom factory that returns the same object for the same argument, using weak references for cached values when the platform supports them.
- **Signature hint:** `declare function family<Arg, T extends object>(f: (arg: Arg) => T): (arg: Arg) => T`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.family`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a memoized atom factory that returns the same object for the same argument, using weak references for cached values when the platform supports them. Call `Atom.family` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.optimistic`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1896`
- **Kind / category:** `root-declaration` / `Optimistic`
- **Priority:** **optional**
- **Current description:** Wraps an atom in a writable optimistic atom.
- **Signature hint:** `declare function optimistic<A>(self: Atom<A>): Writable<A, Atom<AsyncResult.AsyncResult<A, unknown>>>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.optimistic`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Wraps an atom in a writable optimistic atom. Call `Atom.optimistic` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.batch`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2066`
- **Kind / category:** `root-declaration` / `batching`
- **Priority:** **optional**
- **Current description:** Runs synchronous atom updates as a batch.
- **Signature hint:** `declare function batch(f: () => void): void`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.batch`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs synchronous atom updates as a batch. Call `Atom.batch` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.windowFocusSignal`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2083`
- **Kind / category:** `root-declaration` / `Focus`
- **Priority:** **optional**
- **Current description:** Creates a browser-only signal atom that increments when the document becomes visible.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.windowFocusSignal`.
- **Suggested snippet:** Use `Atom.windowFocusSignal` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.makeRefreshOnSignal`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2109`
- **Kind / category:** `root-declaration` / `Focus`
- **Priority:** **optional**
- **Current description:** Creates a combinator that refreshes an atom whenever the supplied signal atom changes.
- **Signature hint:** `declare function makeRefreshOnSignal<_>(signal: Atom<_>): <A extends Atom<any>>(self: A) => WithoutSerializable<A>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.makeRefreshOnSignal`.
- **Suggested snippet:** Construct one representative value with `Atom.makeRefreshOnSignal`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.refreshOnWindowFocus`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2128`
- **Kind / category:** `root-declaration` / `Focus`
- **Priority:** **optional**
- **Current description:** Refreshes an atom whenever `windowFocusSignal` changes.
- **Signature hint:** `declare function refreshOnWindowFocus<A extends Atom<any>>(self: A): WithoutSerializable<A>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.refreshOnWindowFocus`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Refreshes an atom whenever `windowFocusSignal` changes. Call `Atom.refreshOnWindowFocus` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.kvs`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2148`
- **Kind / category:** `root-declaration` / `KeyValueStore`
- **Priority:** **optional**
- **Current description:** Creates a writable atom backed by a `KeyValueStore` entry.
- **Signature hint:** `declare function kvs<S extends Schema.ConstraintCodec<any, any>, const Mode extends 'sync' | 'async' = never>(options: { readonly runtime: AtomRuntime<KeyValueStore.KeyValueStore, any>; readonly key: string; readonly schema: S; readonly defaultValue: LazyArg<S['Type']>; readonly mode?: Mode | undefined; }): Writable<'async' extends Mode ? AsyncResult.AsyncResult<S['Type']> : S['Type'], S['Type']>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.kvs`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a writable atom backed by a `KeyValueStore` entry. Call `Atom.kvs` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.searchParam`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2213`
- **Kind / category:** `root-declaration` / `search params`
- **Priority:** **optional**
- **Current description:** Creates an atom that reads and writes a URL search parameter.
- **Signature hint:** `declare function searchParam<S extends Schema.ConstraintCodec<any, string> = never>(name: string, options?: { readonly schema?: S | undefined; }): Writable<[S] extends [never] ? string : Option.Option<S['Type']>>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.searchParam`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an atom that reads and writes a URL search parameter. Call `Atom.searchParam` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.toStream`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2305`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an atom into a stream using the `AtomRegistry` service.
- **Signature hint:** `declare function toStream<A>(self: Atom<A>): Stream.Stream<A, never, AtomRegistry>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.toStream`.
- **Suggested snippet:** Create a finite stream, apply `Atom.toStream`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.toStreamResult`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2319`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an `AsyncResult` atom into a stream using the `AtomRegistry` service.
- **Signature hint:** `declare function toStreamResult<A, E>(self: Atom<AsyncResult.AsyncResult<A, E>>): Stream.Stream<A, E, AtomRegistry>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.toStreamResult`.
- **Suggested snippet:** Create a finite stream, apply `Atom.toStreamResult`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.get`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2328`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Reads an atom's current value from the `AtomRegistry` service.
- **Signature hint:** `declare function get<A>(self: Atom<A>): Effect.Effect<A, never, AtomRegistry>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.get`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Atom.get`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.modify`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2338`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Reads a writable atom, computes a return value and next write value, writes the next value, and returns the computed result.
- **Signature hint:** `declare function modify<R, W, A>(f: (_: R) => [returnValue: A, nextValue: W]): (self: Writable<R, W>) => Effect.Effect<A, never, AtomRegistry> declare function modify<R, W, A>(self: Writable<R, W>, f: (_: R) => [returnValue: A, nextValue: W]): Effect.Effect<A, never, AtomRegistry>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.modify`.
- **Suggested snippet:** Create the smallest mutable reference supported by the module, apply `Atom.modify` with an update that returns a visibly different result and state, then read the state and assert both observable values. For Effect-returning variants, include failure preservation only when tests establish it.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.set`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2355`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Writes a value to a writable atom through the `AtomRegistry` service.
- **Signature hint:** `declare function set<W>(value: W): <R>(self: Writable<R, W>) => Effect.Effect<void, never, AtomRegistry> declare function set<R, W>(self: Writable<R, W>, value: W): Effect.Effect<void, never, AtomRegistry>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.set`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Atom.set`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.update`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2371`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Updates a writable atom by reading its current value from the registry and writing the value returned by the update function.
- **Signature hint:** `declare function update<R, W>(f: (_: R) => W): (self: Writable<R, W>) => Effect.Effect<void, never, AtomRegistry> declare function update<R, W>(self: Writable<R, W>, f: (_: R) => W): Effect.Effect<void, never, AtomRegistry>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.update`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Atom.update`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.getResult`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2392`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Reads an `AsyncResult` atom as an effect through the `AtomRegistry` service.
- **Signature hint:** `declare function getResult<A, E>(self: Atom<AsyncResult.AsyncResult<A, E>>, options?: { readonly suspendOnWaiting?: boolean | undefined; }): Effect.Effect<A, E, AtomRegistry>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.getResult`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Atom.getResult`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.refresh`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2408`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Runs a refresh request for an atom through the `AtomRegistry` service.
- **Signature hint:** `declare function refresh<A>(self: Atom<A>): Effect.Effect<void, never, AtomRegistry>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.refresh`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Atom.refresh`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.Serializable`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2456`
- **Kind / category:** `root-declaration` / `Serializable`
- **Priority:** **optional**
- **Current description:** Serialization metadata attached to an atom.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.Serializable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.isSerializable`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2470`
- **Kind / category:** `root-declaration` / `Serializable`
- **Priority:** **optional**
- **Current description:** Returns `true` when an atom carries `Serializable` metadata.
- **Signature hint:** `declare function isSerializable(self: Atom<any>): self is Atom<any> & Serializable<any>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.isSerializable`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Atom.isSerializable` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.serializable`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2483`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Attaches serialization metadata to an atom using a schema and stable key.
- **Signature hint:** `declare function serializable<R extends Atom<any>, S extends Schema.ConstraintCodec<Type<R>, any>>(options: { readonly key: string; readonly schema: S; }): (self: R) => R & Serializable<S> declare function serializable<R extends Atom<any>, S extends Schema.ConstraintCodec<Type<R>, any>>(self: R, options: { readonly key: string; readonly schema: S; }): R & Serializable<S>`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.serializable`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Attaches serialization metadata to an atom using a schema and stable key. Call `Atom.serializable` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.withServerValue`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2522`
- **Kind / category:** `root-declaration` / `ServerValue`
- **Priority:** **optional**
- **Current description:** Sets the value of an Atom when read on the server.
- **Signature hint:** `declare function withServerValue<A extends Atom<any>>(read: (get: <A>(atom: Atom<A>) => A) => Type<A>): (self: A) => A declare function withServerValue<A extends Atom<any>>(self: A, read: (get: <A>(atom: Atom<A>) => A) => Type<A>): A`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.withServerValue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the value of an Atom when read on the server. Call `Atom.withServerValue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.withServerValueInitial`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2541`
- **Kind / category:** `root-declaration` / `ServerValue`
- **Priority:** **optional**
- **Current description:** Sets an `AsyncResult` atom's server-side value to `AsyncResult.initial(true)`.
- **Signature hint:** `declare function withServerValueInitial<A extends Atom<AsyncResult.AsyncResult<any, any>>>(self: A): A`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.withServerValueInitial`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets an `AsyncResult` atom's server-side value to `AsyncResult.initial(true)`. Call `Atom.withServerValueInitial` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.getServerValue`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2555`
- **Kind / category:** `root-declaration` / `ServerValue`
- **Priority:** **optional**
- **Current description:** Reads an atom from a registry, using its server-side read override when one is present.
- **Signature hint:** `declare function getServerValue(registry: Registry.AtomRegistry): <A>(self: Atom<A>) => A declare function getServerValue<A>(self: Atom<A>, registry: Registry.AtomRegistry): A`
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.getServerValue`.
- **Suggested snippet:** Create a small representative input, call `Atom.getServerValue`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.Atom`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:66`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Reactive value read by an `AtomRegistry`, with metadata controlling caching, laziness, refresh behavior, and initial value targeting.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.Atom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.Type`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:92`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the value type produced by an `Atom`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.Success`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:100`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the success value type from an atom whose value is an `AsyncResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.PullSuccess`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:108`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the item type from an atom whose value is a `PullResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.PullSuccess`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.Failure`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:116`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the failure error type from an atom whose value is an `AsyncResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.Failure`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.WithoutSerializable`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:124`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Returns an atom type without serializable metadata, preserving `Writable` read and write types when the input atom is writable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.WithoutSerializable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.Writable`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:149`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Atom that can also be written to, using a `WriteContext` and an input value to update reactive state.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.Writable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.AtomRuntime`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:615`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Atom that builds a `Context` from a `Layer` and exposes constructors for atoms, functions, pulls, and subscription refs that run with that context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.AtomRuntime`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.RuntimeFactory`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:702`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Factory for `AtomRuntime` values that share a `Layer.MemoMap` and a set of global layers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.RuntimeFactory`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.RuntimeFactory.withReactivity`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:715`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Uses the `Reactivity` service from the runtime to refresh the atom whenever the keys change.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/reactivity/Atom.RuntimeFactory.withReactivity` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.FnContext`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:993`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Context passed to `fn` and `fnSync` computations for reading atoms, awaiting results, registering finalizers, refreshing atoms, subscribing to changes, and writing updates.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.FnContext`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.AtomResultFn`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1076`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Writable async function atom whose value is an `AsyncResult` and whose writes accept function arguments plus `Reset` and `Interrupt` controls.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.AtomResultFn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/Atom.PullResult`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1235`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** `AsyncResult` produced by `pull`, containing a non-empty batch of pulled items and a `done` flag, or `NoSuchElementError` when the stream completes without items.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/Atom.PullResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/reactivity/Atom.TypeId (type)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:50`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to recognize `Atom` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/reactivity/Atom.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.TypeId (value)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:58`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier attached to `Atom` values and used by `isAtom`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Atom.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.WritableTypeId (value)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:133`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier attached to writable atoms and used by `isWritable`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.WritableTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Atom.WritableTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.WritableTypeId (type)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:141`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to recognize writable atoms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/reactivity/Atom.WritableTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.Reset (value)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1091`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the control symbol that can be written to an `AtomResultFn` to reset it to its initial state.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.Reset`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Atom.Reset` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.Reset (type)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1099`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Type of the `Reset` control symbol accepted by `AtomResultFn` writes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/reactivity/Atom.Reset` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.Interrupt (value)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1112`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the control symbol that can be written to an `AtomResultFn` to interrupt the current asynchronous computation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.Interrupt`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Atom.Interrupt` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.Interrupt (type)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:1120`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Type of the `Interrupt` control symbol accepted by `AtomResultFn` writes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/reactivity/Atom.Interrupt` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.SerializableTypeId (value)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2435`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The type id used to mark atoms that carry serialization metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.SerializableTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Atom.SerializableTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.SerializableTypeId (type)`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2443`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The literal type of the serializable atom marker.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/reactivity/Atom.SerializableTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/Atom.ServerValueTypeId`

- **Source:** `packages/effect/src/unstable/reactivity/Atom.ts:2514`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The type id used to mark atoms with a server-side read override.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Atom } from "effect/unstable/reactivity"` and use `Atom.ServerValueTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Atom.ServerValueTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
