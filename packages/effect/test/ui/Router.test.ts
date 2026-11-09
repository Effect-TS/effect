import { assert, describe, it } from "@effect/vitest"
import { Effect, type Layer, Option, type Scope, Stream } from "effect"
import { TestClock } from "effect/testing"
import { type MessageLog, Router } from "effect/ui"
import { Query, TestHost } from "effect/ui/testing"
import { App, AppRoute } from "./fixtures/router.ts"

const click = (root: TestHost.TestRoot<any, any, any>, text: string) =>
  Query.fire(root.get(Query.text(text, { exact: true })), "click")

const setup = (url = "/") => {
  const history = Router.memoryHistory(url)
  const settled: Array<Router.Settled> = []
  const layer = Router.make({ routes: AppRoute, history, onSettled: (done) => settled.push(done) })
  return { history, settled, layer }
}

const run = <A, E>(
  layer: Layer.Layer<Router.Services>,
  effect: Effect.Effect<A, E, Router.Services | TestHost.TestHost | Scope.Scope>
) => effect.pipe(Effect.provide(layer), Effect.provide(TestHost.layer()))

const mountAt = (url: string) => TestHost.mount(App, { route: Option.getOrThrow(AppRoute.parse(url)) })

describe("Router", () => {
  it.effect("navigates by Command, back and forward, and the head follows the route", () => {
    const { history, layer, settled } = setup()
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* mountAt("/")
        yield* TestHost.settle
        assert.strictEqual(root.head().title, "Home · App")
        assert.strictEqual(root.head().html.lang, "en")
        assert.deepStrictEqual(root.head().meta.map((meta) => meta.content), ["The home page"])

        click(root, "Person 1")
        yield* TestHost.settle
        assert.deepStrictEqual(history.entries(), ["/", "/people/1"])
        assert.strictEqual(root.head().title, "Person 1 · App")
        assert.deepStrictEqual(root.head().meta.map((meta) => meta.content), ["About Person 1"])
        assert.deepStrictEqual(root.model()?.outcomes, ["navigated"])
        // Settling waits for provided Layers, not Commands: the loading title is the one announced.
        assert.deepStrictEqual(settled.map((done) => [done.location.action, done.location.url, done.head.title]), [
          ["push", "/people/1", "Loading · App"]
        ])

        click(root, "Back")
        yield* TestHost.settle
        assert.strictEqual(root.model()?.route._tag, "Home")
        assert.strictEqual(root.head().title, "Home · App")
        history.go(1)
        yield* TestHost.settle
        assert.strictEqual(root.head().title, "Person 1 · App")
        assert.deepStrictEqual(settled.map((done) => done.location.action), ["push", "pop", "pop"])

        // Route changes arrive as Subscription messages, so they're in the log.
        const changes = root.log().filter((entry): entry is MessageLog.Update =>
          entry._tag === "Update" && entry.source._tag === "Subscription"
        )
        assert.deepStrictEqual(changes.map((entry) => AppRoute.print((entry.message as any).route)), [
          "/",
          "/people/1",
          "/",
          "/people/1"
        ])
      })
    )
  })

  it.effect("restores a page's Model on back and forward, without running its Commands", () => {
    const { history, layer } = setup("/people/1")
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* mountAt("/people/1")
        yield* TestHost.settle
        click(root, "count 0")
        yield* TestHost.settle
        click(root, "count 1")
        yield* TestHost.settle
        assert.isTrue(root.text().includes("count 2"))

        click(root, "Home")
        yield* TestHost.settle
        history.go(-1)
        yield* TestHost.settle
        assert.isTrue(root.text().includes("Person 1count 2"))
        const path = "/App/Person[/people/1]"
        const mounted = root.log().filter((entry): entry is MessageLog.Mounted =>
          entry._tag === "Mounted" && entry.path === path
        )
        assert.deepStrictEqual(mounted.map((entry) => entry.adopted), [false, true])
        const dropped = root.log().filter((entry): entry is MessageLog.CommandDropped =>
          entry._tag === "CommandDropped" && entry.path === path
        )
        assert.deepStrictEqual(dropped.map((entry) => [entry.name, entry.reason]), [["LoadPerson", "adopted"]])

        // A page reached by a push starts fresh.
        click(root, "Person 2")
        yield* TestHost.settle
        click(root, "Person 1")
        yield* TestHost.settle
        assert.isTrue(root.text().includes("Person 1count 0"))
      })
    )
  })

  it.effect("blocks Commands and reverts back and forward while a block is held", () => {
    const { history, layer, settled } = setup()
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* mountAt("/")
        yield* TestHost.settle
        click(root, "Person 1")
        yield* TestHost.settle
        click(root, "Block")
        yield* TestHost.settle

        click(root, "Person 2")
        click(root, "Back")
        yield* TestHost.settle
        assert.deepStrictEqual(root.model()?.outcomes, ["navigated", "blocked", "blocked"])

        // The back button can't be blocked: the Router moves forward again, and announces nothing.
        history.go(-1)
        yield* TestHost.settle
        assert.strictEqual(history.index(), 1)
        assert.strictEqual(root.model()?.route._tag, "Person")
        assert.strictEqual(settled.length, 1)

        click(root, "Unblock")
        yield* TestHost.settle
        click(root, "Back")
        yield* TestHost.settle
        assert.strictEqual(root.model()?.route._tag, "Home")
        assert.strictEqual(settled.length, 2)
      })
    )
  })

  it.effect("settles a navigation once the new page's Layer is built", () => {
    const { layer, settled } = setup()
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* mountAt("/")
        yield* TestHost.settle
        click(root, "Slow")
        yield* TestHost.settle
        assert.isTrue(root.text().includes("Slow"))
        assert.strictEqual(settled.length, 0)
        yield* TestClock.adjust("1 second")
        yield* TestHost.settle
        assert.deepStrictEqual(settled.map((done) => done.head.title), ["Slow · App"])
      })
    )
  })

  it.effect("canonicalises redirects and trailing slashes, and loads what the routes don't parse", () => {
    const { history, layer, settled } = setup("/old/2/")
    return run(
      layer,
      Effect.gen(function*() {
        const router = yield* Router.Router
        assert.deepStrictEqual(history.entries(), ["/people/2"])
        assert.strictEqual(router.location().action, "initial")
        const root = yield* mountAt(router.location().url)
        yield* TestHost.settle
        assert.strictEqual(settled.length, 0)

        assert.strictEqual(yield* router.navigate("/old/1"), "navigated")
        yield* TestHost.settle
        assert.deepStrictEqual(history.entries(), ["/people/2", "/people/1"])
        assert.strictEqual(settled.length, 1)

        // The current URL, and a hash within it, aren't route changes.
        yield* router.navigate("/people/1")
        yield* router.navigate("/people/1#bio")
        yield* TestHost.settle
        assert.deepStrictEqual(history.entries(), ["/people/2", "/people/1", "/people/1#bio"])
        assert.strictEqual(settled.length, 1)
        assert.strictEqual(root.model()?.route._tag, "Person")

        // A query that doesn't decode is the catch-all route, not a page load.
        assert.strictEqual(yield* router.navigate("/people/1?%"), "navigated")
        yield* TestHost.settle
        assert.strictEqual(root.model()?.route._tag, "NotFound")
        assert.deepStrictEqual(history.loaded(), [])
      })
    )
  })

  it.effect("starts changes with the current location", () => {
    const { layer } = setup("/people/3")
    return Effect.gen(function*() {
      const router = yield* Router.Router
      const first = yield* Stream.runHead(router.changes)
      assert.strictEqual(Option.getOrThrow(first).url, "/people/3")
    }).pipe(Effect.provide(layer))
  })

  it.effect("Router.static is fixed at its URL", () =>
    Effect.gen(function*() {
      const router = yield* Router.Router
      assert.strictEqual(router.location().route._tag, "Person")
      assert.strictEqual(yield* router.push(AppRoute.make({ _tag: "Home" })), "blocked")
    }).pipe(Effect.provide(Router.static({ routes: AppRoute, url: "/old/4" }))))
})
