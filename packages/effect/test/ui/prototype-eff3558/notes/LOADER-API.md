# Loader core: API for the UI integration (EFF-3558 prototype)

Files:
- `packages/effect/src/reactivity/Loader.ts` (core, one file, no effect/ui or DOM imports, no Reactivity)
- `packages/effect/test/reactivity/Loader.test.ts` (16 tests, all pass)
- `packages/effect/src/reactivity/index.ts` (one hand-added barrel line: `export * as Loader from "./Loader.ts"`)
- `tsconfig.eff3558-loader.json` at the repo root (type checks only the two Loader files)

Run: `cd packages/effect && nix develop -c pnpm vitest run test/reactivity/Loader.test.ts`
Check: `cd <repo root> && nix develop -c pnpm exec tsc -p tsconfig.eff3558-loader.json`

Import: `import { Loader } from "effect/reactivity"` or `import * as Loader from "../reactivity/Loader.ts"`.

## Public

```ts
Loader.Service<Self>()(key, {
  args: Schema.Codec<Args, any>, success: Schema.Codec<A, any>, error: Schema.Codec<E, any>,
  staleTime: Duration.Input,                       // required; negative throws at definition
  idleTimeToLive?: Duration.Input,                 // negative throws
  refetchInterval?: Duration.Input | ((result: Success<A,E> | Failure<A,E>, args: Args) => Duration.Input | undefined),
  tags?: ReadonlyArray<Loader.Tag>
}, fetcher: Effect<(args: Args) => Effect<A, E /* R = never */>, LE, LR>)
  : Loader.Service<Self, Key, Args, A, E, LE, Exclude<LR, Scope>>
```

Statics on the read class:

| Member | Semantics |
| --- | --- |
| `layer: Layer<Self, LE, LR>` | Builds the fetcher. Records the build's Scope; closing it interrupts or hands over the fetches it owns. |
| `get(args): Effect<A, E, Self \| Cache>` | Fresh stored Success, else joins or starts a fetch. Server value, never patched. |
| `prefetch(args): Effect<void, never, Self \| Cache>` | Starts a fetch owned by the build, returns at once. Fresh entry: only resets the idle timer. No-op under a live patch. |
| `invalidate(args?): Effect<void, never, Cache>` | One entry, or the whole read when `args` is omitted or `undefined`. |
| `changes(args): Stream<AsyncResult<A, E>, never, Self \| Cache>` | A watcher as a Stream (patched view). Dies with a fetcher defect. |
| `peek(args): Effect<AsyncResult<A, E>, never, Cache>` | Patched view, no fetch, no idle reset. Sync form is `internals(cache).peek`. |
| `entry(args): EntryTarget` | Invalidation target, plain data. |
| `patch(args, fn: A => A): PatchTarget` | Optimistic patch of one entry. |
| `patchAll(fn: (A, Args) => A): PatchAllTarget` | Patch of every entry of the read holding a Success at issue. |
| `set(args, value: A): SetTarget` | A write, for `writes`. |
| the class itself | "Whole read" invalidation target (`Loader.isRead`). |

Other public exports:

- `Loader.Tag(name): Tag`: tag target, listed on reads via `tags`.
- `type Target = AnyDefinition | EntryTarget | Tag`, `type Patch = PatchTarget | PatchAllTarget`, `SetTarget`.
- `type ArgsOf<R>`, `SuccessOf<R>`, `ErrorOf<R>`: infer from a read class (for `Loaded.at`).
- `Loader.Cache`: Context service. `Loader.layer({ idleTimeToLive?, settleOnce?, noFetch? }): Layer<Cache>`.
- `Loader.Visibility`, `Loader.Connectivity`: `Context.Reference<Signal>`, default always true.
  `Signal = { get(): boolean; subscribe(listener: (value: boolean) => void): () => void }`.
  `Loader.makeSignal(initial = true): SettableSignal` adds `set(value)`; use it for tests and for the BrowserHost Layers.

## Internal (for the effect/ui runtime)

```ts
Loader.makeCacheUnsafe(options: {
  scope: Scope.Scope                 // closing it disposes the cache (fetches, timers, signal listeners)
  context?: Context.Context<never>   // Clock, Scheduler, Visibility, Connectivity are read from it once; every fetch and timer forks with it
  idleTimeToLive?: Duration.Input    // default "5 minutes"
  settleOnce?: boolean               // server per-request mode
  noFetch?: boolean                  // budget 0
}): Cache["Service"]

Loader.internals(cache: Cache["Service"]): CacheInternals   // same as cache[Loader.CacheTypeId]
```

Put the value in the context with `Context.add(ctx, Loader.Cache, cache)`.
If the runtime has its own Scheduler, add it to `context` before the call (as `withScheduler` does in runtime.ts).

Every read parameter below accepts the read class. Everything is synchronous unless it returns an Effect.

