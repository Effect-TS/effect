# Integration API (EFF-3558 prototype): loaders in Component.make, TestHost, ssr()

Everything here is what the code does today on branch `agent/jarvis/564861001bcf`. Working examples to copy:
`packages/effect/test/ui/Loaded.test.ts` (TestHost, Router, mutation) and
`packages/effect/test/ui/html/LoadedSsr.test.ts` (`ssr()`).

Run from the repo root:

```sh
nix develop -c pnpm vitest run packages/effect/test/ui/Loaded.test.ts packages/effect/test/ui/html/LoadedSsr.test.ts
nix develop -c pnpm exec tsc --noEmit -p tsconfig.eff3558-ui.json
```

## 1. A component with a read and a mutation

Loaders are declared in `Component.make` (DECISIONS.md addendum). There is no `effect/ui/Loaded` module and no
module-level binding any more.

```ts
import { Effect, Layer, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Command, Component } from "effect/ui"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })

// The read. `staleTime` is required. `error: Schema.Never` is fine.
class GetUser extends Loader.Service<GetUser>()(
  "users/GetUser",
  { args: Schema.Struct({ id: Schema.String }), success: User, error: Schema.String, staleTime: "1 minute" },
  Effect.succeed(({ id }) => Effect.succeed({ id, name: "Ann" }))
) {}

// The mutation. `optimistic` and `writes` are optional, `invalidates` is required.
class RenameUser extends Command.Service<RenameUser>()(
  "users/RenameUser",
  Effect.succeed((id: string, name: string) => Effect.succeed({ id, name })),
  {
    invalidates: (id) => [GetUser.entry({ id })], // or GetUser (whole read), or a Loader.Tag
    optimistic: (id, name) => [GetUser.patch({ id }, (user) => ({ ...user, name }))],
    writes: (user, id) => [GetUser.set({ id }, user)] // optional: store the result
  }
) {}

const Message = Schema.TaggedUnion({
  UserChanged: { snapshot: Loader.Snapshot(GetUser, "user") }, // same (read, label) as the Model field
  Rename: { name: Schema.String },
  Renamed: {}
})

const Card = Component.make({
  name: "Card",
  props: Schema.Struct({ id: Schema.String }),
  // The label is the field's name: Component.make throws at module load if it isn't.
  model: Schema.Struct({ user: Loader.Snapshot(GetUser, "user"), saving: Schema.Boolean }),
  message: Message,
  // One args function per snapshot field. Returning undefined disables the read.
  loaders: {
    user: (_model, props) => ({ id: props.id })
  },
  init: ($) => $.set({ ...$.empty, saving: false }), // $.empty: an empty snapshot per snapshot field
  update: (model, message, $) =>
    Message.match(message, {
      UserChanged: ({ snapshot }) => ({ ...model, user: snapshot }),
      Rename: ({ name }) =>
        $.set({ ...model, saving: true }).run(
          RenameUser.make($.props.id, name).pipe(Command.match({
            onSuccess: () => Message.make({ _tag: "Renamed" }),
            onFailure: () => Message.make({ _tag: "Renamed" })
          }))
        ),
      Renamed: () => ({ ...model, saving: false })
    }),
  // Required, and must start with the watch: one handler per snapshot field.
  subscriptions: (_model, _props, watch) => [
    watch({ user: (snapshot) => Message.make({ _tag: "UserChanged", snapshot }) })
  ],
  view: (_model, h) =>
    h.el(
      "p",
      AsyncResult.match(h.loaded.user, { // an AsyncResult, strict open
        onInitial: (initial) => (initial.waiting ? "loading" : "idle"),
        onSuccess: (success) => success.value.name + (success.waiting ? "…" : ""),
        onFailure: () => "failed"
      })
    ).on("click", Message.make({ _tag: "Rename", name: "Bob" }))
})

// Component.Requirements<typeof Card> is GetUser | RenameUser. Provide both to the mount (or with Component.provide).
const layer = Layer.mergeAll(GetUser.layer, RenameUser.layer)
```

For an HTML component (`ssr()`, BrowserHost) add `elements: Html` and use `h.div(...)`, `h.p(...)`.

Signatures (`effect/ui/Component`, all new):

