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
$.run(RenameUser.make(id, name).pipe(Command.match({
  onSuccess: (user) => Renamed(user),
  onFailure: (error) => RenameFailed(error)
})))
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
