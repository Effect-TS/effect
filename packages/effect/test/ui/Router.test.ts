import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, type Layer, Option, Schema, type Scope, Stream } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Command, Component, Head, type MessageLog, type Renderer, Route, Router } from "effect/ui"
import * as runtime from "effect/ui/internal/runtime"
import { Query, TestHost } from "effect/ui/testing"
import * as Prefetching from "./fixtures/prefetch.ts"
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

const mount = TestHost.mount(App, Router.props(AppRoute))

// Sequential: the restore tests change the person fixture's shared fetcher.
describe("Router", { concurrent: false }, () => {
  it.effect("logs a navigation's update, route and outcome before the page it mounts", () => {
    const { layer } = setup()
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        const start = root.log().length
        click(root, "Person 1")
        yield* TestHost.settle
        const entries = root.log().slice(start).map((entry) => {
          switch (entry._tag) {
            case "Update":
              return `Update ${entry.path} ${(entry.message as { _tag: string })._tag}(${entry.source._tag})`
            case "CommandEnded":
              return `CommandEnded ${entry.name}`
            case "Mounted":
            case "Unmounted":
              return `${entry._tag} ${entry.path}`
            default:
              return entry._tag
          }
        })
        assert.deepStrictEqual(entries.slice(0, 7), [
          "Update /App Go(DomEvent)",
          "Update /App ChangedRoute(Subscription)",
          "Update /App Navigated(Command)",
          "CommandEnded effect/ui/Router/Push",
          "Mounted /App/Person[/people/1]",
          "SubscriptionStarted",
          "Unmounted /App/Home[/]"
        ])
      })
    ).pipe(Effect.scoped)
  })

  it.effect("suppresses the matching initial route and keeps one subscription across navigation", () =>
    run(
      Router.memory({ routes: AppRoute }),
      Effect.gen(function*() {
        const root = yield* mount
        yield* TestHost.settle
        assert.isFalse(root.log().some((entry) => entry._tag === "Update" && entry.source._tag === "Subscription"))
        const router = yield* Router.Router
        yield* router.navigate("/people/2")
        yield* TestHost.settle
        yield* router.navigate("/")
        yield* TestHost.settle
        assert.strictEqual(
          root.log().filter((entry) => entry._tag === "SubscriptionStarted" && entry.key === "effect/ui/Router").length,
          1
        )
        assert.deepStrictEqual(yield* TestHost.problems, [])
      })
    ))

  it.effect("reports an initial mismatch once, but accepts a delayed root after navigation", () =>
    run(
      Router.memory({ routes: AppRoute, url: "/people/1" }),
      Effect.gen(function*() {
        const root = yield* TestHost.mount(App, { route: AppRoute.make({ _tag: "Person", params: { id: 2 } }) })
        yield* Effect.exit(TestHost.settle)
        const reported = yield* TestHost.expectProblem("RouteMismatch")
        assert.strictEqual(reported.length, 1)
        assert.strictEqual((reported[0] as Router.RouteMismatch).have, "/people/2")
        assert.strictEqual((reported[0] as Router.RouteMismatch).router, "/people/1")
        assert.strictEqual(root.model()?.route._tag, "Person")
        const router = yield* Router.Router
        yield* router.navigate("/people/2")
        const delayed = yield* TestHost.mount(App, { route: AppRoute.make({ _tag: "Home" }) })
        yield* TestHost.settle
        assert.deepStrictEqual(delayed.model()?.route, AppRoute.make({ _tag: "Person", params: { id: 2 } }))
        assert.deepStrictEqual(yield* TestHost.problems, [])
      })
    ))

  it.effect("a subset ignores an initial location outside it without checking a later navigation", () => {
    const People = AppRoute.subset(["Person"])
    const problems: Array<Loader.Problem.Any> = []
    return Effect.gen(function*() {
      const router = yield* Router.Router
      const messages: Array<typeof People.Type> = []
      const subscription = Router.subscription(
        People,
        People.make({ _tag: "Person", params: { id: 1 } }),
        (route) => route
      )
      yield* Stream.runForEach(subscription.stream, (route) =>
        Effect.sync(() => {
          messages.push(route)
        })).pipe(Effect.forkScoped)
      yield* Effect.yieldNow
      yield* router.navigate("/people/2")
      yield* Effect.yieldNow
      assert.deepStrictEqual(messages, [People.make({ _tag: "Person", params: { id: 2 } })])
      assert.deepStrictEqual(problems, [])
    }).pipe(
      Effect.provide(Router.memory({ routes: AppRoute })),
      Effect.provideService(Loader.Problems, (problem) => problems.push(problem))
    )
  })

  it.effect("fails the subscribing instance on a mapper defect, not the navigation or other subscribers", () => {
    const routes = Route.union({ Home: Route.make("/"), Other: Route.make("/other") })
    const subscriber = (name: string, map: (route: typeof routes.Type) => typeof routes.Type) =>
      Component.make({
        name,
        props: Schema.Struct({ route: routes }),
        model: Schema.Struct({ route: routes }),
        message: routes,
        init: ($) => ({ route: $.props.route }),
        update: (_, route) => ({ route }),
        subscriptions: (model) => [Router.subscription(routes, model.route, map)],
        view: (model, h) => h.el("p", model.route._tag)
      })
    const Broken = subscriber("Broken", () => {
      throw new Error("bad mapper")
    })
    const Healthy = subscriber("Healthy", (route) => route)
    return Effect.gen(function*() {
      const broken = yield* TestHost.mount(Broken, Router.props(routes))
      const healthy = yield* TestHost.mount(Healthy, Router.props(routes))
      yield* TestHost.settle
      const router = yield* Router.Router
      assert.strictEqual(yield* router.navigate("/other"), "navigated")
      yield* Effect.exit(TestHost.settle)
      assert.strictEqual(router.location().url, "/other")
      assert.strictEqual(healthy.text(), "Other")
      const failed = broken.log().find((entry) => entry._tag === "Failed") as MessageLog.Failed
      assert.strictEqual(failed.source, "subscription")
      assert.isUndefined(broken.model())
    }).pipe(Effect.provide(Router.memory({ routes })), Effect.provide(TestHost.layer()))
  })

  it.effect("settles a navigation once the root has its route, not when its message is dropped", () => {
    const routes = Route.union({ Home: Route.make("/"), Other: Route.make("/other") })
    const Message = Schema.TaggedUnion({ Follow: { on: Schema.Boolean }, Changed: { route: routes } })
    const settled: Array<string | undefined> = []
    let onRoute = () => {}
    const Root = Component.make({
      name: "Root",
      props: Schema.Struct({ route: routes }),
      model: Schema.Struct({ route: routes, following: Schema.Boolean }),
      message: Message,
      init: ($) => ({ route: $.props.route, following: true }),
      update: (model, message) =>
        message._tag === "Changed" ? { ...model, route: message.route } : { ...model, following: message.on },
      subscriptions: (model) =>
        model.following
          ? [Router.subscription(routes, model.route, (route) => {
            onRoute()
            return Message.make({ _tag: "Changed", route })
          })]
          : [],
      head: (model) => [Head.title(model.route._tag)],
      view: (model, h) => h.el("p", model.route._tag)
    })
    return Effect.gen(function*() {
      const root = yield* TestHost.mount(Root, Router.props(routes))
      yield* TestHost.settle
      // The root stops following while its Subscription maps the route, so the runtime drops the message.
      onRoute = () => {
        onRoute = () => {}
        root.send(Message.make({ _tag: "Follow", on: false }))
      }
      const router = yield* Router.Router
      assert.strictEqual(yield* router.navigate("/other"), "navigated")
      yield* TestHost.settle
      assert.strictEqual(root.text(), "Home")
      assert.deepStrictEqual(settled, [])
      root.send(Message.make({ _tag: "Follow", on: true }))
      yield* TestHost.settle
      assert.strictEqual(root.text(), "Other")
      assert.deepStrictEqual(settled, ["Other"])
    }).pipe(
      Effect.provide(Router.make({
        routes,
        history: Router.memoryHistory("/"),
        onSettled: (done) => settled.push(done.head.title)
      })),
      Effect.provide(TestHost.layer())
    )
  })

  it.effect("removes query params dropped as invalid from the URL, keeping the others", () => {
    const routes = Route.union({
      Search: Route.make("/", {
        query: { page: Schema.optional(Schema.Number), sort: Schema.optional(Schema.String) }
      })
    })
    const history = Router.memoryHistory("/?utm=x&page=abc")
    return Effect.gen(function*() {
      const router = yield* Router.Router
      assert.deepStrictEqual(history.entries(), ["/?utm=x"])
      yield* router.navigate("/?page=x&sort=a&utm=y")
      assert.deepStrictEqual(history.entries(), ["/?utm=x", "/?sort=a&utm=y"])
    }).pipe(Effect.provide(Router.memory({ routes, history })))
  })

  it.effect("does nothing for a navigation to a route that prints the same as the current one", () => {
    const routes = Route.union({
      Home: Route.make("/"),
      Search: Route.make("/search", { query: { q: Schema.optional(Schema.String) } })
    })
    const history = Router.memoryHistory("/search?q=x&utm=1")
    const x = routes.make({ _tag: "Search", query: { q: "x" } })
    return Effect.gen(function*() {
      const router = yield* Router.Router
      const messages: Array<typeof routes.Type> = []
      yield* Stream.runForEach(
        Router.subscription(routes, x, (route) => route).stream,
        (route) => Effect.sync(() => messages.push(route))
      ).pipe(Effect.forkScoped)
      yield* Effect.yieldNow
      assert.strictEqual(yield* router.replace(x), "navigated")
      assert.strictEqual(yield* router.push(x), "navigated")
      assert.strictEqual(yield* router.navigate("/search?utm=2&q=x"), "navigated")
      assert.strictEqual(yield* router.navigate("/search?q=x", { replace: true }), "navigated")
      yield* Effect.yieldNow
      assert.deepStrictEqual(history.entries(), ["/search?q=x&utm=1"])
      assert.strictEqual(router.location().seq, 0)
      assert.strictEqual(router.location().url, "/search?q=x&utm=1")
      // A new hash alone is a hash change on the current URL.
      yield* router.navigate("/search?q=x#top")
      assert.deepStrictEqual(history.entries(), ["/search?q=x&utm=1", "/search?q=x&utm=1#top"])
      assert.strictEqual(router.location().seq, 0)
      yield* Effect.yieldNow
      assert.deepStrictEqual(messages, [])
      const y = routes.make({ _tag: "Search", query: { q: "y" } })
      yield* router.replace(y)
      yield* Effect.yieldNow
      assert.deepStrictEqual(history.entries(), ["/search?q=x&utm=1", "/search?q=y"])
      assert.strictEqual(router.location().seq, 1)
      assert.deepStrictEqual(messages, [y])
    }).pipe(Effect.provide(Router.memory({ routes, history })))
  })

  it.effect("reads the current route from memory and static Routers", () =>
    Effect.gen(function*() {
      const current = Router.currentRoute(AppRoute)
      const router = yield* Router.Router
      assert.strictEqual((yield* current)._tag, "Home")
      yield* router.navigate("/people/2")
      assert.deepStrictEqual(yield* current, AppRoute.make({ _tag: "Person", params: { id: 2 } }))
      const subset = Route.union({ Person: Route.make("/people/:id", { params: { id: Schema.Number } }) })
      assert.deepStrictEqual(yield* Router.currentRoute(subset), subset.make({ _tag: "Person", params: { id: 2 } }))
      yield* router.navigate("/")
      assert.isTrue(Exit.isFailure(yield* Effect.exit(Router.currentRoute(subset))))
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

  for (const fail of [false, true]) {
    it.effect(`seeds a cold entry from a restored loader field, stale, and refetches it once (${fail ? "failure" : "success"})`, () => {
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
        personFetches.delay = 10
        personFetches.fail = fail
        yield* run(
          Router.make({ routes: AppRoute, history }),
          Effect.gen(function*() {
            const root = yield* mount
            yield* TestHost.settle
            history.go(-1)
            yield* TestHost.settle
            // The new cache is cold: the restored snapshot seeds it, so the page mounts with the data,
            // stale, while one refetch runs.
            const restored = root.log().find((entry): entry is MessageLog.Mounted =>
              entry._tag === "Mounted" && entry.path === "/App/Person[/people/1]"
            )
            assert.isTrue(restored?.adopted)
            assert.strictEqual(
              root.frames().at(-1),
              "HomePerson 1Person 2SlowBackBlockUnblockPerson 1Refreshingcount 0Rename"
            )
            assert.strictEqual(root.entry(GetPerson, { id: 1 })?.fetch, "running")
            yield* TestClock.adjust("10 millis")
            yield* TestHost.settle
            assert.deepStrictEqual(root.fetches().map((fetch) => [fetch.read, fetch.trigger]), [["GetPerson", "watch"]])
            assert.strictEqual(personFetches.count, 2)
            const entry = root.entry(GetPerson, { id: 1 })!
            if (fail) {
              // The failed refetch keeps the seed as its previous success.
              assert.strictEqual(entry.stored._tag, "Failure")
              assert.isTrue(AsyncResult.isFailure(entry.stored) && Option.isSome(entry.stored.previousSuccess))
              assert.deepStrictEqual(
                AsyncResult.isFailure(entry.stored)
                  ? Option.map(entry.stored.previousSuccess, (s) => s.value)
                  : undefined,
                Option.some("Person 1")
              )
            } else {
              assert.strictEqual(entry.stored._tag, "Success")
              assert.isFalse(entry.stale)
            }
            assert.isFalse(root.text().includes("Refreshing"))
          })
        ).pipe(
          Effect.scoped,
          Effect.ensuring(Effect.sync(() => Object.assign(personFetches, { delay: 0, fail: false })))
        )
      })
    })
  }

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
      subscriptions: (held) => [Router.subscription(AppRoute, held, (route) => ({ route }))],
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

describe("Router.patchQuery", { concurrent: false }, () => {
  const Routes = Route.union({
    Home: Route.make("/"),
    Search: Route.make("/search", {
      query: {
        q: Schema.optional(Schema.String),
        page: Schema.Number.pipe(Schema.withDecodingDefaultKey(Effect.succeed(1)))
      }
    }),
    Item: Route.make("/items/:id", { params: { id: Schema.Number }, query: { tab: Schema.optional(Schema.String) } }),
    NotFound: Route.make("/*")
  })
  const SearchOnly = Routes.subset(["Search"])

  type Write = readonly [Router.QueryPatch<typeof SearchOnly.Type>, { readonly history?: "push" | "replace" }?]
  /** The patches the page's buttons write, by label. */
  const writes: Record<string, ReadonlyArray<Write>> = {
    "q=a": [[{ q: "a" }]],
    "page=2": [[{ page: 2 }]],
    "push page=3": [[{ page: 3 }, { history: "push" }]],
    "clear": [[{ q: undefined, page: undefined }]],
    "both": [[{ q: "x" }], [{ page: 5 }]]
  }
  const PageMessage = Schema.TaggedUnion({
    Write: { label: Schema.String },
    Dirty: {},
    Outcome: { outcome: Schema.String }
  })
  /** Holds its whole route as props, and writes the query with patchQuery. */
  const SearchPage = Component.make({
    name: "SearchPage",
    props: Schema.Struct({ route: SearchOnly }),
    model: Schema.Struct({ outcomes: Schema.Array(Schema.String), dirty: Schema.Boolean }),
    message: PageMessage,
    init: () => ({ outcomes: [], dirty: false }),
    update: (model, message, $) =>
      PageMessage.match(message, {
        Write: ({ label }) =>
          $.run(
            ...writes[label]!.map(([patch, options]) =>
              Router.patchQuery(Routes, $.props.route, patch, options).pipe(
                Command.map((outcome) => PageMessage.make({ _tag: "Outcome", outcome }))
              )
            )
          ),
        Dirty: () => ({ ...model, dirty: true }),
        Outcome: ({ outcome }) => ({ ...model, outcomes: [...model.outcomes, outcome] })
      }),
    subscriptions: (model) => [model.dirty && Router.blocked("draft")],
    view: (model, h) =>
      h.el(
        "div",
        h.el("p", `q=${h.props.route.query.q ?? ""} page=${h.props.route.query.page};`),
        h.el("p", `outcomes ${model.outcomes.join(",")};`),
        ...Object.keys(writes).map((label) =>
          h.el("button", label).on("click", PageMessage.make({ _tag: "Write", label }))
        ),
        h.el("button", "dirty").on("click", PageMessage.make({ _tag: "Dirty" }))
      )
  })
  const AppMessage = Schema.TaggedUnion({ ChangedRoute: { route: Routes } })
  /** A root that holds the route, keying the search page with `key`. */
  const makeApp = (key: (route: typeof SearchOnly.Type) => string) =>
    Component.make({
      name: "App",
      props: Schema.Struct({ route: Routes }),
      model: Schema.Struct({ route: Routes }),
      message: AppMessage,
      init: ($) => ({ route: $.props.route }),
      update: (_, { route }) => ({ route }),
      subscriptions: (model) => [
        Router.subscription(Routes, model.route, (route) => AppMessage.make({ _tag: "ChangedRoute", route }))
      ],
      view: (model, h) =>
        Routes.match(model.route, {
          Search: (route) => h.child(SearchPage, { key: key(route), props: { route } }),
          Home: () => h.el("h1", "Home"),
          Item: () => h.el("h1", "Item"),
          NotFound: () => h.el("h1", "Not found")
        })
    })
  const App = makeApp((route) => SearchOnly.printPath(route))

  const searchSetup = (url: string) => {
    const history = Router.memoryHistory(url)
    const settled: Array<Router.Settled> = []
    const layer = Router.make({ routes: Routes, history, onSettled: (done) => settled.push(done) })
    return { history, settled, layer }
  }
  const quietness = (settled: ReadonlyArray<Router.Settled>) =>
    settled.map((done) => `${done.location.action} ${done.location.url} ${done.quiet ? "quiet" : "loud"}`)
  const mounts = (root: TestHost.TestRoot<any, any, any>) =>
    root.log().filter((entry) => entry._tag === "Mounted" && entry.path.startsWith("/App/SearchPage")).length

  it.effect("patches the Router's current query, replacing, and keeps undeclared params after the declared ones", () => {
    const { history, layer, settled } = searchSetup("/search?utm_source=news&q=z")
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(App, Router.props(Routes))
        yield* TestHost.settle
        click(root, "q=a")
        yield* TestHost.settle
        assert.deepStrictEqual(history.entries(), ["/search?q=a&utm_source=news"])
        click(root, "page=2")
        yield* TestHost.settle
        assert.deepStrictEqual(history.entries(), ["/search?q=a&page=2&utm_source=news"])
        assert.isTrue(root.text().includes("q=a page=2;"))
        // undefined removes a param, or resets it to its default.
        click(root, "clear")
        yield* TestHost.settle
        assert.deepStrictEqual(history.entries(), ["/search?utm_source=news"])
        assert.deepStrictEqual(root.model()?.route, Routes.make({ _tag: "Search" }))
        // Two writers in one round trip both land: each patches the Router's query, not the held route.
        click(root, "both")
        yield* TestHost.settle
        assert.deepStrictEqual(history.entries(), ["/search?q=x&page=5&utm_source=news"])
        assert.isTrue(root.text().includes("q=x page=5;"))
        assert.isTrue(root.text().includes("outcomes navigated,navigated,navigated,navigated,navigated;"))
        // The page keyed by its path stayed mounted.
        assert.strictEqual(mounts(root), 1)
        // Every navigation settles, quietly. The first of the two writers was superseded before it settled.
        assert.deepStrictEqual(quietness(settled), [
          "replace /search?q=a&utm_source=news quiet",
          "replace /search?q=a&page=2&utm_source=news quiet",
          "replace /search?utm_source=news quiet",
          "replace /search?q=x&page=5&utm_source=news quiet"
        ])
        assert.deepStrictEqual(yield* TestHost.problems, [])
      })
    )
  })

  it.effect("pushes with history push, quietly, and back and forward between query-only entries are quiet", () => {
    const { history, layer, settled } = searchSetup("/search")
    return run(
      layer,
      Effect.gen(function*() {
        const router = yield* Router.Router
        const root = yield* TestHost.mount(App, Router.props(Routes))
        yield* TestHost.settle
        click(root, "push page=3")
        yield* TestHost.settle
        assert.deepStrictEqual(history.entries(), ["/search", "/search?page=3"])
        history.go(-1)
        yield* TestHost.settle
        assert.isTrue(root.text().includes("q= page=1;"))
        history.go(1)
        yield* TestHost.settle
        assert.isTrue(root.text().includes("q= page=3;"))
        // The page kept its live Model through both pops.
        assert.strictEqual(mounts(root), 1)
        assert.isTrue(root.text().includes("outcomes navigated;"))
        // A replace to the same path is quiet; a push to the same path, as a link, stays loud.
        yield* router.navigate("/search?page=4", { replace: true })
        yield* TestHost.settle
        yield* router.navigate("/search?page=5")
        yield* TestHost.settle
        // Leaving the page, and coming back to it, is loud.
        yield* router.navigate("/")
        yield* TestHost.settle
        history.go(-1)
        yield* TestHost.settle
        assert.deepStrictEqual(quietness(settled), [
          "push /search?page=3 quiet",
          "pop /search quiet",
          "pop /search?page=3 quiet",
          "replace /search?page=4 quiet",
          "push /search?page=5 loud",
          "push / loud",
          "pop /search?page=5 loud"
        ])
      })
    )
  })

  it.effect("returns stale when the Router's path no longer matches the held route", () =>
    Effect.gen(function*() {
      const router = yield* Router.Router
      const item1 = Routes.make({ _tag: "Item", params: { id: 1 } })
      assert.strictEqual(yield* router.patchQuery(item1, { tab: "a" }), "navigated")
      assert.strictEqual(router.location().url, "/items/1?tab=a")
      yield* router.navigate("/items/2")
      assert.strictEqual(yield* router.patchQuery(item1, { tab: "b" }), "stale")
      assert.strictEqual(yield* router.patchQuery(Routes.make({ _tag: "Home" }), {}), "stale")
      assert.strictEqual(router.location().url, "/items/2")
      // A patch that changes nothing is no navigation.
      const seq = router.location().seq
      assert.strictEqual(
        yield* router.patchQuery(Routes.make({ _tag: "Item", params: { id: 2 } }), { tab: undefined }),
        "navigated"
      )
      assert.strictEqual(router.location().seq, seq)
      // The static Router changes nothing.
      const fixed = yield* Router.Router.pipe(Effect.provide(Router.static({ routes: Routes, url: "/items/1" })))
      assert.strictEqual(yield* fixed.patchQuery(item1, { tab: "a" }), "blocked")
    }).pipe(Effect.provide(Router.memory({ routes: Routes, url: "/items/1" }))))

  it.effect("isn't blocked, and neither are pops within the page, while a block is held", () => {
    const { history, layer, settled } = searchSetup("/search")
    return run(
      layer,
      Effect.gen(function*() {
        const router = yield* Router.Router
        const root = yield* TestHost.mount(App, Router.props(Routes))
        yield* TestHost.settle
        click(root, "dirty")
        yield* TestHost.settle
        click(root, "q=a")
        yield* TestHost.settle
        click(root, "push page=3")
        yield* TestHost.settle
        assert.deepStrictEqual(history.entries(), ["/search?q=a", "/search?q=a&page=3"])
        assert.isTrue(root.text().includes("outcomes navigated,navigated;"))
        // Back within the page isn't reverted.
        history.go(-1)
        yield* TestHost.settle
        assert.strictEqual(history.index(), 0)
        assert.isTrue(root.text().includes("q=a page=1;"))
        // Leaving the page is still blocked.
        assert.strictEqual(yield* router.push(Routes.make({ _tag: "Home" })), "blocked")
        assert.strictEqual(yield* router.replace(Routes.make({ _tag: "Search", query: { q: "b" } })), "blocked")
        assert.deepStrictEqual(quietness(settled), [
          "replace /search?q=a quiet",
          "push /search?q=a&page=3 quiet",
          "pop /search?q=a quiet"
        ])
        assert.deepStrictEqual(yield* TestHost.problems, [])
      })
    )
  })

  it.effect("reports a block held when the patch ran that's gone when it settles", () => {
    // Keyed by the whole printed route, the page remounts on a query change and loses its block.
    const Remounting = makeApp((route) => SearchOnly.print(route))
    const { layer } = searchSetup("/search")
    return run(
      layer,
      Effect.gen(function*() {
        const root = yield* TestHost.mount(Remounting, Router.props(Routes))
        yield* TestHost.settle
        click(root, "dirty")
        yield* TestHost.settle
        click(root, "q=a")
        yield* Effect.exit(TestHost.settle)
        const lost = yield* TestHost.expectProblem("PatchQueryLostBlock")
        assert.deepStrictEqual(lost.map((problem) => (problem as Router.PatchQueryLostBlock).keys), [["draft"]])
        // Without a block, nothing is reported.
        click(root, "page=2")
        yield* TestHost.settle
        assert.deepStrictEqual(yield* TestHost.problems, [])
      })
    )
  })

  it.effect("patches the query under the # base", () => {
    Routes.setBase("#")
    const history = Router.memoryHistory("#/search?utm=1&q=a")
    return Effect.gen(function*() {
      const router = yield* Router.Router
      const held = Routes.make({ _tag: "Search", query: { q: "a" } })
      assert.deepStrictEqual(history.entries(), ["#/search?utm=1&q=a"])
      assert.strictEqual(yield* router.patchQuery(held, { page: 2 }), "navigated")
      assert.deepStrictEqual(history.entries(), ["#/search?q=a&page=2&utm=1"])
      assert.strictEqual(yield* router.patchQuery(held, { q: undefined }, { history: "push" }), "navigated")
      assert.deepStrictEqual(history.entries(), ["#/search?q=a&page=2&utm=1", "#/search?page=2&utm=1"])
      assert.deepStrictEqual(router.location().route, Routes.make({ _tag: "Search", query: { page: 2 } }))
      yield* router.navigate("#/items/1")
      assert.strictEqual(yield* router.patchQuery(held, { page: 3 }), "stale")
    }).pipe(
      Effect.provide(Router.memory({ routes: Routes, history })),
      Effect.ensuring(Effect.sync(() => Routes.setBase("")))
    )
  })
})

