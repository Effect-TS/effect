# Command API and runtime hook points (EFF-3558 prototype)

For the engineer wiring the Loader cache into the runtime. Paths are under `effect/packages/effect`. Line numbers are for the working tree as I left it; the function names are the stable reference.

Run tests from the repo root, not from the package (see FINDINGS F-C1):

```
nix develop -c pnpm vitest run --project effect packages/effect/test/ui
nix develop -c pnpm exec tsc --noEmit -p tsconfig.eff3558-ui.json   # tests + typetests of ui only, ~5s (prototype helper)
```

## 1. Issue site (`src/ui/Command.ts`)

### Declaring

```ts
class RenameUser extends Command.Service<RenameUser>()(
  "users/RenameUser",
  Effect.succeed((id: string, name: string): Effect.Effect<User, RenameFailed> => ...),
  {
    // mode?, key?, stream? as before. `server` is gone.
    invalidates: (id, name) => [/* Target */],          // REQUIRED
    optimistic: (id, name) => [/* Patch */],            // optional
    writes: (user, id, name) => [/* Write */]           // optional, Effect Commands only
  }
) {}
```

- `Service` (line 911). The third parameter is required. Options type: `Command.Service.Options<Args, A>` (line 671):
  - `invalidates: (...args: Args) => ReadonlyArray<Target>`
  - `optimistic?: (...args: Args) => ReadonlyArray<Patch>`
  - `writes?: (success: A, ...args: Args) => ReadonlyArray<Write>`; the Stream overload types it `undefined`.
- `Target`, `Patch`, `Write` (lines 78, 87, 96) are empty placeholder interfaces marked `TODO(loader)`. Replace them with the Loader's types (or re-export them). Anything is assignable to them today, so tests use plain objects.
- `Command.make` takes none of the three; its Commands carry `invalidates: []`, `optimistic: []`, `writes: undefined`.
- The options are their own type parameter `O extends Service.Options<Args, A>` on purpose. Do not inline them as `options: Service.Options<Args, A>`: that makes the callbacks infer `Args` and drops optional body parameters (FINDINGS F-C4).

### Issuing

```ts
// Body cannot fail (Err = never): make returns a Command. Use Command.map as before.
$.run(LoadThing.make(id).pipe(Command.map((thing) => Loaded(thing))))

// Body can fail: make returns Command.Unmatched, which $.run and Command.map reject.
$.run(RenameUser.make(id, name).pipe(Command.match({
  onSuccess: (user) => Renamed(user),
  onFailure: (error) => RenameFailed(error)
})))
```

Signatures:

```ts
// Service<Self, Key, Args, Msg, IsStream, E, R, Err = never>
make(...args: Args): [Err] extends [never]
  ? (IsStream extends true ? Streaming<Msg, Self> : Effectful<Msg, Self>)
  : Unmatched<Msg, Err, Self, IsStream extends true ? "Stream" : "Effect">

interface Unmatched<A, E, R, K extends Kind> extends Pipeable, Declared {   // line 392
  readonly _tag: K; readonly name: string; readonly args: ReadonlyArray<unknown>
  readonly mode: Mode; readonly key: string | undefined
  readonly effect: K extends "Effect" ? Effect<A, E, R> : undefined
  readonly stream: K extends "Stream" ? Stream<A, E, R> : undefined
}

const match: {                                                              // line 1001
  <A, E, M1, M2>(options: { onSuccess: (a: A) => M1; onFailure: (e: E) => M2 }):
    <R, K extends Kind>(self: Unmatched<A, E, R, K>) => Issued<M1 | M2, R, A, K, E>
  <A, E, R, K extends Kind, M1, M2>(self: Unmatched<A, E, R, K>, options: {...}): Issued<M1 | M2, R, A, K, E>
}

// map (line 1055) composes over both resolve and reject, so map after match is fine.
type Failure<C>   // the body's typed failure of a Command, Unmatched or Service (line 505)
type Result<C>    // the body's success, now also for Unmatched
```

### What the issued Command carries

```ts
interface Declared {                                   // line 308; on Issued, Unmatched and Proto
  readonly invalidates: ReadonlyArray<Target>          // computed from args at make()
  readonly optimistic: ReadonlyArray<Patch>            // computed from args at make()
  readonly writes: ((success: any) => ReadonlyArray<Write>) | undefined   // args already bound
}

interface Issued<Msg, R, Source, K, SourceE = never> { // line 359
  // name, args, mode, key, _tag
  readonly effect / stream   // public: map/match applied, never fails
  readonly work              // @internal: the body's raw Effect/Stream, fails with SourceE
  readonly resolve: (result: Source) => Msg             // @internal
  readonly reject: ((error: SourceE) => Msg) | undefined // @internal; undefined unless matched
}
```

