# Findings (append only)

## Loader core (agent: Loader core, files: packages/effect/src/reactivity/Loader.ts, test/reactivity/Loader.test.ts)

1. **EFF-3554 #6 vs EFF-3557 #11: is the first emission synchronous?** #6 says reading the state and subscribing is one synchronous step. #11 says a marker registered on a settled entry "emits through defer". Both can't describe the callback. Did: registration is synchronous (count, fetch decision), the callback is never invoked inside it, and the first emission is deferred one scheduler step. `WatchHandle.current()` gives the sync read. A fetch that settles before that step yields one emission, not two.
2. **EFF-3554 #2 "a fake is a Layer built from a plain function" vs #8 "each fetch is forked in the scope of the Layer build that asked".** If the service value is a bare function there is nowhere to carry the build's Scope. Did: a module-level `WeakMap<fetcher, Build>`; `Read.layer` wraps the function per build and registers a finalizer. A `Layer.succeed(Read, fn)` fake has no build Scope, so its fetches live as long as the cache. The UI runtime must pass the service value (`Context.get(ctx, Read)`) to `watch` so the cache can find the build.
3. **EFF-3554 #1 "a sync peek" on the read.** A static on the read class can't be synchronous without a cache handle. Did: `Read.peek(args)` is a (synchronous) Effect requiring `Loader.Cache`; the truly sync form is `internals(cache).peek(read, args)`.
4. **EFF-3554 #3 args key.** "Schema-encoded args" doesn't say which encoding. Did: `Schema.toCodecJson(args)` then a canonical string (sorted object keys, `undefined` properties dropped, leaves by the `encodeDep` rule). With the JSON codec the `NaN`/`Infinity`/`-0` distinction is mostly moot, because the codec decides how those encode before the leaf rule sees them. "Unsound encodings are rejected at definition" has no test I could write cheaply; nothing is rejected.
5. **EFF-3557 #1/#16: the args key is not reversible, so a hydrated entry has no args.** The wire carries only `argsKey`. An entry decoded at registration can't be fetched, passed to a function-form `refetchInterval`, or to `patchAll((value, args) => ...)` until some caller addresses it with real args. Did: args are filled in lazily on first access by args; `patchAll` skips entries whose args are still unknown. Either the key format must be parseable or the wire must carry encoded args.
6. **EFF-3556 #10 "an unwatched entry always holds a Success".** A Failure with `previousSuccess` is not covered: #10 only drops Failures with none. Did: a Failure with `previousSuccess` stays when the last watcher leaves, and an unwatched refetch failing over a Success stores one too. So the invariant implemented is "an unwatched entry never holds a bare Failure".
7. **EFF-3555 #15 "an entry this run wrote isn't also refetched by its own invalidation" for a write stored stale.** Read literally, a write stored stale on a watched entry is never refetched (stale + excluded + nothing happening). Did: only writes stored fresh are excluded from the run's own invalidation; a stale-stored write is invalidated normally if targeted.
8. **EFF-3555 #15: a write while a fetch is in flight is unspecified.** A fetch that began before the mutation landed would overwrite the written value with older data and mark it fresh. Did: storing a write restarts the fetch in flight (same rule as invalidation). Not in the resolution.
9. **EFF-3555 #17 "get on a held stale entry fetches for the caller and stores nothing".** A held patch only exists while a confirming fetch is in flight or another patch is live. In the first case joining the confirming fetch would dedupe; as written it is a second request. Did as written. For a LIVE patch (undecided, EFF-3556 handed on) did the same: fetch for the caller, store nothing, no trigger event. A `get` that was already waiting when a patch interrupts its fetch keeps waiting until the last live owner exits.
10. **EFF-3555 #10: a held patch on an unwatched entry disappears at once.** With no watcher there is no confirming fetch, so "neither a live patch nor a fetch in flight" is true the moment the run succeeds, and `peek` snaps back to the old server value (stale) unless the Command also has `writes`. Follows the text; worth knowing for the save-then-unmount case.
11. **EFF-3556 #33 "a restarted fetch keeps its trigger".** An invalidation that lands on a watch-triggered fetch in flight never shows up as `invalidation` on the hook. Did as written and added `restart: true` to the event so a test can tell.
12. **EFF-3555 #6: invalidating a fetch in flight that has no watcher** (a prefetch). "Restarted under a watcher's Layer build" has no watcher to use. Did: restart under the build that owned the fetch (never the mutation's).
13. **EFF-3556 #26 "a reverted fetch doesn't count as a settle".** After an interval fetch reverts (defect, interrupt) the timer is not re-armed, so polling stops until the next settle, write, host edge or patch exit. Probably wants "re-arm from the revert".
14. **EFF-3557 #22 static hydration and Failures.** With `static` there is no window, so nothing drops an unwatched hydrated bare Failure; it sits until idle GC. Minor breach of #10.
15. **EFF-3555 #12/#11: implied invalidation of an unregistered patch.** A patch over an entry with no Success isn't registered. Did: its target is still invalidated at exit (the declaration names it), which is a no-op for a cold entry.
16. **Duration checks.** `Duration.isNegative` catches negatives and `"-Infinity"` at definition as EFF-3556 says. No surprise here.
17. **Things that worked as written:** the four mutation cases (count + 1 with a visibility edge, two queued saves, concurrent renames out of order, failed and stopped runs) fell out of "patches in issue order, live then held, one deferral check at the last live exit" with no extra rules. Settled-at from `Clock` plus `TestClock` works; idle timers and intervals as `Effect.sleep` fibers work under `TestClock`.