```ts
type SnapshotFields<Model>          // the keys whose value is a Loader.Snapshot directly
type Empty<Model>                   // { [K in SnapshotFields<Model>]: Model[K] }                 -> $.empty
type Loaded<Model>                  // { [K in SnapshotFields<Model>]: AsyncResult<Success, Error> } -> h.loaded
type Loaders<Model, Props>          // { [K]: (model, props, loaded: Loaded<Model>) => Args | undefined }
type Watch<Model, Msg>              // (handlers: { [K]: (snapshot: Model[K]) => Msg }) => Watches<Model, Msg>
interface Watches<Model, Msg> extends Subscription<Msg, LoaderServices<Model>>   // branded
type LoaderServices<Model>          // the read services, added to the component's requirements

// Component.make options, when SnapshotFields<Model> is not never (otherwise unchanged):
loaders: Loaders<Model, Props>
subscriptions: (model, props, watch: Watch<Model, Msg>) => readonly [Watches<Model, Msg>, ...Subscription[]]
init: ($: Init & { empty: Empty<Model> }) => ...
update: (model, msg, $: Update & { loadedOf(model: Model): Loaded<Model> }) => ...
view: (model, h: Helper & Tags & { loaded: Loaded<Model> }) => ...

// On the component value, for tests:
Card.loaded(model, props)           // what the view reads as h.loaded
```

`effect/reactivity/Loader`: `Loader.Snapshot(read, label)` returns `Loader.SnapshotSchema<Read, Label>`
(a `Schema.declare<Loader.Snapshot<Read, Label>>`, so its make input is the branded snapshot), and the type
`Loader.Snapshot<Read, Label>`. The code is in `src/reactivity/internal/loaderSnapshot.ts`.

Three things here are NOT in the addendum and were added because real code needed them (see FINDINGS.md, "Loaders in Component.make"):

- `loaders` functions get a third argument, `loaded`, for a read whose args depend on another read's result:
  `posts: (_model, props, loaded) => AsyncResult.isSuccess(loaded.user) ? { author: loaded.user.value.id } : undefined`.
  A loader reading its own field through `loaded` throws.
- `$.loadedOf(model)` in `update`: what `h.loaded` would be for that Model and the current props. Use it to read the
  snapshot a watch's message just brought: `$.loadedOf({ ...model, user: snapshot }).user`.
- `Component.loaded(model, props)` on the component value.

Rules that bite:

- Types: a snapshot field with no loader, no `subscriptions`, a `subscriptions` that doesn't start with `watch(...)`,
  a missing handler, and args that aren't the read's are compile errors. `Message.make({ _tag, snapshot })` rejects a
  snapshot of another read or label.
- Module load (`Component.make` throws, in every build): a snapshot inside an array or record; two fields with one
  (read, label); a snapshot nested in a union, a nested struct or an optional field; a label that isn't the field's
  name; and, for untyped callers, a missing loader or `subscriptions`. At the first `subscriptions()` call: no watch,
  or a watch with a handler missing.
- `h.loaded` only exists when the Model has snapshot fields. It is an own property of `h`, so it would hide a
  vocabulary element named `loaded`. `Html` has none.
- A live optimistic patch: see the cache notes for `waiting` and the patched flag (changing on this branch).
  `previous` and the patched flag are not on `h` yet.
- A snapshot for a test or Story without a cache: `Snapshot.success(read, label, args, value, options?)` /
  `Snapshot.failure(read, label, args, error, options?)` from `effect/ui/testing`.

## 2. TestHost

```ts
import { TestClock } from "effect/testing"
import { Query, TestHost } from "effect/ui/testing"

const visibility = Loader.makeSignal(true) // SettableSignal: get / set / subscribe
const connectivity = Loader.makeSignal(true)

it.effect("...", () =>
  Effect.gen(function*() {
    const root = yield* TestHost.mount(Card, { id: "1" }, { loader: { idleTimeToLive: "1 second" } }).pipe(
      Effect.provideService(Loader.Visibility, visibility), // fakes: provide around the mount
      Effect.provideService(Loader.Connectivity, connectivity)
    )
    yield* TestHost.settle // runs the scheduler; does not move time
    yield* TestClock.adjust(10) // fetcher sleeps, staleTime, idle TTL, intervals
    yield* TestHost.settle

    root.text() // rendered text
    root.fetches() // Loader.FetchEvent[]: { read, argsKey, trigger, restart }
    root.cache.inspect(GetUser, { id: "1" }) // { exists, watchers, fetching, stale, patches }
    root.cache.peek(GetUser, { id: "1" }) // the patched AsyncResult
    root.send(Message.make({ _tag: "Rename", name: "Bob" }))
    Query.fire(root.get(Query.text("Ann", { exact: true })), "click")

    visibility.set(false)
    visibility.set(true) // a visibility edge: refetches stale watched entries, trigger "visibility"
  }).pipe(Effect.provide(Layer.mergeAll(TestHost.layer(), layer))))
```