`makeIssued` (line 710) is the one constructor; `match` and `map` rebuild through it and keep the declared data. A Story reads it with no cache: `story.pending[0].command.invalidates` (see `test/ui/Story.test.ts`, `test/ui/Command.test.ts` "what a Service declares about the cache").

`Story.Steps.fail(target, error)` (`src/ui/testing/Story.ts:248`) drives the failure branch; `resolve(target, value)` takes the body's success.

## 2. Runtime hooks (`src/ui/internal/services.ts`, lines 71–118)

```ts
interface MutationRun {
  readonly command: Command.Effectful<any, any, never> | Command.Streaming<any, any, never>
  readonly args: ReadonlyArray<unknown>
  readonly path: string            // the issuing instance's path
}
interface MutationHooks {
  readonly onIssue: (run: MutationRun) => void                                   // (a)
  readonly onExit: (run: MutationRun, exit: Exit.Exit<unknown, unknown>) => void // (b)
  readonly onCancel: (run: MutationRun) => void                                  // (c)
}
const MutationHooks = Context.Reference<MutationHooks>("effect/ui/internal/MutationHooks", { defaultValue: no-ops })
```

Supplied through the Context given to `runtime.mount` / `start`; looked up once at `runtime.ts:368` (`const mutations = Context.get(ctx, services.MutationHooks)`). Tests provide it with `Effect.provideService(services.MutationHooks, hooks)` around `TestHost.mount` (`test/ui/MutationHooks.test.ts`).

The same `MutationRun` object is passed to every call about one run. Use it as the key (a `WeakMap`/`Map`) for whatever `onIssue` registered. Read `run.command.invalidates / optimistic / writes` off it.

Exact semantics (each is a test in `MutationHooks.test.ts`):

| When | Call | Where |
| --- | --- | --- |
| Command issued, mode says start or queue | `onIssue`, synchronously inside the issuing `update`/`init`, before the fiber is forked, before a queued run waits, before a switched-out run is asked to stop | `issue`, line 1192 |
| Mode says drop | nothing (`CommandDropped` reason `"mode"`) | `issue` |
| On the server | nothing. No Command runs there | `issue`, line ~1166 |
| `onIssue` throws | run never registered or started; rest of that update's Commands are skipped; instance fails with source `"update"`/`"init"`. No `onExit`/`onCancel` | `issue` |
| Fiber exits after taking its first step | `onExit(run, exit)`, **before** `resolve`/`reject` produce the message and before it is dispatched. Exit is the body's own: `Success(value)`, typed `Fail`, `Die`, or interrupt. Stream success is `void` | `startRun` observer → `settle`, line 1146 |
| Stop requested (interrupt Command, switch, unmount) on a run that has begun | nothing at the request. `onExit` with the interrupt when the fiber has actually exited | `stopRun` line 1243 |
| Run stopped before its first step: queued, waiting for a provided Layer, or stopped in the update that issued it | `onCancel(run)`; `onExit` never fires | `stopRun` → `settle(inst, run, undefined)` |
| Instance unmounts | each begun run: `onExit` with interrupt (the instance is already closed); each not-begun run: `onCancel` | scope finalizer at line ~877 → `stopRun` |

Exactly one of `onExit`/`onCancel` fires per registered run (`run.settled` guards it). A throw from either fails the instance with source `"command"`.

After `onExit`: interrupt → `CommandInterrupted`, no message. Defect, or typed failure with no `reject` → instance fails. Otherwise `reject(error)` or `resolve(value)` → `send`.

Not done for you: optimistic layers, settling writes, invalidation. `onIssue` is where optimistic patches go on; `onExit` is where `writes(exit.value)` and `invalidates` apply or roll back; `onCancel` is rollback only.

## 3. Where things are in `src/ui/internal/runtime.ts`