describe("Router.prefetch", { concurrent: false }, () => {
  const { Routes } = Prefetching
  const prefetching = (
    url: string,
    effect: Effect.Effect<
      void,
      unknown,
      Router.Services | GetPerson | TestHost.TestHost | Renderer.Renderer | Scope.Scope
    >
  ) =>
    effect.pipe(
      Effect.provide(GetPerson.layer),
      Effect.provide(Router.memory({ routes: Routes, url })),
      Effect.provide(TestHost.layer())
    )
  const mountApp = Effect.flatMap(Router.currentRoute(Routes), (route) => TestHost.mount(Prefetching.App, { route }))
  const fetched = (root: TestHost.TestRoot<any, any, any>) =>
    root.fetches().map((fetch) => [`${fetch.read}${fetch.logKey}`, fetch.trigger, fetch.path])
  const tags = (problems: ReadonlyArray<Loader.Problem.Any>) => problems.map((problem) => problem._tag)

  it.effect("walks a page with no instance on intent, and drops a repeat for 30 seconds", () =>
    prefetching(
      "/",
      Effect.gen(function*() {
        const router = yield* Router.Router
        const root = yield* mountApp
        yield* TestHost.settle
        const before = root.fetches().length
        yield* router.intent("/walk")
        // The page's read and its component child's. The feature is skipped, and so is the note behind a provide.
        assert.deepStrictEqual(fetched(root).slice(before), [
          ["GetPerson{\"id\":1}", "prefetch", "/App"],
          ["GetPerson{\"id\":2}", "prefetch", "/App"]
        ])
        const missing = yield* TestHost.expectProblem("PrefetchReadNotProvided")
        assert.deepStrictEqual(
          missing.map((
            problem
          ) => [(problem as Router.PrefetchReadNotProvided).page, (problem as Router.PrefetchReadNotProvided).read]),
          [["Walked", "GetNote"]]
        )
        // A throw stops that page's walk only, after its loaders ran.
        yield* router.intent("/broken")
        assert.deepStrictEqual(fetched(root).slice(before + 2).map(([key]) => key), [
          "GetPerson{\"id\":3}",
          "GetPerson{\"id\":4}"
        ])
        const threw = yield* TestHost.expectProblem("PrefetchThrew")
        assert.deepStrictEqual(threw.map((problem) => (problem as Router.PrefetchThrew).page), ["Broken"])
        // The current route, and an href the routes don't parse, do nothing.
        yield* router.intent("/")
        yield* router.intent("/nowhere")
        // Within 30 seconds the declaration doesn't run again, so nothing is reported.
        yield* TestClock.adjust("29 seconds")
        yield* router.intent("/walk")
        assert.deepStrictEqual(tags(yield* TestHost.problems), [])
        yield* TestClock.adjust("1 second")
        yield* router.intent("/walk")
        assert.strictEqual((yield* TestHost.expectProblem("PrefetchReadNotProvided")).length, 1)
        yield* TestHost.settle
      })
    ))

  it.effect("runs the destination's declaration on push before the route changes, and nothing on mount or back", () =>
    prefetching(
      "/people/1",
      Effect.gen(function*() {
        const router = yield* Router.Router
        Prefetching.probe.seen.length = 0
        Prefetching.probe.location = () => router.location().url
        const root = yield* mountApp
        yield* TestHost.settle
        yield* router.navigate("/people/2")
        yield* TestHost.settle
        // The page found its entry fetched by the prefetch, and nothing was reported.
        assert.deepStrictEqual(Prefetching.probe.seen, ["/people/1"])
        yield* router.back
        yield* TestHost.settle
        assert.deepStrictEqual(fetched(root).filter(([key]) => key !== "GetPerson{\"id\":0}"), [
          ["GetPerson{\"id\":1}", "watch", "/App"],
          ["GetPerson{\"id\":2}", "prefetch", "/App"]
        ])
        assert.deepStrictEqual(Prefetching.probe.seen, ["/people/1"])
      })
    ))

  it.effect("checks the declared pages once a push settles", () =>
    prefetching(
      "/",
      Effect.gen(function*() {
        const router = yield* Router.Router
        yield* mountApp
        yield* TestHost.settle
        // A page created since the push that never watched a declared entry.
        yield* router.navigate("/people/7")
        yield* Effect.exit(TestHost.settle)
        const unwatched = yield* TestHost.expectProblem("PrefetchEntryNotWatched")
        assert.deepStrictEqual(
          unwatched.map((
            problem
          ) => [(problem as Router.PrefetchEntryNotWatched).page, (problem as Router.PrefetchEntryNotWatched).logKey]),
          [["Detail", "{\"id\":70}"]]
        )
        // No instance of the declared page.
        yield* router.navigate("/empty")
        yield* Effect.exit(TestHost.settle)
        const unmounted = yield* TestHost.expectProblem("PrefetchPageNotMounted")
        assert.deepStrictEqual(unmounted.map((problem) => (problem as Router.PrefetchPageNotMounted).page), ["Detail"])
        // The sidebar is older than the push: skipped.
        yield* router.navigate("/")
        yield* TestHost.settle
        // A Layer build begun since the push failed: the whole check is skipped.
        yield* router.navigate("/failing")
        yield* TestHost.settle
        assert.deepStrictEqual(tags(yield* TestHost.problems), [])
      })
    ))

  it.effect("keys intent and the guard by the printed route, whatever the query spelling", () =>
    prefetching(
      "/people/1",
      Effect.gen(function*() {
        const router = yield* Router.Router
        Prefetching.probe.seen.length = 0
        Prefetching.probe.location = () => router.location().url
        yield* mountApp
        yield* TestHost.settle
        // A query the routes don't declare doesn't change the printed route.
        yield* router.intent("/people/1?unused=a")
        assert.deepStrictEqual(Prefetching.probe.seen, [])
        yield* router.intent("/people/2?unused=a")
        yield* router.intent("/people/2?unused=b")
        yield* router.intent("/people/2")
        assert.deepStrictEqual(Prefetching.probe.seen, ["/people/1"])
        // A push records its run under the printed route too.
        yield* router.navigate("/people/4?unused=a")
        yield* TestHost.settle
        yield* router.navigate("/")
        yield* TestHost.settle
        yield* router.intent("/people/4")
        assert.deepStrictEqual(Prefetching.probe.seen, ["/people/1", "/people/1"])
        yield* TestClock.adjust("30 seconds")
        yield* router.intent("/people/4?unused=b")
        assert.deepStrictEqual(Prefetching.probe.seen, ["/people/1", "/people/1", "/"])
      })
    ))

  it.effect("records watches only while a check after a push is outstanding", () =>
    prefetching(
      "/people/1",
      Effect.gen(function*() {
        const router = yield* Router.Router
        const testHost = yield* TestHost.TestHost
        const route = yield* Router.currentRoute(Routes)
        const root = yield* runtime.mount(Prefetching.App, { route }, testHost.host.createElement("#app"))
        const recorded = () => {
          const out: Array<string> = []
          const visit = (inst: runtime.Instance) => {
            if (inst.watched !== undefined) out.push(inst.path)
            for (const child of inst.children.values()) visit(child)
          }
          visit(root.instance)
          return out
        }
        yield* TestHost.settle
        assert.deepStrictEqual(recorded(), [])
        // The second push supersedes the first before it settles: both checks end.
        yield* router.navigate("/people/2")
        yield* router.navigate("/people/3")
        yield* TestHost.settle
        assert.deepStrictEqual(recorded(), [])
        assert.deepStrictEqual(tags(yield* TestHost.problems), [])
      })
    ))

  it.effect("runs the declaration on a quiet patchQuery push, and checks it when it settles", () =>
    prefetching(
      "/people/7",
      Effect.gen(function*() {
        const router = yield* Router.Router
        Prefetching.probe.seen.length = 0
        Prefetching.probe.location = () => router.location().url
        yield* mountApp
        yield* TestHost.settle
        const held = Routes.make({ _tag: "Person", params: { id: 7 } })
        // A replace stays on the page: no declaration runs.
        yield* router.patchQuery(held, { tab: "a" })
        yield* TestHost.settle
        assert.deepStrictEqual(Prefetching.probe.seen, [])
        yield* router.patchQuery(held, { tab: "b" }, { history: "push" })
        yield* Effect.exit(TestHost.settle)
        assert.deepStrictEqual(Prefetching.probe.seen, ["/people/7?tab=a"])
        const unwatched = yield* TestHost.expectProblem("PrefetchEntryNotWatched")
        assert.deepStrictEqual(
          unwatched.map((problem) => (problem as Router.PrefetchEntryNotWatched).logKey),
          ["{\"id\":70}"]
        )
      })
    ))

  it.effect("throws at subscriptions on a second Router.prefetch", () =>
    prefetching(
      "/",
      Effect.gen(function*() {
        const Twice = Component.make({
          name: "Twice",
          model: Schema.Struct({}),
          message: Schema.Never,
          init: () => ({}),
          update: (model) => model,
          subscriptions: () => [
            Router.prefetch(Routes.subset(["Home"]), { Home: () => [] }),
            Router.prefetch(Routes.subset(["Walk"]), { Walk: () => [] })
          ],
          view: (_, h) => h.el("p", "Twice")
        })
        yield* TestHost.mount(Twice, {})
        const error = yield* Effect.flip(TestHost.settle)
        assert.strictEqual(error._tag, "RootCrashed")
      })
    ))
})