Triggers: `"watch" | "get" | "prefetch" | "visibility" | "connectivity" | "interval" | "invalidation"`.
The cache reads the Clock, the two signals and the scheduler from the mount's Context once, at mount.

## 3. ssr() and hydration

```ts
// @vitest-environment happy-dom
import { ssr } from "effect/ui/html/testing"

it.live("...", () =>
  Effect.gen(function*() {
    const result = yield* ssr(Page, props, {
      budget: "500 millis", // 0 starts no server fetch
      static: true, // optional; round-trips as state["~static"]
      loader: { idleTimeToLive: "1 minute" } // client mount only
    }).pipe(Effect.provideService(Loader.Visibility, visibility)) // fakes reach both caches

    result.html // server HTML
    result.state // server state; state["~loader"] = { [readKey]: [[argsKey, 0|1, encoded, timestamp], ...] }
    result.payload // HtmlServer.serializeState(state): measure .length for bytes
    result.fetches.server // FetchEvent[]
    result.fetches.client // FetchEvent & { inWindow }[], live: keeps growing after ssr() returns
    result.cache // the client's CacheInternals (inspect, peek, isWindowOpen)
    result.container // the hydrated DOM
  }).pipe(Effect.provide(layer), Effect.scoped))
```

- Use `it.live` with real short sleeps in fetchers; the budget uses the Clock.
- `ssr()` already waits for `root.adopted`, so the fetch-free window is closed when it returns.
- `ssr()` fails with `SsrError` if a watch/get/prefetch fetched a shipped entry inside the window.
- The client adopts `JSON.parse(payload)`, so anything that doesn't survive JSON shows up.
- Server only: `HtmlServer.renderToHtml(App, props, { budget, static })`.

## 4. Router push/back and history.state

```ts
const history = Router.memoryHistory("/")
const routerLayer = Router.make({ routes: AppRoute, history })
// in the app: Router.push(AppRoute, route), Router.Back.make(), Router.subscription(AppRoute, toMsg)
history.go(-1) // a back from outside the app
history.entries() // urls
history.states() // NEW: each entry's history.state; JSON.stringify(...).length to measure
```

The snapshot of the page being left is written on push. A second `Router.make` over the same `history`
with a new mount simulates a reload (a cold cache): see the "cold restore" test.

## 5. Not implemented

- `watch` has no Stream: the Subscription's `stream` is `Stream.never` and only the runtime understands the marker.
  `Story` doesn't run watches; send the message with a `Snapshot.success(...)` instead.
  `story.subscriptions` lists one key per snapshot field, `~loaded/<field>:<argsKey>`: `Component.make` expands the one
  Subscription `watch` returns into per-field ones before the runtime or a Story sees it.
- No dev checks beyond the Model check (nothing warns when a field is watched but `update` never stores the snapshot).
  `Schema.suspend` isn't followed by the Model check.
- No TestHost option for the fakes; they are provided as services around `mount`.
- `ssr()` doesn't check that every shipped entry decodes.
- History (EFF-3557 #26) is the cheap version: a try/catch around the write (falls back to no snapshot) and a
  console warning over 100,000 characters. No trimming, no per-read opt-out.
- The cold restore is as it falls out: old data from the snapshot, not marked waiting, then one fetch.
- `BrowserHost.layer`'s visibility/online signals and `RootHandle.navigated` (Router closes the window) are
  wired but have no test.
- The server ships a value twice: in the Model's snapshot and in `~loader`.
- `Loader.get`/`prefetch`/`invalidate` from inside a Command work through the re-added `Loader.Cache`, untested here.
- Nothing is public API yet beyond `Component.make`'s `loaders`, `Loader.Snapshot`, `effect/ui/testing` `Snapshot`,
  and the `loader`/`static` options.
