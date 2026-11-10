// @vitest-environment happy-dom
import { assert, describe, it } from "@effect/vitest"
import { Cause, type Duration, Effect, Layer, Option, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Component, Router, type View } from "effect/ui"
import { BrowserHost, Html } from "effect/ui/html"
import { HtmlQuery, ssr } from "effect/ui/html/testing"
import { Query, Snapshot, TestHost } from "effect/ui/testing"
import { gzipSync } from "node:zlib"
import { makeFake, User, UserNotFound } from "./api.ts"
import {
  App,
  AppRoute,
  DetailPage,
  GetUser,
  layer as appLayer,
  ListPage,
  ListUsers,
  RenameForm,
  UserCard
} from "./app.ts"

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const route = (url: string) => Option.getOrThrow(AppRoute.parse(url))

const make = (url = "/", options?: Parameters<typeof makeFake>[0]) => {
  const api = makeFake(options)
  const history = Router.memoryHistory(url)
  const visibility = Loader.makeSignal(true)
  return {
    api,
    history,
    visibility,
    router: () => Router.make({ routes: AppRoute, history }),
    layer: Layer.mergeAll(TestHost.layer(), Layer.provide(appLayer, api.layer))
  }
}

type Root = TestHost.TestRoot<any, never, any>

const texts = (root: Root, tag: string) => root.all(Query.tag(tag)).map((node) => Query.textOf(node))

/** What a user would see, in one line. */
const screen = (root: Root): string => {
  const parts: Array<string> = []
  const rows = root.all(Query.tag("li")).map((row) => Query.textOf(row.children![0]!))
  if (rows.length > 0) parts.push(`rows ${rows[0]}..${rows[rows.length - 1]}`)
  parts.push(...texts(root, "span"))
  for (const p of texts(root, "p")) if (!p.includes("@") && !p.includes("·")) parts.push(p)
  for (const h2 of texts(root, "h2")) parts.push(`card ${h2}`)
  for (const node of root.all(Query.attr("aria-label", "Like"))) parts.push(Query.textOf(node))
  for (const node of root.all(Query.attr("aria-label", "Name"))) {
    parts.push(`input ${String((node as any).props.value)}`)
  }
  parts.push(...texts(root, "small"))
  return parts.join(" | ")
}

/** Mounts and records the screen at every commit. */
const mount = Effect.fnUntraced(function*<Name extends string, Props, Model, Msg, Events, R, V extends View.Elements>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  options?: { readonly idleTimeToLive?: Duration.Input; readonly describe?: (root: Root) => string }
) {
  // TestHost has no frame recorder: wrap the host's commit.
  const host = (yield* TestHost.TestHost).host as { commit: () => void }
  const frames: Array<string> = []
  const describe = options?.describe ?? screen
  let mounted: Root | undefined
  const commit = host.commit
  host.commit = () => {
    commit()
    if (mounted !== undefined) frames.push(describe(mounted))
  }
  const root = yield* TestHost.mount(component, props, {
    loader: { idleTimeToLive: options?.idleTimeToLive ?? "5 minutes" }
  })
  mounted = root
  frames.push(describe(root))
  return { root, frames, mark: () => frames.length }
})

/** Lets work in flight for one request's latency finish. */
const load = Effect.gen(function*() {
  yield* TestHost.settle
  yield* TestClock.adjust(10)
  yield* TestHost.settle
})

const distinct = (frames: ReadonlyArray<string>) => frames.filter((frame, index) => frame !== frames[index - 1])

const type = (root: Root, name: string, index = 0) =>
  Query.fire(root.all(Query.attr("aria-label", "Name"))[index]!, "input", { value: name, checked: false })
const submit = (root: Root, index = 0) => Query.fire(root.all(Query.tag("form"))[index]!, "submit", {})
const click = (root: Root, label: string) => Query.fire(root.get(Query.text(label, { exact: true })), "click")
const peek = (root: Root, row = 0) => Query.fire(root.all(Query.text("Peek", { exact: true }))[row]!, "click")
const like = (root: Root) => Query.fire(root.get(Query.attr("aria-label", "Like")), "click")
const go = (url: string) => Effect.flatMap(Router.Router, (router) => router.push(route(url)))
const triggers = (root: Root) => root.fetches().map((fetch) => `${fetch.read.replace("users/", "")}:${fetch.trigger}`)
const name = (root: Root, id: string) => {
  const result = root.cache.peek(GetUser, { id })
  return AsyncResult.isSuccess(result) ? result.value.name : result._tag
}
const sleep = (ms: number) => Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))
const print = (title: string, lines: ReadonlyArray<string>) =>
  // eslint-disable-next-line no-console
  console.log(`\n[EFF-3558] ${title}\n${lines.map((line) => `  ${line}`).join("\n")}`)

