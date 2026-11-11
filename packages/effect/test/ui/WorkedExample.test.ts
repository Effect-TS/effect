/**
 * The experiments of the loader spec's worked example (§5.7), run on the app
 * in `fixtures/users.ts`.
 */
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { TestClock } from "effect/testing"
import { Component, Router } from "effect/ui"
import { Html } from "effect/ui/html"
import { Query, TestHost } from "effect/ui/testing"
import * as users from "./fixtures/users.ts"

const setup = (url: string) => {
  const server = users.makeServer()
  const history = Router.memoryHistory(url)
  const deps = Layer.mergeAll(
    users.layer.pipe(Layer.provide(server.layer)),
    Router.make({ routes: users.AppRoute, history })
  )
  return { server, deps }
}

const run = <A, E>(deps: Layer.Layer<any>, effect: Effect.Effect<A, E, any>) =>
  effect.pipe(Effect.provide(deps), Effect.scoped, Effect.provide(TestHost.layer())) as Effect.Effect<A, E>

const mount = Effect.flatMap(Router.route(users.AppRoute), (route) => TestHost.mount(users.App, { route }))

const navigate = Effect.fnUntraced(function*(url: string) {
  const router = yield* Router.Router
  yield* router.navigate(url)
  yield* TestHost.settle
})

type Root = Pick<TestHost.TestRoot<any, any, any>, "get" | "fetches">

const click = (root: Root, text: string) => Query.fire(root.get(Query.text(text, { exact: true })), "click")
const nameInput = (root: Root) => root.get(Query.attr("aria-label", "Name")) as TestHost.TestElement
const rename = (root: Root, name: string) => {
  Query.fire(nameInput(root), "input", { value: name })
  Query.fire(root.get(Query.tag("form")), "submit")
}
/** The card's heading: the user's name as the card shows it. */
const cardName = (root: Root) => Query.textOf(root.get(Query.tag("h2")))
const fetchesOf = (root: Root, read: string) => root.fetches().filter((fetch) => fetch.read === read)
const count = (text: string, part: string) => text.split(part).length - 1

/** The list page and the detail page side by side. */
const Both = Component.make({
  name: "Both",
  model: Schema.Null,
  message: Schema.Never,
  elements: Html,
  init: () => null,
  update: (model) => model,
  view: (_, h) =>
    h.div(
      h.child(users.ListPage, { key: "list" }),
      h.child(users.DetailPage, { key: "detail", props: { id: "1" } })
    )
})