| `CacheInternals` member | Semantics |
| --- | --- |
| `register(read): void` | Hands the cache a definition; decodes its raw hydrated entries. Every other method calls it. |
| `watch(read, args, fetcher, onChange, onDefect?): WatchHandle` | Registers a watcher. `fetcher` is the read's service value from the instance's context (`Context.get(ctx, Read)`); it identifies the Layer build. The count rises and the zero-to-one fetch decision is made inside the call; the fetcher body starts one scheduler step later; `onChange` is never called inside the call. First emission is deferred one step and only if the entry is settled. Emits on each settle and each `waiting` flip, skipping values `Equal` to this watcher's last. |
| `WatchHandle.unregister()` | Sync, idempotent. Drops the count; stops the interval at zero; drops a bare Failure; starts the idle timer. Call it from the watch marker on instance close, not from a stream finalizer. |
| `WatchHandle.current()` | Patched view now (Initial over cold). `WatchHandle.argsKey` is the derived key. |
| `peek(read, args): AsyncResult` | Patched view. Doesn't create the entry. |
| `get(read, args, fetcher): Effect<A, E>` | What `Read.get` runs. |
| `prefetch(read, args, fetcher): void` | What `Read.prefetch` runs. |
| `applyInvalidation(targets, { exclude? }): void` | One batch; an entry hit several times restarts once. `exclude` takes the `EntryRef`s from `applyWrites`. No-op with a warning in settle-once mode. |
| `beginRun(patches?): RunHandle` | Call at issue (`queue` and `switch`; not for `drop`). Registers patches in order, all-or-nothing: throws if a patch throws, registering nothing. Interrupts a fetch in flight on each patched entry and emits the patched view synchronously. Call it with no patches too if the Command has `writes`. |
| `RunHandle.start()` | Call when the run's work really begins (after queueing). Sets the point the fresh/stale write rule counts from. |
| `RunHandle.finish({ exit, invalidates?, writes? })` | `"success"`: patches become held, writes stored, then invalidation of `invalidates` plus `implied` minus fresh writes. `"failure"` (typed failure, interrupt, defect): patches removed, invalidation applied. `"stopped"` (never started): patches removed, nothing invalidated. Then the deferred-trigger check runs. Idempotent. Call it before sending the result message. |
| `RunHandle.implied` | Targets the run's patches imply (entry per `patch`, read per `patchAll`). `finish` adds them itself. |
| `applyWrites(run, sets): ReadonlyArray<EntryRef>` | Lower-level; `finish` calls it. Returns entries stored fresh. |
| `onFetch(listener: ({ read, argsKey, trigger, restart }) => void): () => void` | Fires at each fetch start. `restart: true` when it replaces an interrupted fetch (same trigger). |
| `isFetching(): boolean` | Any cache fetch in flight. |
| `onIdle(listener): () => void` | Fires each time the in-flight count reaches zero. |
| `awaitIdle: Effect<void>` | Resumes at once if idle, else at the next idle. |
| `dehydrate(): Dehydrated` | Interrupts fetches in flight and pending `get` callers, returns `Record<readName, Array<[argsKey, 0, encodedSuccess, timestamp] \| [argsKey, 1, [encodedError, ...], timestamp]>>`. JSON-safe. |
| `hydrate(raw: unknown, { static? }): void` | Holds raw entries until their read registers. Opens the window unless `static`. Malformed input is ignored whole with a warning. With `static`, finite-`staleTime` entries hydrate stale. |
| `openWindow()`, `closeWindow()`, `isWindowOpen()` | `closeWindow` drops unwatched hydrated bare Failures (raw ones too) and makes hydrated entries ordinary. Call it at `root.adopted` or the first navigation. |
| `inspect(read, args)` | `{ exists, watchers, fetching, stale, patches }`, for tests and dev checks. |

Modes:
- `settleOnce`: every settle is stored (unwatched Failures too), a settled entry never refetches, `applyInvalidation` is a no-op, no idle timers, no intervals, no edge pass.
- `noFetch`: no fetch ever starts; `get` waits until `dehydrate` or disposal interrupts it.

Fetch triggers (`Trigger`): `watch | get | prefetch | visibility | connectivity | interval | invalidation`.

Server watch (EFF-3557 #11): call `watch` with a callback and no Stream; it is dispatched at settle. Idle check: `isFetching()` plus `onIdle`.

## Not implemented

- Dev-mode checks: two live builds of one read, impure patch, patched value against the `success` Schema, write covered by neither `invalidates` nor a patch, `refetchInterval` under one second, duplicate tag names. Two reads with one name only warns.
- Rejecting args Schemas with an unsound encoding at definition (EFF-3554 #3). Nothing is checked.
- `LoaderHttpApi`, `LoaderRpc`.
- `patchAll` skips a hydrated entry nobody has addressed by args yet (the args key isn't reversible).
- No dev/prod switch: warnings go through `console.warn` always.
- `Loaded` binding, snapshots, Command wiring, `~loader` in `state`: the integration engineer's part.