## Command and runtime (agent: Command/runtime, files: src/ui/Command.ts, ui/internal/runtime.ts, ui/internal/services.ts, ui/Router.ts, ui/MessageLog.ts, ui/testing/Story.ts, ui/html/testing/Ssr.ts, test/ui, typetest/ui)

### F-C1. The BRIEF's "known failure" in Command.test.ts / Runtime.test.ts is a working-directory problem, not a codegen one

`"./ui/internal/runtime" is not exported` only appears when vitest runs from `packages/effect`. The root config has the path aliases for internal modules. From the repo root everything loads, with no `package.json` exports change and no `pnpm codegen`:

```
nix develop -c pnpm vitest run --project effect packages/effect/test/ui
```

Baseline before any edit: 13 files, 177 tests green. After this work: 14 files, 196 tests green.

### F-C2. Issue site for the typed error channel: the resolution's sketch breaks on optional arguments. Chose `Command.match`

**Candidate A, the resolution's sketch**: handlers as a trailing argument of `make`.

```ts
$.run(RenameUser.make(id, name, { onSuccess: (user) => Renamed(user), onFailure: (e) => RenameFailed(e) }))
// typed as: make<M1, M2>(...args: [...Args, Handlers<A, E, M1, M2>])
```

Tried in a scratch file (deleted). It works for fixed positional args and for rest args. It breaks here:

- **Optional positional args.** With `Args = [id: string, name?: string]`, `Opt.make("1", { onSuccess, onFailure })` is `TS2554 Expected 3 arguments, but got 2` and the handler parameters fall to implicit `any`. The caller has to write `Opt.make("1", undefined, {...})`.
- A handlers object is ambiguous with a body whose own last argument is an options object.
- `args` is recorded on the Command (log, Story matching, concurrency `key`, and later the cache's `invalidates(...args)`), so the handlers would have to be stripped back off at runtime.
- It gives two shapes of `make`: bodies that cannot fail still use `make(...args)` + `Command.map`.

**Candidate B, chosen**: `make` is unchanged, the result is not yet a Command, and `Command.match` finishes it.

```ts
$.run(
  RenameUser.make(id, name).pipe(Command.match({
    onSuccess: (user) => Renamed(user),
    onFailure: (error) => RenameFailed(error)
  }))
)
```

- When the body's error type is not `never`, `make` returns `Command.Unmatched<A, E, R, K>`, which is not a `Command`. `$.run` and `Command.map` reject it at the type level, so forgetting the failure is a compile error (typetests cover this).
- When it is `never`, `make` returns a Command directly and `Command.map` works as before. One rule: `match` when the body can fail, `map` when it cannot.
- Composes with modes, Stream Commands (maps each element and the failure), optional and rest args, and `map` after `match`. `args` stays pure.
- Runtime backstop: a typed failure on a Command with no `reject` (only reachable with a cast) fails the instance with source `"command"`.

Cost: one more pipe at every failing issue site, and a second noun (`Unmatched`) in the public surface.

### F-C3. The runtime needs the un-mapped work, so an issued Command now carries two views of it

To tell a failed run from a successful one (step 3, and hook (b)), the runtime has to run the body's own effect and look at its `Exit`. Once `onFailure` is folded in, every run succeeds. So `Issued` has:

- `effect` / `stream`: public, typed `Effect<Msg, never, R>`, with `map`/`match` applied. Tests and Stories run these.
- `work`: `@internal`, the body's raw `Effect<unknown, unknown, R>` / `Stream`. The runtime runs this, then applies `resolve` or `reject`.

`Unmatched.effect` keeps the typed failure (`Effect<A, E, R>`), which is handy for testing a body directly.

### F-C4. A required options object with callbacks broke `Args` inference for bodies with optional parameters

Written as `options: Service.Options<Args, A>`, the callbacks are an inference site for `Args`. A body `(id: string, name?: string) => ...` with `invalidates: (id) => [...]` inferred `Args = [id: string]`, silently dropping `name` from `make`. With `optimistic: (id, name) => ...` it was a hard error. `NoInfer` made it worse (the callbacks then failed against the optional tuple). Fix that worked: make the options their own type parameter, `O extends Service.Options<Args, A>`, so they are checked against `Args` but never infer it. Typetest: `Rename.make("1")` and `Rename.make("1", "Ada")` both callable.

The Loader's own declaration helpers will meet the same thing if they take callbacks over a read's args.

### F-C5. `writes` is Effect-only

`writes: (success, ...args) => Write[]` has no meaning for a Stream Command (which element?). The Stream overload types it `writes?: undefined`. If a Stream mutation should write per element, that is a new decision.

### F-C6. A `void` result makes a wrong fake type-check

`SaveTodo`'s body now returns `Effect<void, KeyValueStoreError>` instead of messages. `Layer.succeed(SaveTodo, () => Effect.succeed(someMessage))` is accepted, because anything is assignable to a `void` return. Before, the message type caught a wrong fake. Minor, but mutations returning `void` will be common once the issue site owns the messages.

### F-C7. With no server Commands, prerender waits only for Layers, and the routed fixture renders "Loading"

Removing `{ server: true }` took the Command branch out of the idle check. `checkIdle` is now `scheduled || dirty || deferred || building`. Until the cache adds "no fetch in flight", SSR of any page that used a server Command for its data renders its `init` state (the routed fixture's bio is `Loading` on the server and loads after adoption). Three html tests were rewritten to say so, one (a server Command that dies) was deleted, and the budget test lost its pending-Command half. That is the gap reads are meant to fill, and the HtmlServer tests are where to prove it.

The `prerender` budget-0 `start` flag is now read by nothing but Layers. Left a `TODO(loader)`.

### F-C8. History restore now reruns every init Command

Router back/forward adopts the saved Model and used to skip server Commands. Now every `init` Command runs again on restore (resolution as written). `Router.test.ts` asserts no `CommandDropped` and the visit counter going 1 → 2. Consequence to check with reads: a restored page that loads in `init` flashes nothing only if the read is served from cache.

### F-C9. Hook semantics that the paper design left open

- **A throwing `onIssue`**: the run is never added and never starts, later Commands of the same `update` are not issued, and the instance fails with source `"update"` (or `"init"`). Neither `onExit` nor `onCancel` fires for it, since nothing was registered.
- **Switch**: `onIssue` for the new run is called before the old run is asked to stop, so the order is `issue new`, then `exit old (interrupt)`. The cache sees both in flight for a moment.
- **(b) vs (c) is decided by whether the fiber took its first step**, not by whether it was forked. A run stopped in the same `update` that issued it, one stopped while queued, and one waiting for a provided Layer all get `onCancel` and never `onExit`.
- **Drop** records `CommandDropped` and calls nothing.
- **Unmount**: running runs get `onExit` with an interrupt, after the instance is already closed. Queued ones get `onCancel`. The hook must not assume the instance is alive.
- **A Stream Command's `onExit` success value is `void`**; elements are not reported to the hooks.
- A throwing `onExit`/`onCancel` fails the instance with source `"command"` (a no-op if it is already closed).
- Hooks fire for every Command, `Command.make` ones included (their `invalidates` is empty). The cache has to skip those cheaply.

### F-C10. Story needed `fail`

With messages mapped at the issue site, `story.resolve(SaveTodo, value)` takes the body's success (here `undefined`). There was no way to drive the failure branch, so `Story.Steps.fail(target, error)` was added; it applies the Command's `reject`. `story.pending[i].command.invalidates / optimistic / writes` read the declared data with no cache.

### F-C11. Not mine, but seen

- `pnpm jsdocs --check` fails only on `reactivity/Loader.ts` (`@category` order, missing description).
- `pnpm lint-fix` formats the whole repo, so it may have reformatted the Loader files.

## Loaded, runtime integration, SSR (agent: integration, files: src/ui/Loaded.ts, ui/testing/Snapshot.ts, ui/internal/runtime.ts, ui/Component.ts, ui/Router.ts, ui/Renderer.ts, ui/html/*, test/ui/Loaded.test.ts, test/ui/html/LoadedSsr.test.ts)

### F-I1. Patch-before-flush is TRUE with the natural implementation

Observed order on a click in instance `a` that issues a Command with an optimistic patch, with `b` watching the same entry:

```
update a Rename        <- issuing update; issue() calls cache.beginRun(patches) inside it
update a Bob           <- a's own watcher, synchronously inside beginRun
update b Bob           <- b's watcher, same call, before a's update has returned to the scheduler
--- flush (microtask) ---
view a Bob… saving
view b Bob…
```

It holds because watch messages don't come from a forked fiber: the marker registers a callback in the cache and the callback calls `inst.dispatch`. No extra cost. The price is reentrancy: `b`'s `update` runs inside `a`'s `update` call stack (and `a` gets its own watch message before its issuing update's Model is rendered). The test asserts the order synchronously, before any settle.

A live patch shows as `waiting: true`, so the view needs to treat Success+waiting as "saving", or the row flickers a spinner.

### F-I2. The synchronous watcher drop needed a pre-pass in the patcher

`patchList`/`patchOrReplace` create the new subtree before destroying the old. Releasing in the instance's close path alone made a keyed swap A->B on one entry a join (2 watchers, then 1): no refetch of a stale entry. Fix: before creating anything, walk the rendered nodes this patch will remove and unregister their watchers (`releaseRendered`). Verified by removing it: the swap test fails with `['watch']` instead of `['watch','watch']`. Cost: one extra walk of removed subtrees per patch, and an instance can be alive for a moment with no watcher (it is about to be destroyed, and a watch callback is guarded by `released`).

### F-I3. A read with `error: Schema.Never` was not an `AnyDefinition` (changed Loader.ts)

`Loader.Target` rejected `class ListUsers ... error: Schema.Never` as a whole-read target: `any` isn't assignable to `never` in the parameter positions of `ReadInternal` (`refetchInterval`, `encodeError`). Changed `ReadInternal` in `reactivity/Loader.ts`: `refetchInterval` is typed loosely and the four codec functions are methods (bivariant). Loader tests still pass. The real API needs a deliberate variance design.

### F-I4. The value ships twice in SSR state

The server Model holds the snapshot (it has to: the HTML is rendered from it and the client adopts the Model), and `~loader` holds the entry. One small record: payload 2x. The test asserts the duplication. Options for the design: ship the Model's snapshot as a reference (`[argsKey]` only) and resolve it from `~loader` at decode, or drop `~loader` entries that a snapshot covers. Same duplication in `history.state`, where there is no `~loader` so it is only once.

### F-I5. Server: the idle check needed more than "no fetch in flight"

The cache defers a watcher's first emission by one scheduler step. With two instances on one key, the second registers on an already settled entry, no fetch is in flight, and the render would finish before its message arrived. The runtime counts "watch registered on a settled entry, emission not yet seen" and holds idle on it too. That is state the cache should own (`isFetching` -> something like `isQuiet`).

### F-I6. `subscriptions()` on the server

Called only when the component's Model schema has a snapshot field (AST walk, cached per schema), and not under a frozen/opted-out Layer. Ordinary Subscriptions in the returned list are ignored on the server. So `subscriptions` must be safe to call on the server for those components (it is a pure function already).

### F-I7. The window check in `ssr()` only applies to shipped entries

An entry that missed the budget is cold on the client and fetches by "watch" while the window is open. That is correct per EFF-3557 #19 ("on a hydrated entry"), so `ssr()` checks only keys present in `~loader`.

### F-I8. Cold restore, as it falls out

After a reload, back to a page whose Model was in `history.state`: the first frame shows the stored Success (old data) NOT marked waiting, one fetch starts ("watch", zero-to-one on a cold entry), and the new value replaces it. There is no signal to the view that the data is of unknown age. Per-push `history.state` for a page with one small record: under 400 characters.

### F-I9. Testing input (for EFF-3559)

- Fakes: provided with `Effect.provideService(Loader.Visibility, Loader.makeSignal(true))` around `TestHost.mount` / `ssr()`. Worked without any new option, because the runtime builds the cache from the mount Context.
- Observation: a new internal `services.CacheObserver` reference, called once per `runtime.start` with the cache. TestHost and `ssr()` use it to attach `onFetch` before the first render. `TestRoot.fetches()`, `TestRoot.cache`, `Ssr.fetches`, `Ssr.payload`, `Ssr.cache`.
- `Router.memoryHistory().states()` added to read `history.state`.
- TestHost.settle doesn't know about fetches in flight that are waiting on the Clock, which is right, but every test ends up writing a "settle, adjust, settle" helper.

### F-I10. Smaller things

- The BRIEF's "./ui/internal/runtime is not exported" failure did not reproduce from the repo root (see F-C1).
- The placeholder `Target`/`Patch`/`Write` in Command.ts are now `Loader.Target`/`Loader.Patch`/`Loader.SetTarget`; the fixtures and the typetest got real reads (`GetTodo`, `GetUser`).
- `Component.Provided` now excludes `Loader.Cache | Visibility | Connectivity` from what a Layer can satisfy (`Component.RuntimeService`). No typetest was added for it.
- The watch Subscription's key is `~loaded/<label>:<argsKey>`, so two bindings in one component need different labels even across reads.
- `pnpm codegen` (packages/effect) changed `reactivity/index.ts` `@since` of Loader from 4.0.0 to 4.1.3; kept.
- A throwing `writes` function still settles the run (patches held, targets invalidated), then fails the instance.
- Not run: `pnpm check`, `pnpm lint` repo-wide, `pnpm jsdocs --check`, tstyche (`pnpm test-types`). Ran: the two eff3558 tsc projects, oxlint and dprint on touched files, vitest on `test/ui` and the Loader test.

## Prototype app and experiments (agent: prototype app, files: test/ui/prototype-eff3558/app.ts, api.ts, prototype.test.ts; report: notes/PROTOTYPE-REPORT.md)

Nothing under `src` was changed. Every finding below is asserted by a test in `prototype.test.ts`; the ones marked SURPRISE have it in the test name.

### F-P1. SURPRISE: a new instance over a warm entry commits one frame of Initial, and a browser can paint it (EFF-3554 #6, EFF-3557 #11, Loader finding 1)

The first emission is deferred one scheduler step, so an instance mounted over an entry the cache holds renders `init`'s Initial(waiting) first: "Loading user…" then the card, with no fetch. It happens on every push navigation to a cached page and for every child that joins a watched entry. On BrowserHost the flush is a microtask and the cache's defer is `Effect.yieldNow` on the default scheduler (`setTimeout(0)` in a browser), so the "Loading" DOM outlives the microtask queue. The test drains 50 microtasks after the click and the form is still not there. History restore isn't affected. Did nothing about it; the fix belongs in the runtime (apply `WatchHandle.current()` before the first render) or in which scheduler the cache defers on.

### F-P2. SURPRISE: "keep previous page" with two bindings flashes unless the view prefers "requested" (EFF-3554 #12, ticket)

When the requested page settles, `update` moves `shownPage` forward and the "shown" snapshot is still the old key, so `shown.open` is Initial for one commit until its watch delivers. The brand stops copying the snapshot across (correct). The app's view reads "requested" when it is a Success and "shown" otherwise, and with that no frame goes back to loading. A view built on "shown" alone flashes at every page change. The pattern costs 2 fields, 2 variants, 2 branches, 2 watches, a second page number and promotion logic, and the page is stored twice in the Model.

### F-P3. SURPRISE: save, then navigate away (EFF-3555, F-C9 "Unmount")

Runs end with their instance. With one save in flight and one queued: the request in flight is interrupted (the fake had applied it), the queued save never reaches the server (`rename` called once), and no message reports it. The patches come off at once, so the list shows the old name and then the saved one. Going back restores a Model that holds the optimistic name of the lost save and `saving: 2`; the cache's stale entry then replaces it with the name from before either save, then the refetch brings the saved one. "Saving…" never clears because no Command is running. Frames in the report. EFF-3557 #25 predicted the optimistic value in the snapshot; it didn't predict the value regressing through the stale entry or the stuck flag.

### F-P4. SURPRISE: two concurrent renames answered out of order show the older answer for one round trip (EFF-3555 #15, Loader findings 7 and 8)

The server applied B then C and answered C then B. B's result is written over C, stored stale, shown, and the refetch it triggers brings C back. The cache had already classified the write as out of date. Final state is right.

### F-P5. In-flight state held in a Model is restored by history without its Commands (EFF-3557 #25, F-C8)

The usual `saving` flag or counter is written into `history.state` at a push and adopted on back. Pre-existing runtime behaviour, but an optimistic save form is where every app will meet it. A boolean `saving` is also wrong with a `queue` Command (first answer clears it), so the app uses a counter, and the counter is what gets stuck.

### F-P6. A live patch and a background refetch are the same `waiting: true` (F-I1)

During a save the card shows its refetch indicator next to the form's "Saving…". The view can't tell the two apart from the snapshot.

### F-P7. The derived-draft pattern doesn't say what happens to the draft on a failed save (EFF-3553 #6)

"Cleared on save" at issue loses the user's text when the save fails, because the patch has rolled back by then. The app carries the attempted name in its `SaveFailed` message and restores the draft from it.

### F-P8. Numbers

- SSR `state`: list page 9,115 B (Models 6,082 + `~loader` 2,998; one copy of the 20-user page is 2,943 B; HTML 2,121 B). The page ships three times because of the two bindings. Detail page 549 B (user 140 B, twice). Gzipped 695 B and 271 B, with repetitive seed data.
- `history.state` per push: 6,106 B leaving the list, 631 B leaving the detail page.
- `open`: 0.9 us for `{ id }`, 7.1 us for 8-field args, about 12 times `JSON.stringify` of the same args. Not a problem.

### F-P9. Things that held as written

Patch before flush (five updates, zero commits, then one frame with the row, the card and "Saving…"); two queued saves (B, C, C with no refetch); `count + 1` across a `Loader.Visibility` edge (the edge's fetch waits for the run, no frame shows a double count); route A to route B on a stale shared entry refetches and a child joining doesn't; the draft over a visibility refetch; both cold restores exactly as EFF-3557 #24 describes.

### F-P10. Smaller things

- `invalidates` is required and was redundant in `RenameUser`: `patchAll` already implies the read and `writes` covers the entry.
- A mutation whose result the component ignores still needs a message variant and a no-op branch.
- The binding needs the Model type and the props type written out, so the Model schema has to be hoisted into a const and the props type duplicated by hand.
- TestHost has no frame recorder; the tests wrap `host.commit`. Input for EFF-3559.
- Not covered by the app: `Component.provide` for read Layers, `refetchInterval`, `Connectivity`, `static`, the page in the URL.

## Loaders in Component.make (DECISIONS.md addendum), implemented

What happened when the addendum's type sketch became the real `Component.make`. Tests: `typetest/ui/Loaders.tst.ts`, `test/ui/Loaded.test.ts`, `test/ui/html/LoadedSsr.test.ts`, the prototype app.

### F-L1. A dependent read can't be written with `(model, props) => args` (addendum #1, #4)

The snapshot is opaque and `h.loaded` is only on the view's `h`, so a loader whose args come from another read's result (EFF-3554's dependent read, used by the SSR test) has nothing to read the first result with. Added a third argument: `loaders.posts: (model, props, loaded) => ...`, where `loaded` is the same object as `h.loaded`. It is lazy per field, each loader runs once per (model, props), and a loader that reaches its own field throws. Types infer with no annotation. Needs a decision: keep the third argument, or give loaders something else.

### F-L2. `update` has no way to open the snapshot it just received (addendum #4)

"Neither takes the Model or props" holds for the view, but two existing `update`s opened the incoming snapshot (the list page's "copy the page number once the requested page is a Success", and a test's log line). `h.loaded` doesn't exist in `update`, and a `$.loaded` would describe the Model before the message. Added `$.loadedOf(model)` on `update`'s `$`: what `h.loaded` would be for that Model and the current props, used as `$.loadedOf({ ...model, requested: snapshot }).requested`. The name and shape are mine. `previous` (decision 3) removes the list page's use, but "do X when this read first succeeds" will come back.

### F-L3. The sketch's `SnapshotKeys` breaks every component whose Model isn't a struct

`{ [K in keyof Model]: ... }[keyof Model]` is a homomorphic mapped type, so for a Model of `number`, `string` or an array it maps to the Model itself and the result is not `never`. Every such component then required `loaders` (over 30 type errors across the existing tests). `Component.SnapshotFields` is now a distributive conditional over `keyof Model & string`, guarded by `[Model] extends [object]`. The sketch only ever saw struct Models.

### F-L4. The make-input hole is closed, and it was not a `Schema.declare` limit (addendum, Open 1)

The prototype cast the schema to `Schema.Codec<Snapshot, unknown>`, and a bare `Codec` has an `unknown` make input. Returning `Schema.declare<Loader.Snapshot<Read, Label>>` (as `Loader.SnapshotSchema<Read, Label>`) is enough: `Message.make({ _tag: "PageChanged", snapshot: userSnapshot })` is now an error, for another read and for another label. Type test: "a message constructor rejects a snapshot of another read or label". One oddity: writing that wrong call under `@ts-expect-error` still printed the Effect language-service diagnostic "This Effect requires a service that is missing: GetUser" at that line, because a read class is an Effect-like service and the plugin compares the two snapshot brands as Effects. The test uses tstyche's `not.toBeCallableWith`, as the other ui type tests do.

### F-L5. Label equals field name: checked at module load, and the label is now pure repetition (addendum, Open 2)

`Component.make` throws when a top-level snapshot field's label isn't its field name. With that rule the "two fields with one (read, label)" check can only fire together with a label mismatch, and the label carries no information the field name doesn't. It still has to be written three times per read (Model field, message field, and the field name itself), and the message's label is only checked by the type of `snapshot` flowing through `make`. A testing snapshot now takes it too: `Snapshot.success(read, label, args, value)`.

### F-L6. A nested snapshot is now a module-load error, not just unbindable (addendum, "What becomes a type rule")

The addendum says a snapshot nested in a union or array "has no loader key, so it can't be bound". At type level that makes it silently inert: `SnapshotFields` skips it, so nothing requires a loader, and it would hold an empty snapshot forever. `Component.make` therefore throws for a snapshot anywhere but directly in a field of the Model struct, including `Schema.optional`, `Schema.NullOr` and a nested struct. `Schema.suspend` still isn't followed, and a Model that is a union of structs is not handled: the type takes the keys common to all members, the runtime sees a Union and calls every snapshot nested.

### F-L7. `h.loaded` and vocabularies (addendum, Open 3)

`Html` has no `loaded` element, and neither do the test vocabularies. Vocabulary tags sit on the helper's prototype and `loaded` is set as an own property, so in a custom vocabulary with a `loaded` element the loader results would win at runtime while the type becomes an intersection of the two. To keep that from touching components that don't load anything, `h.loaded` exists (type and value) only when the Model has snapshot fields. `$.empty` is always there, as `{}`. Nothing reserves the name.

### F-L8. `watch` returns one Subscription, the runtime still sees one per field (addendum #3)

`watch({...})` returns one branded Subscription. `Component.make`'s wrapper replaces it with the per-field marker Subscriptions the runtime already understood (key `~loaded/<field>:<argsKey>`), so the runtime's registration, re-key, pre-pass and server sampling are untouched, and MessageLog and `Story.subscriptions` still show one key per field with its args key. The cost: the branded object is not what reaches the runtime, so "starts with the watch" is checked by the wrapper (it throws inside `subscriptions()` when no watch is returned, which the runtime reports as that instance's subscription failure). A second `watch(...)` in the same array is ignored.

### F-L9. A handler that can't be sensible still has to be written

Every snapshot field needs a handler, so a field needs its own message variant even when two fields could share an update branch, and a component that only wants to test `h.loaded` must still write `subscriptions` and a handler (the open benchmark's component has `watch({ results: () => { throw ... } })`).

### F-L10. `open` now costs an object per render

`h.loaded` is built per view call and per `subscriptions` call: one object, one getter per snapshot field, one Map. Measured through `Component.loaded(model, props).field`: 2.2 us for `{ id }` (was 0.9 for the bare `open`), 8.2 us for the 8-field args (was 7.1). The view and `subscriptions` each compute a field's args once per call, but not once per flush between them, as before.

### F-L11. Not done by this change, and failing because of the concurrent cache changes

When this change was finished 10 tests failed (2 in `Loaded.test.ts`, 8 in `prototype.test.ts`), down to 7 a few minutes later as the other work landed, and `tsc -p tsconfig.eff3558-ui.json` went from 4 errors in `prototype.test.ts` to none. All of them assert the old cache behaviour that the concurrent `Loader.ts` work changes on purpose: `waiting: true` under a live patch (decision 7), `cache.inspect` gaining `patched`, and the out-of-order write rule (decision 9). They were left as they are rather than rewritten against a moving cache. The app's "Updating…" indicator depends on the patched flag reaching the view, which is not built: `previous` and the patched flag are not on `h`. The runtime's first emission is still deferred (decision 2 is not implemented here).

## Loader core after the resolution (agent: Loader core round 2, files: packages/effect/src/reactivity/Loader.ts, test/reactivity/Loader.test.ts)

Implemented the core half of resolution decisions 2, 6, 7, 8, 9, 10, 11, 12. API in LOADER-API.md, "Changes after the resolution". 28 Loader tests pass.

### F-L2-1. Resolution #9: "skipped" doesn't say what happens to the entry, and "reached" isn't defined

- A fetch in flight on the entry may have started before the server applied the skipped run. Skipping silently would let it land as fresh data. A stored write restarts such a fetch (resolution #13); a skipped one has to do something equivalent. Did: a skipped write invalidates the entry in the run's batch (stale, restart, refetch if watched). So the older answer is never stored or shown, and the entry still ends on the server's value.
- "Reached" had to include more than a stored write. In the prototype app's case (F-P4, both renames carry a patch) the later run's write is NOT stored either: it is blocked by the earlier run's live patch. Only its invalidation touches the entry. Did: a successful run reaches an entry when it stores a write on it, has a write blocked on it, or invalidates it at `finish`. A failed run never counts.
- Consequence worth knowing: with two concurrent renames that both patch and both write, neither write is stored. The screen is right (held patches, then one refetch), but `writes` saves no request there.
- Plain invalidation has no issue order, so "a save racing a plain invalidation" stores stale as asked. An invalidation by a later _run_ skips the write. The decision's wording covers both readings; this is the one that fixes F-P4.

### F-L2-2. Resolution #7: the public API can't see `patched`

`Read.changes` and `Read.peek` return an AsyncResult, so plain Effect code now sees a patched value as an ordinary settled Success with `waiting: false`. Before it at least saw `waiting: true`. Did: left it, and `changes` drops elements that differ only in `patched`. If non-UI callers matter, `changes` needs a second shape or the spec should say the bit is UI-only.

### F-L2-3. Resolution #2: the callback type can't carry the state the runtime now has to fold

`onChange` takes `Success | Failure`. `handle.current()` returns the full AsyncResult, including `Initial` and `Initial waiting` over a cold entry. The runtime folds `current()` through `update`, so the spec has to say whether a cold registration sends a message for Initial or sends nothing. The cache can't decide it. Also: the state at registration already includes the fetch that registration started (`waiting: true`), and that is the value "last" starts from.

`emitInitial` defaults to `true` (old deferred emission) only to keep the runtime alive during the rewire. Two code paths for one release of a throwaway; delete the default path once the runtime passes `false`.

### F-L2-4. Resolution #8: what "cold" means for `seed`

Did: cold = no stored result. That makes these calls, none of which the decision spells out:

- A watched entry holding a bare Failure is not cold, so restore over a failed entry shows the Failure, not the snapshot.
- A cold entry with a fetch in flight is seeded, and its watchers get the seed with `waiting: true`.
- Raw hydrated entries count as warm (the read is registered first).
- `seed` starts no fetch. It relies on the watch that follows being a zero-to-one transition. If the entry is already watched and idle (fetch-free window, `noFetch`), the seed sits there stale until something else fetches.
- Refused on a `settleOnce` cache, where a settled entry never refetches.
- `timestamp` only sets the AsyncResult's timestamp. Staleness comes from the stale mark, not from the age.

### F-L2-5. Resolution #10 makes the EFF-3569 case the normal one

After a rename with nobody watching, the entry is patched and stale until someone watches it. Every `Read.get` on it in that time takes the "fetch for the caller, store nothing" path, so N gets are N requests and none of them confirms the patch. Before #10 the patch was gone at once and the first `get` stored its result. EFF-3569 should treat "get on a held, unwatched entry" as a fetch that settles the entry.

Also: the patch only goes when a fetch _settles_. Did: an interrupted fetch (owning build closed) leaves it; a failed one drops it and stores Failure with `previousSuccess`, so the old server value comes back as `previousSuccess`. With `idleTimeToLive: "Infinity"` and no later watcher the patch stays for the life of the cache.

### F-L2-6. Resolution #11: "throws on a non-JSON leaf" is nearly unreachable, and is not a definition-time check

`Schema.toCodecJson` already turns `NaN`, `Infinity`, `bigint` and `Date` into strings (`Schema.Number` encodes `NaN` as `"NaN"`), so those are sound keys and nothing throws. The throw only fires for a Schema with no JSON encoding of its own (`Schema.Any`, `Schema.Unknown`, a declaration). And it fires per call with the offending value, not when the read is defined, so it is not the "unsound encodings are rejected at definition" check the resolution says it doubles as. A read with `args: Schema.Any` is accepted and works until someone passes a `bigint`.

Two more things the canonical key showed:

- The JSON codec encodes an explicit `{ skip: undefined }` on an optional field as `null`, so it is a different key, and a different cache entry, from leaving the field out. Pinned in the test as a finding. Either the key drops `null` for optional fields or the docs say "omit, don't pass undefined".
- A hydrated entry keeps the args it recovered from its key. The fetcher and `refetchInterval` get that object, not the one the first caller passed. Equal by value, different identity.

### F-L2-7. Resolution #12: "re-arms" from when?

Counting from the last settle (how the timer is normally scheduled) is already in the past, so it would refetch at once, and a fetcher that keeps dying would loop with no delay. Did: a full interval from the revert. It applies to any fetch that ends with nothing stored once the timer has fired, not only to fetches whose trigger was `interval` (a visibility-edge fetch that picked up a due interval is the same case). While hidden or offline the due time is left for the edge pass.

An interrupt-revert with a watcher still registered only happens when the fetch's build closes and no other live build watches the entry. The re-armed timer then has no build to fetch under until another instance joins.

### F-L2-8. Resolution #6: nothing in `beginRun`/`finish` assumed a live instance

They hold no instance or build. Added: `finish`, `applyWrites` and `applyInvalidation` do nothing after the cache is disposed (a run owned by a Layer build could in principle finish after the root is gone; before this a restart there forked a fetch on a dead cache). One thing the runtime must know: a refetch caused by `finish` runs under a watcher's build. The mutation's own build is never used, so a run finishing with nobody watching leaves the entry stale and fetches nothing.

### F-L2-9. What the core changes break outside my area (not fixed, not mine)

After these changes `test/ui` has 7 failing tests (253 pass), all asserting behaviour the resolution changed:

- `Loaded.test.ts`: "an optimistic patch reaches a second watching instance..." and "a failed mutation takes its patch back..." expect the "…" that `waiting` used to give under a patch (#7).
- `prototype.test.ts`: "a registered patch reaches watching instances...", "two queued saves of one field", "a count + 1 patch with a focus refetch" (#7); "save then unmount" (#7, #10); "two concurrent renames answered out of order" expects the older answer `B` on screen and now gets `C` (#9, the SURPRISE it recorded is gone).

Both `tsconfig.eff3558-ui.json` and `tsconfig.eff3558-loader.json` type check clean. Not run: `pnpm lint-fix` and `pnpm check` (repo-wide, and the checkout is shared). Ran `oxlint` and `dprint check` on the two Loader files only.

## Runtime after the resolution, round 2 (agent: runtime + app, files: src/ui/internal/runtime.ts, ui/internal/loaders.ts, ui/Command.ts, ui/Component.ts, reactivity/internal/loaderSnapshot.ts, test/ui/Loaded.test.ts, test/ui/html/LoadedSsr.test.ts, test/ui/prototype-eff3558/*)

Decisions 2, 3, 6, 7 and 8 are now wired into the runtime and the app. Decisions 9 to 12 needed nothing in the runtime: the core already had them, and the app exercises 9 and 10.

### F-R1. Decision 6 collides with Commands that use their Scope for instance-lifetime resources

A detached run's body still gets the issuing instance's `Scope`, not a scope under the Layer build. `Router.Block` is a `Command.Service`, and it adds its block-release finalizer to that Scope so the block ends when the instance unmounts. With a per-run scope under the build, `Router.test.ts` "blocks Commands and reverts" failed: the block outlived the page. So today "owned by the build" means the fiber is, and the Scope is not. Needs a decision: either the Scope stays the instance's (and the docs say so), or `Router.Block` stops being an Effect-shaped `Command.Service`.

### F-R2. A `Command.Service` fake built with `Layer.succeed` has no build

`Service.layer` registers the build. A fake given with `Layer.succeed(RenameUser, fn)` has none, so its runs are owned by the mounted root: they survive their instance and end when the root closes. This matches decision 13 for read fakes. It means a test with a fake can't see "the build closed" behaviour.

### F-R3. SURPRISE: a run outlives the mount when its Layer is provided outside the mount

`Loaded.test.ts` "[SURPRISE] resolution #6: a run outlives the mount itself...". The usual shape is `mount(App).pipe(Effect.provide(AppLayer))`, so the build is outside the root. Closing the mount's Scope leaves the save running, and it writes to the server after the root is gone. That is decision 6 read literally. In a test it means a run from one `Effect.scoped` mount is still alive in the next one under the same layer. Needs a decision: is the root a second owner (a run ends when the build OR the root closes)?

### F-R4. SURPRISE: with decision 6, an in-flight flag in the Model can never be cleared after a history restore

`Loaded.test.ts` "[SURPRISE] resolution #6 with history restore...". Before, the flag stuck because the run was interrupted. Now the run finishes, the result message is dropped, and a restored Model that says `saving: true` has nothing left to clear it. The prototype app has no `saving` field any more. Its form shows "Saving…" from `h.patched.user`. That has three costs:

- `patched` is about the entry, so every form on that user shows "Saving…" for anyone's save (see the out-of-order frames: two forms, two "Saving…").
- Without `writes`, the patch is held through the confirming refetch, so "Saving…" stays for one round trip after the save was answered.
- A mutation with no `optimistic` has no such signal at all. For those the Model flag is still the only way, and it is still wrong across a restore.

Also untested: a save that fails after its form unmounted. By the code, the message is dropped and nobody is told.

### F-R5. `update` can't read `previous` or `patched`

`$.loadedOf(model)` exists. I added no `$.previousOf` or `$.patchedOf`. The app didn't need them. An `update` that wants "only react to a confirmed value" can't ask.

### F-R6. `h.previous.<field>` is an `Option` of the Success value, not an `AsyncResult`

Decision 3 says "returns the stored Success". I return `Option<value>`: `None` when the keys match, the loader is disabled or the snapshot is empty. If the snapshot under the old key is a Failure with a `previousSuccess`, that value is returned (not tested). The view then needs `AsyncResult.isSuccess(current) ? Option.some(current.value) : h.previous.users`, which is one line but has to be written. The timestamp of the previous value is not available.

### F-R7. A snapshot taken under a patch is dropped from the restored Model, not just kept out of the cache

Decision 8 only says it never seeds. If the restored Model kept it and the cache is cold, the first frame would show an optimistic value that may never have been saved, with `waiting: false`, until the fetch lands. So `seedRestored` replaces it with the empty snapshot. On a cold cache the first frame is then "loading" (`Loaded.test.ts` "resolution #8: a snapshot taken under a patch seeds nothing"). On a warm cache the entry's value is folded before the render and nothing is lost. Needs a decision. The patched bit is a trailing `1` in the snapshot's encoding: 2 bytes, only when set.

### F-R8. An adopting instance runs its view twice

`LoadedSsr.test.ts` "resolution #2: an adopting instance...": the client order is `view`, `update User`, `view`. The emission carries the value the server's Model already has, `update` returns a new object, and the instance renders again in the same flush. Correct and wasteful. The runtime could skip the dispatch when the handle's snapshot equals the Model's.

### F-R9. `pending()` lists runs of instances that no longer exist

An orphan run is reported under the path its instance had (`/App/DetailPage[user-1]/RenameForm[rename]`). `TestHost.settle` waits for them. Nothing marks the entry as orphaned. For EFF-3559: a `detached: true` field would make a settle timeout readable.

### F-R10. Two invalidations, one fetch event

Two queued saves that both invalidate one read: the second invalidation landed while the first one's refetch was in flight, and `root.fetches()` shows one `invalidation` event. I did not check whether the fetch was restarted or joined.

### F-R11. `h.loaded`, `h.previous` and `h.patched` cost four small objects per render

They share one state per `(model, props)` and prototypes built once per component, so a render that reads none of them still allocates. `open` measured 1.5 to 2.7 us for `{ id }` and 7.5 to 11.9 us for the large args over two runs on a loaded machine.

### F-R12. Smaller things

- `TestRoot` can only `send` to the root. To make a child issue two different Commands I had to make its click handler depend on what it shows.
- The first-emission fold runs after the whole watch-sync loop, so a component with two snapshot fields gets both folded before its first render, in field order.
- "An instance whose own Layer is still building still commits Initial" is implemented (a watch registered late folds at once) and has no test.
- `Command.interrupt` of a detached run whose instance is gone has no test. Stream Commands and `Command.make` ending with the instance rely on the existing Runtime tests and on the `detached` condition.
- `pnpm lint-fix` reformats the notes copied into `test/ui/prototype-eff3558/notes/`.
