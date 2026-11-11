import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, type Layer, Option, Schema, type Scope, Stream } from "effect"
import { TestClock } from "effect/testing"
import { Component, Head, type MessageLog, Route, Router } from "effect/ui"
import { Query, TestHost } from "effect/ui/testing"
import { App, AppRoute, GetPerson, personFetches, PersonSnapshot } from "./fixtures/router.ts"

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

const mount = Effect.flatMap(Router.current(AppRoute), (route) => TestHost.mount(App, { route }))

describe("Router", () => {
  it.effect("reads the current route from memory and static Routers", () =>
    Effect.gen(function*() {
      const current = Router.current(AppRoute)
      const router = yield* Router.Router
      assert.strictEqual((yield* current)._tag, "Home")
      yield* router.navigate("/people/2")
      assert.deepStrictEqual(yield* current, AppRoute.make({ _tag: "Person", params: { id: 2 } }))
      const subset = Route.union({ Person: Route.make("/people/:id", { params: { id: Schema.Number } }) })
      assert.deepStrictEqual(yield* Router.current(subset), subset.make({ _tag: "Person", params: { id: 2 } }))
      yield* router.navigate("/")
      assert.isTrue(Exit.isFailure(yield* Effect.exit(Router.current(subset))))
      assert.strictEqual(
        (yield* current.pipe(Effect.provide(Router.static({ routes: AppRoute, url: "/people/3" }))))._tag,
        "Person"
      )
    }).pipe(Effect.provide(Router.memory({ routes: AppRoute, url: "/" }))))

  it.effect("navigates by Command, back and forward, and the head follows the route", () => {
    const { history, layer, settled } = setup()
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* mount
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
          entry._tag === "Update" && entry.source._tag === "Subscription" &&
          (entry.message as any)._tag === "ChangedRoute"
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

  it.effect("restores a page's Model on back and forward, and reruns every init Command", () => {
    const { history, layer } = setup("/people/1")
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* mount
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
        // Nothing is dropped on replay: init's Command runs again, as on any mount.
        assert.isFalse(root.log().some((entry) => entry._tag === "CommandDropped"))
        const visits = root.log().filter((entry): entry is MessageLog.Update =>
          entry._tag === "Update" && entry.path === path && (entry.message as any)._tag === "Visited"
        )
        assert.deepStrictEqual(visits.map((entry) => (entry.model as any).visits), [1, 2])

        // A page reached by a push starts fresh.
        click(root, "Person 2")
        yield* TestHost.settle
        click(root, "Person 1")
        yield* TestHost.settle
        assert.isTrue(root.text().includes("Person 1count 0"))
      })
    )
  })

  it.effect("restores a Model written into the history entry after the Router is rebuilt, as on a reload", () => {
    const { history, layer } = setup("/people/1")
    const page = Effect.gen(function*() {
      const root = yield* mount
      yield* TestHost.settle
      click(root, "count 0")
      yield* TestHost.settle
      // Leaving by a push writes the snapshot into the entry being left.
      click(root, "Home")
      yield* TestHost.settle
    })
    const reloaded = Effect.gen(function*() {
      const root = yield* mount
      yield* TestHost.settle
      history.go(-1)
      yield* TestHost.settle
      assert.isTrue(root.text().includes("Person 1count 1"))
    })
    return Effect.gen(function*() {
      yield* run(layer, page).pipe(Effect.scoped)
      yield* run(Router.make({ routes: AppRoute, history }), reloaded).pipe(Effect.scoped)
    })
  })

  it.effect("seeds a cold entry from a restored loader field, stale, and refetches it once", () => {
    const { history, layer } = setup("/people/1")
    const page = Effect.gen(function*() {
      const root = yield* mount
      yield* TestHost.settle
      click(root, "Home")
      yield* TestHost.settle
    })
    return Effect.gen(function*() {
      personFetches.count = 0
      yield* run(layer, page).pipe(Effect.scoped)
      assert.strictEqual(personFetches.count, 1)
      yield* run(
        Router.make({ routes: AppRoute, history }),
        Effect.gen(function*() {
          const root = yield* mount
          yield* TestHost.settle
          history.go(-1)
          yield* TestHost.settle
          // The new cache is cold: the restored snapshot seeds it, so the page mounts with the data,
          // stale, and one refetch runs.
          const restored = root.log().find((entry): entry is MessageLog.Mounted =>
            entry._tag === "Mounted" && entry.path === "/App/Person[/people/1]"
          )
          assert.isTrue(restored?.adopted)
          assert.isTrue(root.text().includes("Person 1"))
          assert.deepStrictEqual(
            root.fetches().map((fetch) => [fetch.read, fetch.trigger]),
            [["GetPerson", "watch"]]
          )
          assert.strictEqual(personFetches.count, 2)
          assert.strictEqual(root.entry(GetPerson, { id: 1 })?.stale, false)
        })
      ).pipe(Effect.scoped)
    })
  })

  it.effect("drops a loader field whose snapshot was taken under a patch from the restored Model", () => {
    const { history, layer } = setup("/people/1")
    const path = "/App/Person[/people/1]"
    const encode = Schema.encodeSync(Schema.toCodecJson(PersonSnapshot))
    return Effect.gen(function*() {
      yield* run(
        layer,
        Effect.gen(function*() {
          const root = yield* mount
          yield* TestHost.settle
          // The rename never finishes, so its patch is live when the push snapshots the page.
          click(root, "Rename")
          yield* TestHost.settle
          assert.isTrue(root.text().includes("Renamed"))
          click(root, "Home")
          yield* TestHost.settle
        })
      ).pipe(Effect.scoped)
      yield* run(
        Router.make({ routes: AppRoute, history }),
        Effect.gen(function*() {
          const root = yield* mount
          yield* TestHost.settle
          history.go(-1)
          yield* TestHost.settle
          const restored = root.log().find((entry): entry is MessageLog.Mounted =>
            entry._tag === "Mounted" && entry.path === path
          )
          assert.isDefined(restored)
          assert.isTrue(restored.adopted)
          // The rest of the Model is restored; the loader field starts from loading, and the fetch fills it.
          const model = restored.model as { readonly person: typeof PersonSnapshot.Type; readonly name: string }
          assert.deepStrictEqual(encode(model.person), [])
          assert.strictEqual(model.name, "Renamed")
          assert.isTrue(root.text().includes("Person 1"))
        })
      ).pipe(Effect.scoped)
    })
  })

  it.effect("keeps the snapshot in memory and reports SnapshotWriteFailed when history.state rejects it", () => {
    const inner = Router.memoryHistory("/people/1")
    const history: Router.History = {
      ...inner,
      replace: (url, state) => {
        if (JSON.stringify(state).includes("snapshot")) throw new Error("DataCloneError")
        inner.replace(url, state)
      }
    }
    return run(
      Router.make({ routes: AppRoute, history }),
      Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        click(root, "count 0")
        yield* TestHost.settle
        click(root, "Home")
        // settle fails on the problem once it has run everything.
        const unexpected = yield* Effect.flip(TestHost.settle)
        assert.strictEqual(unexpected._tag, "ProblemsError")
        const [problem] = yield* TestHost.expectProblem("SnapshotWriteFailed")
        assert.instanceOf(problem, Router.SnapshotWriteFailed)
        // The entry keeps its index only, and back still restores from memory.
        history.go(-1)
        yield* TestHost.settle
        assert.isFalse(JSON.stringify(inner.current().state).includes("snapshot"))
        assert.isTrue(root.text().includes("count 1"))
      })
    )
  })

  it.effect("blocks navigation and reverts back and forward while Router.blocked runs", () => {
    const { history, layer, settled } = setup()
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* mount
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
        const root = yield* mount
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
        const root = yield* mount
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

  it.effect("settles with the head of the live tree when a title template fails its layout", () => {
    const { layer, settled } = setup()
    const Page = Component.make({
      name: "Page",
      model: Schema.Number,
      message: Schema.Never,
      init: () => 0,
      update: (model) => model,
      head: () => [Head.title("Ada")],
      view: (_, h) => h.text("page")
    })
    const Layout = Component.make({
      name: "Layout",
      model: Schema.Number,
      message: Schema.Never,
      init: () => 0,
      update: (model) => model,
      head: () => [
        Head.titleTemplate(() => {
          throw new Error("bad template")
        })
      ],
      view: (_, h) => h.child(Page, { key: "page", props: {} })
    })
    const Shell = Component.make({
      name: "Shell",
      props: Schema.Struct({ route: AppRoute }),
      model: AppRoute,
      message: Schema.Struct({ route: AppRoute }),
      init: ($) => $.props.route,
      update: (_, { route }) => route,
      subscriptions: () => [Router.subscription(AppRoute, (route) => ({ route }))],
      head: () => [Head.title("App")],
      view: (route, h) =>
        route._tag === "Person"
          ? h.child(Layout, { key: AppRoute.print(route), props: {}, fallback: () => h.text("down") })
          : h.text("home")
    })
    return run(
      layer,
      Effect.gen(function*() {
        const router = yield* Router.Router
        const root = yield* TestHost.mount(Shell, { route: AppRoute.make({ _tag: "Home" }) })
        yield* TestHost.settle
        yield* router.navigate("/people/1")
        yield* TestHost.settle
        assert.strictEqual(root.text(), "down")
        assert.strictEqual(root.head().title, "App")
        // The removed page's title is never announced.
        assert.deepStrictEqual(settled.map((done) => done.head.title), ["App"])
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