describe("the worked example", () => {
  it.effect("a patch reaches the list row and the detail card in the same first frame as the issuing update", () => {
    const { deps } = setup("/")
    return run(
      deps,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Both, {})
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        click(root, "Rename")
        yield* TestHost.settle
        rename(root, "Bob")
        yield* TestHost.settle
        const frames = root.frames()
        const first = frames.findIndex((frame) => frame.includes("Bob"))
        // The list row and the card heading, and the form already saving.
        assert.strictEqual(count(frames[first], "Bob"), 2)
        assert.include(frames[first], "Saving…")
        assert.isTrue(frames.every((frame) => count(frame, "Bob") === 0 || count(frame, "Bob") === 2))
        yield* TestClock.adjust("100 millis")
        yield* TestHost.settle
        assert.strictEqual(count(root.text(), "Bob"), 2)
      })
    )
  })

  it.effect("two queued saves of one field show B, C, C with no refetch between them", () => {
    const { deps, server } = setup("/users/1")
    return run(
      deps,
      Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        click(root, "Rename")
        yield* TestHost.settle
        const gets = server.calls.get
        rename(root, "B")
        yield* TestHost.settle
        const shown = [cardName(root)]
        rename(root, "C")
        yield* TestHost.settle
        shown.push(cardName(root))
        yield* TestClock.adjust("100 millis")
        shown.push(cardName(root))
        yield* TestClock.adjust("100 millis")
        yield* TestHost.settle
        shown.push(cardName(root))
        assert.deepStrictEqual(shown, ["B", "C", "C", "C"])
        assert.strictEqual(server.calls.rename, 2)
        assert.strictEqual(server.calls.get, gets)
        assert.deepStrictEqual(fetchesOf(root, "users/GetUser").length, 1)
      })
    )
  })

  it.effect("a likes + 1 patch across a Visibility edge never double-counts", () => {
    const { deps, server } = setup("/users/1")
    return run(
      deps,
      Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        // The entry goes stale while it is on screen.
        yield* TestClock.adjust("31 seconds")
        click(root, "♥ 0")
        yield* TestHost.settle
        assert.include(root.text(), "♥ 1")
        // The edge finds the entry stale, and the refetch waits for the run.
        yield* TestHost.setVisible(false)
        yield* TestHost.setVisible(true)
        yield* TestHost.settle
        assert.deepStrictEqual(root.entry(users.GetUser, { id: "1" })?.fetch, "held")
        yield* TestClock.adjust("100 millis")
        yield* TestClock.adjust("10 millis")
        yield* TestHost.settle
        assert.strictEqual(server.users.get("1")?.likes, 1)
        assert.include(root.text(), "♥ 1")
        assert.isFalse(root.frames().some((frame) => frame.includes("♥ 2")))
      })
    )
  })

  it.effect("going from route A to route B on a stale shared entry refetches, and a child joining a watched stale entry doesn't", () => {
    const { deps } = setup("/users/1")
    return run(
      deps,
      Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        yield* navigate("/")
        yield* TestClock.adjust("10 millis")
        yield* TestClock.adjust("31 seconds")
        const before = root.frames().length
        yield* navigate("/users/1")
        // The card's watch is a zero-to-one over a stale entry.
        assert.deepStrictEqual(fetchesOf(root, "users/GetUser").map((fetch) => fetch.trigger), ["watch", "watch"])
        yield* TestClock.adjust("10 millis")
        // No "Loading" frame over a warm entry.
        assert.isFalse(root.frames().slice(before).some((frame) => frame.includes("Loading")))
        yield* TestClock.adjust("31 seconds")
        click(root, "Rename")
        yield* TestHost.settle
        assert.strictEqual(root.entry(users.GetUser, { id: "1" })?.watchers, 2)
        assert.strictEqual(fetchesOf(root, "users/GetUser").length, 2)
      })
    )
  })

  it.effect("rename on the detail page, wait for success, go back: the list never shows the old name", () => {
    const { deps } = setup("/")
    return run(
      deps,
      Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        assert.include(root.text(), "Ann")
        yield* navigate("/users/1")
        yield* TestClock.adjust("10 millis")
        click(root, "Rename")
        yield* TestHost.settle
        rename(root, "Bob")
        yield* TestHost.settle
        yield* TestClock.adjust("100 millis")
        yield* TestHost.settle
        const before = root.frames().length
        yield* navigate("/")
        yield* TestClock.adjust("10 millis")
        yield* TestHost.settle
        const after = root.frames().slice(before)
        assert.isTrue(after.some((frame) => frame.includes("Bob")))
        assert.isFalse(after.some((frame) => frame.includes("Ann")))
        // The invalidated list refetched when it was watched again.
        assert.deepStrictEqual(fetchesOf(root, "users/ListUsers").map((fetch) => fetch.trigger), ["watch", "watch"])
      })
    )
  })

  it.effect("the derived draft survives a visibility refetch", () => {
    const { deps } = setup("/users/1")
    return run(
      deps,
      Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        click(root, "Rename")
        yield* TestHost.settle
        Query.fire(nameInput(root), "input", { value: "Zed" })
        yield* TestHost.settle
        yield* TestClock.adjust("31 seconds")
        yield* TestHost.setVisible(false)
        yield* TestHost.setVisible(true)
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        yield* TestHost.settle
        assert.deepStrictEqual(fetchesOf(root, "users/GetUser").map((fetch) => fetch.trigger), ["watch", "visibility"])
        assert.strictEqual(nameInput(root).props.value, "Zed")
      })
    )
  })

  it.effect("a queued save drains after its form unmounts", () => {
    const { deps, server } = setup("/users/1")
    return run(
      deps,
      Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        yield* TestClock.adjust("10 millis")
        click(root, "Rename")
        yield* TestHost.settle
        rename(root, "B")
        rename(root, "C")
        click(root, "Close")
        yield* TestHost.settle
        assert.isUndefined(root.query(Query.tag("form")))
        assert.strictEqual(root.pending().length, 2)
        yield* TestClock.adjust("100 millis")
        yield* TestClock.adjust("100 millis")
        yield* TestHost.settle
        assert.strictEqual(server.calls.rename, 2)
        assert.strictEqual(server.users.get("1")?.name, "C")
        assert.strictEqual(cardName(root), "C")
        assert.deepStrictEqual(root.pending(), [])
      })
    )
  })
})