const SideBySide = Component.make({
  name: "SideBySide",
  model: Schema.Null,
  message: Schema.Never,
  elements: Html,
  init: () => null,
  update: (model) => model,
  view: (_, h) => h.div(h.child(ListPage, { key: "list" }), h.child(DetailPage, { key: "detail", props: { id: "1" } }))
})

const TwoForms = Component.make({
  name: "TwoForms",
  model: Schema.Null,
  message: Schema.Never,
  elements: Html,
  init: () => null,
  update: (model) => model,
  view: (_, h) =>
    h.div(
      h.child(UserCard, { key: "card", props: { id: "1" } }),
      h.child(RenameForm, { key: "a", props: { id: "1" } }),
      h.child(RenameForm, { key: "b", props: { id: "1" } })
    )
})

const bytes = (value: unknown) =>
  new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value)).length

describe("EFF-3558 prototype", { concurrent: false }, () => {
  // -- EFF-3553 ---------------------------------------------------------------

  it.effect("\"refetch on focus mid-edit to prove the edit survives\": the draft survives a visibility refetch", () => {
    const t = make("/users/1")
    return Effect.gen(function*() {
      const { root, frames, mark } = yield* mount(App, { route: route("/users/1") }).pipe(
        Effect.provideService(Loader.Visibility, t.visibility)
      )
      yield* load
      click(root, "Rename")
      yield* load
      type(root, "Ada L")
      yield* TestHost.settle
      const from = mark() - 1

      // Someone else renames the user, the tab is hidden for a while, and comes back.
      t.api.users.set("1", { ...t.api.users.get("1")!, name: "Renamed elsewhere" })
      t.visibility.set(false)
      yield* TestClock.adjust("31 seconds")
      t.visibility.set(true)
      yield* load

      assert.deepStrictEqual(triggers(root), ["GetUser:watch", "GetUser:visibility"])
      assert.deepStrictEqual(distinct(frames.slice(from)), [
        "card User 1 | ♥ 1 | input Ada L",
        "card User 1 | ♥ 1 | input Ada L | Updating…",
        "card Renamed elsewhere | ♥ 1 | input Ada L"
      ])
      // Cancel drops the draft, and the field falls back to the server's value.
      click(root, "Cancel")
      yield* TestHost.settle
      assert.strictEqual(frames[frames.length - 1], "card Renamed elsewhere | ♥ 1 | input Renamed elsewhere")
      print("draft over a visibility refetch", distinct(frames.slice(from)))
    }).pipe(Effect.provide(t.router()), Effect.provide(t.layer))
  })

  it.live("\"Report the SSR state payload size for the list and detail page\"", () => {
    const t = make("/", { live: true, latency: 5 })
    const render = (url: string) =>
      ssr(App, { route: route(url) }).pipe(
        Effect.provide(Router.memory({ routes: AppRoute, url })),
        Effect.provide(Layer.provide(appLayer, t.api.layer))
      )
    const measure = (state: Record<string, unknown>) => {
      const models = Object.entries(state).filter(([key]) => !key.startsWith("~"))
      return {
        models: models.reduce((sum, [key, value]) => sum + bytes(key) + bytes(value), 0),
        loader: bytes(state["~loader"] ?? {})
      }
    }
    return Effect.gen(function*() {
      const list = yield* render("/")
      const detail = yield* render("/users/1")
      yield* sleep(30)
      // Nothing is fetched again on the client.
      assert.deepStrictEqual([list.fetches.client, detail.fetches.client], [[], []])
      assert.deepStrictEqual(list.fetches.server.map((fetch) => fetch.read), ["users/ListUsers"])

      const page = bytes((list.state as any)["~loader"]["users/ListUsers"][0][2])
      const user = bytes((detail.state as any)["~loader"]["users/GetUser"][0][2])
      const listSizes = measure(list.state)
      const detailSizes = measure(detail.state)
      // The page is in the payload three times: the "requested" snapshot, the "shown" snapshot and ~loader.
      assert.strictEqual(list.payload.split("user20@example.com").length - 1, 3)
      assert.strictEqual(detail.payload.split("user1@example.com").length - 1, 2)
      assert.isAbove(listSizes.models, 2 * page)
      assert.isAbove(bytes(list.payload), 3 * page)
      assert.isBelow(bytes(list.payload), 3 * page + 600)
      assert.isBelow(bytes(detail.payload), 2 * user + 400)
      print("SSR state payload (20 users of 8 fields per page)", [
        `list page:   payload ${
          bytes(list.payload)
        } B = Models ${listSizes.models} B + ~loader ${listSizes.loader} B; one copy of the page is ${page} B; html ${
          bytes(list.html)
        } B`,
        `detail page: payload ${
          bytes(detail.payload)
        } B = Models ${detailSizes.models} B + ~loader ${detailSizes.loader} B; one copy of the user is ${user} B; html ${
          bytes(detail.html)
        } B`,
        `list page if Models referenced entries: about ${bytes(list.payload) - 2 * page} B (${
          Math.round(100 * (1 - (bytes(list.payload) - 2 * page) / bytes(list.payload)))
        }% less)`,
        `gzipped: list payload ${gzipSync(list.payload).length} B (html ${
          gzipSync(list.html).length
        } B), detail payload ${gzipSync(detail.payload).length} B`,
        `gzipped, one copy of the page alone: ${
          gzipSync(JSON.stringify((list.state as any)["~loader"]["users/ListUsers"][0][2])).length
        } B`
      ])
    }).pipe(Effect.scoped)
  })

  // -- EFF-3554 ---------------------------------------------------------------

  it("\"Measure the cost of open encoding args on every render\"", () => {
    class SearchUsers extends Loader.Service<SearchUsers>()(
      "bench/SearchUsers",
      {
        args: Schema.Struct({
          query: Schema.String,
          roles: Schema.Array(Schema.String),
          teams: Schema.Array(Schema.String),
          sort: Schema.Struct({ field: Schema.String, descending: Schema.Boolean }),
          page: Schema.Number,
          pageSize: Schema.Number,
          since: Schema.String,
          includeInactive: Schema.Boolean
        }),
        success: Schema.Array(User),
        error: Schema.Never,
        staleTime: "1 minute"
      },
      Effect.succeed(() => Effect.succeed([]))
    ) {}
    const largeArgs = {
      query: "ada lovelace",
      roles: ["Engineer", "Designer", "Support"],
      teams: ["Platform", "Growth", "Billing", "Mobile"],
      sort: { field: "joined", descending: true },
      page: 3,
      pageSize: 20,
      since: "2024-01-01",
      includeInactive: false
    }
    // `open` is no longer callable on its own: `Component.loaded` is what the view's `h.loaded` reads,
    // so each call also builds the per-render object with one lazy getter per snapshot field.
    const Search = Component.make({
      name: "Search",
      model: Schema.Struct({ results: Loader.Snapshot(SearchUsers, "results") }),
      message: Schema.Never,
      elements: Html,
      loaders: { results: () => largeArgs },
      init: ($) => $.empty,
      update: (model) => model,
      subscriptions: (_model, _props, watch) => [watch({
        results: () => {
          throw new Error("unused")
        }
      })],
      view: (_model, h) => h.p(h.loaded.results._tag)
    })
    const user = { ...makeFake().users.get("1")! }
    const props = { id: "1" }
    const smallModel = { user: Snapshot.success(GetUser, "user", { id: "1" }, user) }
    const largeModel = { results: Snapshot.success(SearchUsers, "results", largeArgs, [user]) }
    const small = () => UserCard.loaded(smallModel, props).user
    const large = () => Search.loaded(largeModel, {}).results
    const runs = 100_000
    const time = (f: () => unknown) => {
      for (let i = 0; i < 10_000; i++) f()
      const start = performance.now()
      for (let i = 0; i < runs; i++) f()
      return ((performance.now() - start) / runs) * 1000
    }
    const results = {
      small: time(small),
      large: time(large),
      smallStringify: time(() => JSON.stringify({ id: props.id })),
      largeStringify: time(() => JSON.stringify(largeArgs))
    }
    assert.isTrue(AsyncResult.isSuccess(small()))
    assert.isTrue(AsyncResult.isSuccess(large()))
    // Generous bounds: the point is the order of magnitude.
    assert.isBelow(results.small, 50)
    assert.isBelow(results.large, 200)
    print(`open, ${runs} calls each (microseconds per call)`, [
      `small args { id }:           ${results.small.toFixed(2)} us  (JSON.stringify of the same args: ${
        results.smallStringify.toFixed(2)
      } us)`,
      `large args (8 fields, 2 arrays, 1 struct): ${results.large.toFixed(2)} us  (JSON.stringify: ${
        results.largeStringify.toFixed(2)
      } us)`,
      `a 60 fps frame is 16,667 us: 100 opens of the large args cost ${
        (results.large * 100 / 16667 * 100).toFixed(1)
      }% of one`
    ])
  })

  it.effect("[SURPRISE] \"keep previous page\" works with two bindings without flashing only when the view prefers \"requested\": \"shown\" alone opens as Initial for one frame at every page change", () => {
    const t = make()
    return Effect.gen(function*() {
      const shownOf = (root: Root) => {
        const shown = ListPage.loaded(root.model(), {}).shown
        return `${shown._tag}${shown.waiting ? " waiting" : ""}`
      }
      const { root, frames } = yield* mount(ListPage, {}, {
        describe: (root) => `${screen(root)}   {shown opens as ${shownOf(root)}}`
      })
      yield* load
      t.api.hold("list")
      click(root, "Next")
      yield* load
      t.api.release("list")
      yield* load
      click(root, "Next")
      yield* load
      t.api.release("list")
      yield* load
      // Back to a page that is cached and fresh.
      click(root, "Previous")
      yield* load

      const seen = distinct(frames)
      assert.deepStrictEqual(seen, [
        "Loading users…   {shown opens as Initial waiting}",
        "rows User 1..User 20 | Page 1 of 3   {shown opens as Success}",
        "rows User 1..User 20 | Page 1 of 3 | Loading page 2…   {shown opens as Success}",
        "rows User 21..User 40 | Page 2 of 3   {shown opens as Initial waiting}",
        "rows User 21..User 40 | Page 2 of 3   {shown opens as Success}",
        "rows User 21..User 40 | Page 2 of 3 | Loading page 3…   {shown opens as Success}",
        "rows User 41..User 45 | Page 3 of 3   {shown opens as Initial waiting}",
        "rows User 41..User 45 | Page 3 of 3   {shown opens as Success}",
        "rows User 41..User 45 | Page 3 of 3 | Loading page 2…   {shown opens as Success}",
        "rows User 21..User 40 | Page 2 of 3   {shown opens as Initial waiting}",
        "rows User 21..User 40 | Page 2 of 3   {shown opens as Success}"
      ])
      // What the user sees never goes back to the loading state.
      assert.isFalse(seen.slice(1).some((frame) => frame.startsWith("Loading users…")))
      // Three pages, three fetches: going back to page 2 used the cache.
      assert.deepStrictEqual(triggers(root), ["ListUsers:watch", "ListUsers:watch", "ListUsers:watch"])
      assert.strictEqual(t.api.calls.list, 3)
      print("keep previous page, every committed frame", seen)
    }).pipe(Effect.provide(t.layer))
  })

  // -- EFF-3555 ---------------------------------------------------------------

  it.effect("\"a registered patch reaches watching instances before the flush that renders the issuing update\": the list row and the detail card show the optimistic name in the same first frame", () => {
    const t = make()
    return Effect.gen(function*() {
      const host = (yield* TestHost.TestHost).host
      const { root, frames, mark } = yield* mount(SideBySide, {})
      yield* load
      click(root, "Rename")
      yield* load
      type(root, "Ada")
      yield* TestHost.settle
      t.api.hold("rename")
      const from = mark()
      const commits = host.commits()
      const logged = root.log().length
      submit(root)

      // Synchronously, with no flush in between: the issuing update, then every watcher's update.
      assert.strictEqual(host.commits(), commits)
      assert.deepStrictEqual(
        root.log().slice(logged).map((entry: any) => `${entry.path.split("/").pop()} ${entry.message._tag}`),
        [
          "RenameForm[rename] Save",
          "UserCard[card] UserChanged",
          "RenameForm[rename] UserChanged",
          "ListPage[list] RequestedChanged",
          "ListPage[list] ShownChanged"
        ]
      )
      yield* TestHost.settle
      assert.deepStrictEqual(frames.slice(from), [
        "rows Ada..User 20 | Page 1 of 3 | card Ada | ♥ 1 | input Ada | Updating… | Saving…"
      ])
      t.api.release("rename")
      yield* load
      yield* load
      assert.deepStrictEqual(distinct(frames.slice(from)), [
        "rows Ada..User 20 | Page 1 of 3 | card Ada | ♥ 1 | input Ada | Updating… | Saving…",
        "rows Ada..User 20 | Page 1 of 3 | card Ada | ♥ 1 | input Ada"
      ])
      // The write covered GetUser, so only the list was fetched again.
      assert.deepStrictEqual(triggers(root), ["ListUsers:watch", "GetUser:watch", "ListUsers:invalidation"])
      print("patch before flush", distinct(frames.slice(from)))
    }).pipe(Effect.provide(t.layer))
  })

  it.effect("\"two queued saves of one field\": the second name stays on screen while the first is answered", () => {
    const t = make("/users/1")
    return Effect.gen(function*() {
      const { root, frames, mark } = yield* mount(App, { route: route("/users/1") })
      yield* load
      click(root, "Rename")
      yield* load
      t.api.hold("rename")
      const from = mark()
      type(root, "B")
      submit(root)
      yield* TestHost.settle
      type(root, "C")
      submit(root)
      yield* TestHost.settle
      // The second save waits in the queue: one request has left.
      assert.deepStrictEqual([t.api.calls.rename, root.cache.inspect(GetUser, { id: "1" }).patches], [1, 2])
      t.api.release("rename")
      yield* TestHost.settle
      // The first answer starts the second request. The screen stays on C throughout.
      assert.deepStrictEqual([t.api.calls.rename, t.api.waiting("rename"), name(root, "1")], [2, 1, "C"])
      t.api.release("rename")
      yield* load
      yield* load
      assert.deepStrictEqual(distinct(frames.slice(from)), [
        "card B | ♥ 1 | input B | Updating… | Saving…",
        "card C | ♥ 1 | input C | Updating… | Saving…",
        "card C | ♥ 1 | input C"
      ])
      assert.strictEqual(t.api.users.get("1")!.name, "C")
      assert.strictEqual(root.cache.inspect(GetUser, { id: "1" }).patches, 0)
      // Both results were written, so nothing was fetched again.
      assert.deepStrictEqual(triggers(root), ["GetUser:watch"])
      print("two queued saves", distinct(frames.slice(from)))
    }).pipe(Effect.provide(t.router()), Effect.provide(t.layer))
  })

  it.effect("[SURPRISE] \"save then unmount\": the queued save never reaches the server, the list shows the old name before the saved one, and going back shows three names and a stuck \"Saving…\"", () => {
    const t = make()
    return Effect.gen(function*() {
      const { root, frames, mark } = yield* mount(App, { route: route("/") })
      yield* load
      yield* go("/users/1")
      yield* load
      click(root, "Rename")
      yield* load
      t.api.hold("rename")
      type(root, "B")
      submit(root)
      yield* TestHost.settle
      type(root, "C")
      submit(root)
      yield* TestHost.settle
      assert.strictEqual(frames[frames.length - 1], "card C | ♥ 1 | input C | Updating… | Saving…")

      // Navigate away with one save in flight and one queued.
      const left = mark()
      yield* go("/")
      yield* TestHost.settle
      // Both runs ended with their instance: the patches are gone at once.
      assert.strictEqual(root.cache.inspect(GetUser, { id: "1" }).patches, 0)
      assert.strictEqual(name(root, "1"), "User 1")
      t.api.resume("rename")
      yield* load
      yield* load
      assert.deepStrictEqual(distinct(frames.slice(left)), [
        "Loading users…",
        "rows User 1..User 20 | Page 1 of 3",
        "rows B..User 20 | Page 1 of 3"
      ])
      // The first save reached the server. The second was still queued and is lost, with no message.
      assert.deepStrictEqual([t.api.calls.rename, t.api.users.get("1")!.name], [1, "B"])

      // A later revisit, by the back button.
      const back = mark()
      t.history.go(-1)
      yield* load
      yield* load
      assert.deepStrictEqual(distinct(frames.slice(back)), [
        // The Model saved at the push: the optimistic name of a save that never happened, and its counter.
        "card C | ♥ 1 | input C | Saving…",
        // The cache's entry, last fetched before either save.
        "card User 1 | ♥ 1 | input User 1 | Updating… | Saving…",
        "card B | ♥ 1 | input B | Saving…"
      ])
      // No Command is running: "Saving…" never goes away.
      assert.deepStrictEqual(root.pending(), [])
      print("save then unmount: the list after leaving", distinct(frames.slice(left, back)))
      print("save then unmount: back to the detail page", distinct(frames.slice(back)))
    }).pipe(Effect.provide(t.router()), Effect.provide(t.layer))
  })

  it.effect("\"a count + 1 patch with a focus refetch\", run with a Loader.Visibility edge: no double count", () => {
    const t = make("/users/1")
    return Effect.gen(function*() {
      const { root, frames, mark } = yield* mount(App, { route: route("/users/1") }).pipe(
        Effect.provideService(Loader.Visibility, t.visibility)
      )
      yield* load
      yield* TestClock.adjust("31 seconds")
      yield* TestHost.settle
      assert.strictEqual(root.cache.inspect(GetUser, { id: "1" }).stale, true)
      t.api.hold("like")
      const from = mark()
      like(root)
      yield* TestHost.settle
      // The server has counted the like and not answered. The tab loses and regains focus.
      assert.strictEqual(t.api.users.get("1")!.likes, 2)
      t.visibility.set(false)
      t.visibility.set(true)
      yield* load
      // The edge's fetch waits for the mutation: a fetch now would return 2 and the patch would make it 3.
      assert.deepStrictEqual([t.api.calls.get, root.cache.inspect(GetUser, { id: "1" }).fetching], [1, false])
      t.api.release("like")
      yield* load
      yield* load
      assert.deepStrictEqual(distinct(frames.slice(from)), [
        "card User 1 | ♥ 2 | Updating…",
        "card User 1 | ♥ 2"
      ])
      assert.isFalse(frames.some((frame) => frame.includes("♥ 3")))
      assert.deepStrictEqual(triggers(root), ["GetUser:watch", "GetUser:visibility"])
      assert.deepStrictEqual([t.api.calls.get, t.api.users.get("1")!.likes], [2, 2])
      print("count + 1 with a visibility edge", distinct(frames.slice(from)))
    }).pipe(Effect.provide(t.router()), Effect.provide(t.layer))
  })

  it.effect("[SURPRISE] \"two concurrent renames answered out of order\": ends on the server's name, but shows the older answer for the length of a refetch", () => {
    const t = make()
    return Effect.gen(function*() {
      const { root, frames, mark } = yield* mount(TwoForms, {})
      yield* load
      t.api.hold("rename")
      const from = mark()
      type(root, "B", 0)
      submit(root, 0)
      yield* TestHost.settle
      type(root, "C", 1)
      submit(root, 1)
      yield* TestHost.settle
      // Two forms, two queues: both requests arrived, B then C. The server holds C.
      assert.deepStrictEqual([t.api.waiting("rename"), t.api.users.get("1")!.name], [2, "C"])
      // C is answered first, then B.
      t.api.release("rename", 1)
      yield* TestHost.settle
      assert.strictEqual(name(root, "1"), "C")
      t.api.release("rename", 0)
      yield* TestHost.settle
      // B's answer is written over C's and shown, stale, while the refetch it triggers runs.
      assert.strictEqual(name(root, "1"), "B")
      assert.deepStrictEqual(root.cache.inspect(GetUser, { id: "1" }), {
        exists: true,
        watchers: 3,
        fetching: true,
        stale: true,
        patches: 0
      })
      yield* load
      yield* load
      assert.deepStrictEqual(distinct(frames.slice(from)).map((frame) => frame.replace(/ \| input \w+/g, "")), [
        "card B | ♥ 1 | Updating… | Saving…",
        "card C | ♥ 1 | Updating… | Saving… | Saving…",
        "card C | ♥ 1 | Updating… | Saving…",
        "card B | ♥ 1 | Updating…",
        "card C | ♥ 1"
      ])
      assert.deepStrictEqual(triggers(root), ["GetUser:watch", "GetUser:invalidation"])
      print("two concurrent renames answered out of order", distinct(frames.slice(from)))
    }).pipe(Effect.provide(t.layer))
  })

  // -- EFF-3556 ---------------------------------------------------------------

  it.effect("\"going from route A to route B on a stale shared entry refetches, and a child joining a watched stale entry doesn't\"", () => {
    const t = make()
    return Effect.gen(function*() {
      const { root, frames, mark } = yield* mount(App, { route: route("/") })
      yield* load
      // Route A: the list page, with user 1's card open.
      peek(root)
      yield* load
      yield* TestClock.adjust("31 seconds")
      yield* TestHost.settle
      assert.deepStrictEqual(root.cache.inspect(GetUser, { id: "1" }), {
        exists: true,
        watchers: 1,
        fetching: false,
        stale: true,
        patches: 0
      })
      assert.strictEqual(t.api.calls.get, 1)

      // Route B: the detail page of the same user. One card leaves and another arrives.
      const from = mark()
      yield* go("/users/1")
      yield* load
      assert.strictEqual(t.api.calls.get, 2)
      assert.deepStrictEqual(triggers(root), ["ListUsers:watch", "GetUser:watch", "GetUser:watch"])
      assert.strictEqual(root.cache.inspect(GetUser, { id: "1" }).watchers, 1)

      // A child joins: the rename form, on an entry the card watches and that is stale again.
      yield* TestClock.adjust("31 seconds")
      yield* TestHost.settle
      assert.strictEqual(root.cache.inspect(GetUser, { id: "1" }).stale, true)
      const joined = mark()
      click(root, "Rename")
      yield* load
      assert.deepStrictEqual(root.cache.inspect(GetUser, { id: "1" }), {
        exists: true,
        watchers: 2,
        fetching: false,
        stale: true,
        patches: 0
      })
      assert.strictEqual(t.api.calls.get, 2)
      print("route A -> route B on a stale shared entry", distinct(frames.slice(from, joined)))
      print("a child joining a watched stale entry", distinct(frames.slice(joined)))
    }).pipe(Effect.provide(t.router()), Effect.provide(t.layer))
  })

  it.effect("[SURPRISE] an instance that starts watching an entry the cache already holds commits one frame of \"Loading\" first (TestHost)", () => {
    const t = make()
    return Effect.gen(function*() {
      const { root, frames, mark } = yield* mount(App, { route: route("/") })
      yield* load
      peek(root)
      yield* load
      // Fresh in the cache, and watched by the list's card.
      assert.strictEqual(root.cache.inspect(GetUser, { id: "1" }).stale, false)
      const from = mark()
      yield* go("/users/1")
      yield* load
      click(root, "Rename")
      yield* load
      assert.deepStrictEqual(distinct(frames.slice(from)), [
        "Loading user…",
        "card User 1 | ♥ 1",
        "Loading… | card User 1 | ♥ 1",
        "card User 1 | ♥ 1 | input User 1"
      ])
      const back = mark()
      yield* go("/")
      yield* load
      assert.deepStrictEqual(distinct(frames.slice(back)), ["Loading users…", "rows User 1..User 20 | Page 1 of 3"])
      // Nothing was fetched for any of it.
      assert.deepStrictEqual(triggers(root), ["ListUsers:watch", "GetUser:watch"])
    }).pipe(Effect.provide(t.router()), Effect.provide(t.layer))
  })

  it.live("[SURPRISE] on BrowserHost that \"Loading\" frame outlives the microtask queue, so the browser can paint it", () => {
    const t = make("/", { live: true, latency: 5 })
    return Effect.gen(function*() {
      const app = yield* Effect.acquireRelease(
        Effect.sync(() => document.body.appendChild(document.createElement("div"))),
        (element) => Effect.sync(() => element.remove())
      )
      yield* BrowserHost.mount(DetailPage, { id: "1" }, app)
      yield* sleep(40)
      assert.strictEqual(app.querySelector("h2")!.textContent, "User 1")
      HtmlQuery.click(HtmlQuery.getByRole(app, "button", { name: "Rename" }))
      // Run every microtask, and nothing else.
      const afterMicrotasks = yield* Effect.callback<string>((resume) => {
        let left = 50
        const step = () => left-- > 0 ? queueMicrotask(step) : resume(Effect.succeed(app.textContent ?? ""))
        queueMicrotask(step)
      })
      assert.isTrue(afterMicrotasks.includes("Loading…"))
      assert.strictEqual(app.querySelector("form"), null)
      yield* sleep(20)
      assert.notStrictEqual(app.querySelector("form"), null)
      assert.strictEqual(t.api.calls.get, 1)
    }).pipe(Effect.provide(Layer.provide(appLayer, t.api.layer)), Effect.scoped)
  })

  // -- EFF-3557 ---------------------------------------------------------------

  it.effect("\"Measure the per-push history.state size\"", () => {
    const t = make()
    return Effect.gen(function*() {
      const { root } = yield* mount(App, { route: route("/") })
      yield* load
      yield* go("/users/1")
      yield* load
      click(root, "Rename")
      yield* load
      yield* go("/")
      yield* load
      peek(root)
      yield* load
      yield* go("/users/2")
      yield* load
      const [list, detail, listWithCard] = t.history.states().map(bytes)
      const page = bytes(
        Schema.encodeSync(Schema.toCodecJson(ListUsers[Loader.TypeId].success ?? Schema.Unknown))(
          (root.cache.peek(ListUsers, { page: 0 }) as any).value
        )
      )
      // No ~loader in history.state, but the list page's two bindings store the page twice.
      assert.isAbove(list!, 2 * page)
      assert.isBelow(list!, 2 * page + 400)
      assert.isBelow(detail!, 700)
      assert.strictEqual(JSON.stringify(t.history.states()[0]).split("user20@example.com").length - 1, 2)
      print("history.state per push", [
        `leaving the list page (20 users):           ${list} B, of which the page twice is ${2 * page} B`,
        `leaving the detail page (card + open form): ${detail} B`,
        `leaving the list page with a card open:     ${listWithCard} B`
      ])
    }).pipe(Effect.provide(t.router()), Effect.provide(t.layer))
  })

  for (const outcome of ["succeeding", "failing"] as const) {
    const title = outcome === "succeeding"
      ? "\"back after the entry was collected with the fetch succeeding (data on screen, waiting: false, live fetch)\""
      : "\"and with it failing (data flips to a bare Failure)\""
    it.effect(`cold restore, ${title}`, () => {
      const t = make("/users/1")
      return Effect.gen(function*() {
        const { root, frames, mark } = yield* mount(App, { route: route("/users/1") }, { idleTimeToLive: "1 minute" })
        yield* load
        yield* go("/")
        yield* load
        yield* TestClock.adjust("2 minutes")
        yield* TestHost.settle
        assert.strictEqual(root.cache.inspect(GetUser, { id: "1" }).exists, false)
        if (outcome === "succeeding") t.api.users.set("1", { ...t.api.users.get("1")!, name: "Renamed since" })
        else t.api.users.delete("1")

        const from = mark()
        t.history.go(-1)
        yield* TestHost.settle
        // The first frame: the data saved at the push, not marked as waiting, with the fetch in flight.
        assert.deepStrictEqual(frames.slice(from), ["card User 1 | ♥ 1"])
        assert.deepStrictEqual(root.cache.inspect(GetUser, { id: "1" }), {
          exists: true,
          watchers: 1,
          fetching: true,
          stale: true,
          patches: 0
        })
        assert.strictEqual(root.cache.peek(GetUser, { id: "1" })._tag, "Initial")
        yield* load
        const result = root.cache.peek(GetUser, { id: "1" })
        if (outcome === "succeeding") {
          assert.deepStrictEqual(distinct(frames.slice(from)), ["card User 1 | ♥ 1", "card Renamed since | ♥ 1"])
          assert.strictEqual(result._tag, "Success")
        } else {
          assert.deepStrictEqual(distinct(frames.slice(from)), ["card User 1 | ♥ 1", "This user doesn't exist."])
          assert.isTrue(AsyncResult.isFailure(result))
          if (AsyncResult.isFailure(result)) {
            assert.isTrue(Option.isNone(result.previousSuccess))
            assert.deepStrictEqual(Cause.squash(result.cause), new UserNotFound({ id: "1" }))
          }
        }
        assert.deepStrictEqual(triggers(root), ["GetUser:watch", "ListUsers:watch", "GetUser:watch"])
        print(`cold restore, fetch ${outcome}`, distinct(frames.slice(from)))
      }).pipe(Effect.provide(t.router()), Effect.provide(t.layer))
    })
  }
})
