# Integration API (EFF-3558 prototype): Loaded, TestHost, ssr()

Everything here is what the code does today on branch `agent/jarvis/564861001bcf`. Working examples to copy:
`packages/effect/test/ui/Loaded.test.ts` (TestHost, Router, mutation) and
`packages/effect/test/ui/html/LoadedSsr.test.ts` (`ssr()`).

Run from the repo root:

```sh
nix develop -c pnpm vitest run packages/effect/test/ui/Loaded.test.ts packages/effect/test/ui/html/LoadedSsr.test.ts
nix develop -c pnpm exec tsc --noEmit -p tsconfig.eff3558-ui.json
```

## 1. A component with a read and a mutation

```ts
import { Effect, Layer, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Command, Component, Loaded } from "effect/ui"

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
    invalidates: (id) => [GetUser.entry({ id })],            // or GetUser (whole read), or a Loader.Tag
    optimistic: (id, name) => [GetUser.patch({ id }, (user) => ({ ...user, name }))],
    writes: (user, id) => [GetUser.set({ id }, user)]          // optional: store the result
  }
) {}

const Message = Schema.TaggedUnion({
  UserChanged: { snapshot: Loaded.Snapshot(GetUser, "user") },
  Rename: { name: Schema.String },
  Renamed: {}
})

// One binding per read: declare it once, with the Model and Props types the args need.
const user = Loaded.at(GetUser, "user", (_model: unknown, props: { readonly id: string }) => ({ id: props.id }))
// Returning undefined from the args function disables the read (open gives Initial, not waiting).

const Card = Component.make({
  name: "Card",
  props: Schema.Struct({ id: Schema.String }),
  model: Schema.Struct({ user: Loaded.Snapshot(GetUser, "user"), saving: Schema.Boolean }),
  message: Message,
  init: ($) => $.set({ user: user.empty, saving: false }),
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
  subscriptions: (model, props) => [
    user.watch(model, props, (snapshot) => Message.make({ _tag: "UserChanged", snapshot }))
  ],
  view: (model, h) =>
    h.el(
      "p",
      AsyncResult.match(user.open(model.user, model, h.props), {
        onInitial: (initial) => (initial.waiting ? "loading" : "idle"),
        onSuccess: (success) => success.value.name + (success.waiting ? "…" : ""),
        onFailure: () => "failed"
      })
    ).on("click", Message.make({ _tag: "Rename", name: "Bob" }))
})

// Provide both services to the mount (or with Component.provide).
const layer = Layer.mergeAll(GetUser.layer, RenameUser.layer)
```

For an HTML component (`ssr()`, BrowserHost) add `elements: Html` and use `h.div(...)`, `h.p(...)`.

Rules that bite:

- The Model field, the message field and the binding must use the same (read, label).
- A snapshot can't sit in a `Schema.Array` or record, and two fields can't share one (read, label): `Component.make` throws.
- A dependent read takes its args from another binding's `open`:
  `Loaded.at(GetPosts, "posts", (model, props) => { const u = user.open(model.user, model, props); return AsyncResult.isSuccess(u) ? { author: u.value.id } : undefined })`.
- A live optimistic patch shows as `waiting: true` on the Success.
- A snapshot for a test or Story without a cache: `Snapshot.success(binding, args, value)` / `Snapshot.failure(binding, args, error)` from `effect/ui/testing`.

## 2. TestHost

```ts
import { TestClock } from "effect/testing"
import { Query, TestHost } from "effect/ui/testing"

const visibility = Loader.makeSignal(true)      // SettableSignal: get / set / subscribe
const connectivity = Loader.makeSignal(true)

it.effect("...", () =>
  Effect.gen(function*() {
    const root = yield* TestHost.mount(Card, { id: "1" }, { loader: { idleTimeToLive: "1 second" } }).pipe(
      Effect.provideService(Loader.Visibility, visibility),       // fakes: provide around the mount
      Effect.provideService(Loader.Connectivity, connectivity)
    )
    yield* TestHost.settle                       // runs the scheduler; does not move time
    yield* TestClock.adjust(10)                  // fetcher sleeps, staleTime, idle TTL, intervals
    yield* TestHost.settle

    root.text()                                  // rendered text
    root.fetches()                               // Loader.FetchEvent[]: { read, argsKey, trigger, restart }
    root.cache.inspect(GetUser, { id: "1" })     // { exists, watchers, fetching, stale, patches }
    root.cache.peek(GetUser, { id: "1" })        // the patched AsyncResult
    root.send(Message.make({ _tag: "Rename", name: "Bob" }))
    Query.fire(root.get(Query.text("Ann", { exact: true })), "click")

    visibility.set(false); visibility.set(true)  // a visibility edge: refetches stale watched entries, trigger "visibility"
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
      budget: "500 millis",                      // 0 starts no server fetch
      static: true,                              // optional; round-trips as state["~static"]
      loader: { idleTimeToLive: "1 minute" }     // client mount only
    }).pipe(Effect.provideService(Loader.Visibility, visibility))   // fakes reach both caches

    result.html                                  // server HTML
    result.state                                 // server state; state["~loader"] = { [readKey]: [[argsKey, 0|1, encoded, timestamp], ...] }
    result.payload                               // HtmlServer.serializeState(state): measure .length for bytes
    result.fetches.server                        // FetchEvent[]
    result.fetches.client                        // FetchEvent & { inWindow }[], live: keeps growing after ssr() returns
    result.cache                                 // the client's CacheInternals (inspect, peek, isWindowOpen)
    result.container                             // the hydrated DOM
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
history.go(-1)                                   // a back from outside the app
history.entries()                                // urls
history.states()                                 // NEW: each entry's history.state; JSON.stringify(...).length to measure
```

The snapshot of the page being left is written on push. A second `Router.make` over the same `history`
with a new mount simulates a reload (a cold cache): see the "cold restore" test.

## 5. Not implemented

- `watch` has no Stream: the Subscription's `stream` is `Stream.never` and only the runtime understands the marker.
  `Story` doesn't run watches; send the message with a `Snapshot.success(...)` instead.
- No dev checks beyond the Model check (nothing warns when a binding is watched but its field is never updated,
  or when a snapshot of one binding is stored in another's field of the same read+label).
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
- Nothing is public API yet beyond `Loaded`, `effect/ui/testing` `Snapshot`, and the `loader`/`static` options.