describe("Router throttle", { concurrent: false }, () => {
  const Routes = Route.union({
    Search: Route.make("/search", { query: { q: Schema.optional(Schema.String) } }),
    Other: Route.make("/other")
  })

  /** A memory history that records every call the Router makes on it. */
  const recorded = (url: string, fails: (url: string) => boolean = () => false) => {
    const inner = Router.memoryHistory(url)
    const writes: Array<string> = []
    const history: Router.History = {
      ...inner,
      push: (url, state) => {
        writes.push(`push ${url}`)
        inner.push(url, state)
      },
      replace: (url, state) => {
        writes.push(`replace ${url}`)
        if (fails(url)) throw new Error("SecurityError")
        inner.replace(url, state)
      },
      go: (delta) => {
        writes.push(`go ${delta}`)
        inner.go(delta)
      },
      load: (href) => {
        writes.push(`load ${href}`)
        inner.load(href)
      }
    }
    return { inner, writes, history }
  }

  /** A Router throttling same-page replaces to one per 200 ms, with the flush it registers. */
  const throttled = (url: string, fails?: (url: string) => boolean) => {
    const { history, inner, writes } = recorded(url, fails)
    const flushes: Array<() => void> = []
    const cleanups: Array<string> = []
    const problems: Array<Loader.Problem.Any> = []
    const layer = Router.make({
      routes: Routes,
      history,
      throttle: {
        interval: "200 millis",
        flushOn: (flush) => {
          flushes.push(flush)
          return () => {
            cleanups.push("flushOn")
          }
        }
      }
    })
    const runIt = <A, E>(effect: Effect.Effect<A, E, Router.Services | Scope.Scope>) =>
      Effect.suspend(() => {
        // The Router's own initial write isn't part of the test.
        writes.length = 0
        return effect
      }).pipe(
        Effect.provide(layer),
        Effect.provideService(Loader.Problems, (problem) => {
          problems.push(problem)
        }),
        Effect.scoped
      )
    return { inner, writes, flushes, cleanups, problems, run: runIt }
  }

  const replaceQuery = (q: string) =>
    Router.Router.use((router) => router.navigate(`/search?q=${q}`, { replace: true }))

  it.effect("writes a same-page replace at once, then only the latest one per interval", () => {
    const t = throttled("/search")
    return t.run(Effect.gen(function*() {
      const router = yield* Router.Router
      yield* replaceQuery("a")
      yield* replaceQuery("ab")
      yield* replaceQuery("abc")
      // The Router moved at once; the history has the first write only.
      assert.strictEqual(router.location().url, "/search?q=abc")
      assert.deepStrictEqual(t.writes, ["replace /search?q=a"])
      yield* TestClock.adjust("199 millis")
      assert.deepStrictEqual(t.writes, ["replace /search?q=a"])
      yield* TestClock.adjust("1 millis")
      assert.deepStrictEqual(t.writes, ["replace /search?q=a", "replace /search?q=abc"])
      // The deferred write carries the entry's state.
      assert.deepStrictEqual(t.inner.current(), { url: "/search?q=abc", state: { "effect/ui": { index: 0 } } })
      // The write it made starts another interval.
      yield* replaceQuery("abcd")
      assert.strictEqual(t.writes.length, 2)
      yield* TestClock.adjust("200 millis")
      assert.deepStrictEqual(t.writes.slice(2), ["replace /search?q=abcd"])
      // Once an interval passes with nothing to write, the next write is immediate again.
      yield* TestClock.adjust("1 second")
      yield* replaceQuery("x")
      assert.deepStrictEqual(t.writes.slice(3), ["replace /search?q=x"])
      assert.deepStrictEqual(t.problems, [])
    }))
  })

  /** Each way the Router leaves or rewrites the entry, with the calls it makes after the pending write. */
  const flushes: ReadonlyArray<
    readonly [
      string,
      (t: ReturnType<typeof throttled>) => Effect.Effect<unknown, never, Router.Router>,
      ReadonlyArray<string>
    ]
  > = [
    ["a push", () => Router.Router.use((router) => router.navigate("/other")), [
      "replace /search?q=ab",
      "push /other"
    ]],
    [
      "a hash push",
      () => Router.Router.use((router) => router.navigate("/search?q=ab#x")),
      ["replace /search?q=ab", "push /search?q=ab#x"]
    ],
    [
      "a hash replace",
      () => Router.Router.use((router) => router.navigate("/search?q=ab#x", { replace: true })),
      ["replace /search?q=ab#x"]
    ],
    [
      "a replace to another page",
      () => Router.Router.use((router) => router.navigate("/other", { replace: true })),
      ["replace /other"]
    ],
    ["back", () => Router.Router.use((router) => router.back), [
      "replace /search?q=ab",
      "go -1"
    ]],
    ["forward", () => Router.Router.use((router) => router.forward), [
      "replace /search?q=ab",
      "go 1"
    ]],
    ["a load", () => Router.Router.use((router) => router.load("https://example.com/")), [
      "replace /search?q=ab",
      "load https://example.com/"
    ]],
    [
      "a navigation the routes don't parse",
      () => Router.Router.use((router) => router.navigate("/elsewhere")),
      ["replace /search?q=ab", "load /elsewhere"]
    ],
    ["the host's flush, as on pagehide", (t) => Effect.sync(() => t.flushes[0]!()), ["replace /search?q=ab"]]
  ]
  for (const [name, trigger, expected] of flushes) {
    it.effect(`writes the pending replace before ${name}, and never after`, () => {
      const t = throttled("/search")
      return t.run(Effect.gen(function*() {
        yield* replaceQuery("a")
        yield* replaceQuery("ab")
        yield* trigger(t)
        assert.deepStrictEqual(t.writes, ["replace /search?q=a", ...expected])
        yield* TestClock.adjust("1 second")
        assert.deepStrictEqual(t.writes, ["replace /search?q=a", ...expected])
      }))
    })
  }

  it.effect("drops the pending replace on a pop, which has already left its entry", () => {
    const t = throttled("/other")
    return t.run(Effect.gen(function*() {
      const router = yield* Router.Router
      yield* router.navigate("/search")
      yield* replaceQuery("a")
      yield* replaceQuery("ab")
      t.writes.length = 0
      // The back button: the history moves, then reports the entry it landed on.
      t.inner.go(-1)
      assert.strictEqual(router.location().url, "/other")
      yield* TestClock.adjust("1 second")
      assert.deepStrictEqual(t.writes, [])
      assert.deepStrictEqual(t.inner.entries(), ["/other", "/search?q=a"])
    }))
  })

  it.effect("keeps the pending replace across a blocked pop the Router reverts, and writes it to its own entry", () => {
    const t = throttled("/other")
    return t.run(Effect.gen(function*() {
      const router = yield* Router.Router
      yield* router.navigate("/search")
      yield* router.block("dirty")
      // A patch isn't blocked.
      const held = Routes.make({ _tag: "Search" })
      yield* router.patchQuery(held, { q: "a" })
      yield* router.patchQuery(held, { q: "ab" })
      t.writes.length = 0
      // The back button, while blocked: the Router moves the history forward again.
      t.inner.go(-1)
      assert.strictEqual(router.location().url, "/search?q=ab")
      yield* TestClock.adjust("200 millis")
      assert.deepStrictEqual(t.writes, ["go 1", "replace /search?q=ab"])
      assert.deepStrictEqual(t.inner.entries(), ["/other", "/search?q=ab"])
      assert.strictEqual(t.inner.current().url, "/search?q=ab")
    }))
  })

  it.effect("writes the pending replace when its Scope closes, and releases the host's flush", () => {
    const t = throttled("/search")
    return t.run(Effect.gen(function*() {
      yield* replaceQuery("a")
      yield* replaceQuery("ab")
    })).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          assert.deepStrictEqual(t.writes, ["replace /search?q=a", "replace /search?q=ab"])
          assert.deepStrictEqual(t.cleanups, ["flushOn"])
        })
      )
    )
  })

  it.effect("reports a same-page replace the history throws on, at once or deferred, and keeps the route", () => {
    const t = throttled("/search", (url) => url.includes("q=b"))
    return t.run(Effect.gen(function*() {
      const router = yield* Router.Router
      assert.strictEqual(yield* replaceQuery("b"), "navigated")
      assert.strictEqual(router.location().url, "/search?q=b")
      yield* replaceQuery("bc")
      yield* TestClock.adjust("200 millis")
      assert.deepStrictEqual(t.writes, ["replace /search?q=b", "replace /search?q=bc"])
      assert.deepStrictEqual(t.problems.map((problem) => [problem._tag, (problem as Router.HistoryWriteFailed).url]), [
        ["HistoryWriteFailed", "/search?q=b"],
        ["HistoryWriteFailed", "/search?q=bc"]
      ])
      assert.instanceOf(t.problems[0], Router.HistoryWriteFailed)
      assert.strictEqual(router.location().url, "/search?q=bc")
    }))
  })

  it.effect("reports a same-page replace the history throws on without a throttle", () => {
    const { history } = recorded("/search", (url) => url.includes("q="))
    const problems: Array<Loader.Problem.Any> = []
    return Effect.gen(function*() {
      const router = yield* Router.Router
      assert.strictEqual(yield* replaceQuery("a"), "navigated")
      assert.strictEqual(router.location().url, "/search?q=a")
      assert.deepStrictEqual(problems.map((problem) => problem._tag), ["HistoryWriteFailed"])
    }).pipe(
      Effect.provide(Router.make({ routes: Routes, history })),
      Effect.provideService(Loader.Problems, (problem) => {
        problems.push(problem)
      })
    )
  })

  it.effect("Router.memory writes every replace at once", () => {
    const history = Router.memoryHistory("/search")
    return Effect.gen(function*() {
      yield* replaceQuery("a")
      yield* replaceQuery("ab")
      assert.deepStrictEqual(history.entries(), ["/search?q=ab"])
      yield* replaceQuery("abc")
      assert.deepStrictEqual(history.entries(), ["/search?q=abc"])
    }).pipe(Effect.provide(Router.memory({ routes: Routes, history })))
  })
})