| What | Function / lines |
| --- | --- |
| `start` builds everything; one closure per root | `start`, line 349. `mount` (302) and `prerender` (319) call it |
| Service lookup from the mount Context | lines 366–368: `hooks` (`RootHooks`, Router's) and `mutations`. Add the cache lookup here |
| Options incl. hydration `state` and server flag | `Options`, ~line 210–225. `server.start` is the budget-0 flag (TODO(loader) at 221) |
| Flush scheduling | `wake` (438) calls `executor.schedule(flush)` (microtask on BrowserHost). `markDirty` (444), `defer` (448), `afterCommit` (453). `flush` (457) loops while `dirty` or `deferred`; `flushes` counts them (434) |
| After-commit work | `runCommitted` (507), `afterCommitHooks` (637, calls `hooks.afterFlush`) |
| Instance creation | `makeInstance` (801): forks `inst.scope` from the parent's (811), builds `dispatch`. `begin` (998) runs `init`, `resume` (1078) for slots that waited |
| Instance close | scope finalizers at ~865–883 set `inst.closed`, record `Unmounted`, stop runs. `close` (665) for a failed instance. `closeAll` (1801) closes a child's scope; `destroy` (1826) = `closeAll` + remove nodes |
| Close vs new instance on re-render | `patchOrReplace` (1770): key or type change → `create` new, then `destroy` old (new exists before old closes). In `patch`: `case "Slot"` (1723) → `destroy(inst, rendered.inner)` then `createChild` (1736–1737); `case "Child"` (1747) → if `instance.closed`, `createChild` (1754), else props update in place |
| Provided Layer build, waiting | `buildLayer` (748), `acquireShared` (765), the block at ~902–975 in `makeInstance`; `whenReady` (72) queues work until the Env is ready |
| Command lifecycle | `apply` (1108) → `issue` (1158) → `startRun` (1253) / `stopRun` (1243) / `promote` (1230) / `settle` (1146) |
| Subscriptions per instance | `syncSubscriptions` (1324): diff by key after each update; stop = `closeScope(running.scope)` (1339), start = fork under a scope forked from `inst.scope` (1343). Never on the server (1327). A read's "subscribe while mounted" has the same shape: scope forked from `inst.scope` |
| Element mounts | `startMount` (1404) |
| Prerender idle check | `checkIdle` (498): idle when `!scheduled && dirty.size === 0 && deferred.length === 0 && building.size === 0`. TODO(loader) at 495: add "no fetch in flight". `whenIdle` on the root handle (1999) registers a waiter. Whoever finishes a fetch must call `checkIdle()` |
| Prerender | `prerender` (319): races `root.whenIdle` (338) against the budget, then `root.finish()` (343) |
| State serialisation | `finish` (1922): flushes, sets `frozen`, walks instances encoding each Model by path, returns `{ nodes, state: { ...state, "~deferred": deferredPaths } }` (1973). TODO(loader) at 1972: put the cache under `"~loader"` here, same synchronous step. `"~pending"` no longer exists |
| Client adoption | `hydrating` is built at ~379–383 from `options.state` (`deferred` set from `"~deferred"`). `fromServer` (985) decodes the Model per path. In `begin`, an adopted instance calls `apply(inst, { model: inst.model, commands: first.commands, events: [] }, mountedSeq, true)` (1055): **every init Command reruns**. Router restore goes through `hooks.restore(path)` (1010) into the same branch. Read `"~loader"` where `hydrating` is built |
| `root.adopted` completes | `adoptedDone = true; hydrating = undefined` at 396–397 and 1881–1882; waiters released in `reportAdoption` (600–607, `adoptedWaiters.splice`). The handle's `adopted` Effect is at 1995. "Hydration ends" for the cache = here |
| Root handle | returned object ~1983–2004: `send`, `pending`, `flush`, `head`, `adopted`, `whenIdle`, `finish` |

## 4. Router: Model snapshot in `history.state` (`src/ui/Router.ts`)

- `readState` (468) / `writeState` (476) wrap `{ index, snapshot? }` under `stateKey`.
- `snapshot()` (567) merges `root.snapshot()` of every root; `leave()` (572) stores it in `snapshots` by history index.
- Push branch of navigate (615–619): `leave()`, then `history.replace(current.url + current.hash, writeState({ index, snapshot: snapshots.get(index) }))` writes the Model of the entry being left, then `history.push(printed + hash, writeState({ index }))`.
- `popped` (~626) reads `readState(state)`; restore uses `snapshots.get(target) ?? entry?.snapshot` (658).
- A cache snapshot for back/forward would ride in the same `writeState` object. Today a restored page reruns all its init Commands (FINDINGS F-C8).

## 5. Not implemented

- No cache, no reads, no `Target`/`Patch`/`Write` semantics. The three are opaque data.
- Hooks are no-ops by default. Nothing applies optimistic patches, writes or invalidation.
- No fetch tracking in `checkIdle`, no `"~loader"` in `finish`, nothing read from it on adoption.
- Stream Commands: no `writes`, and elements are not reported to the hooks.
- No changeset, no ai-docs update, `CHANGELOG`/`.changeset/effect-ui-scaffold.md` still describe `Command.Service` without the third parameter.
