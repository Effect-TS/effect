import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, type Layer, Option, Schema, type Scope, Stream } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Component, Head, type MessageLog, type Renderer, Route, Router } from "effect/ui"
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

  it.effect("removes query params dropped as invalid from the URL, keeping the others", () => {
    const routes = Route.union({ Search: Route.make("/", { query: { page: Schema.optional(Schema.Number) } }) })
    const history = Router.memoryHistory("/?utm=x&page=abc")
    return Effect.gen(function*() {
      const router = yield* Router.Router
      assert.deepStrictEqual(history.entries(), ["/?utm=x"])
      yield* router.navigate("/?page=x&utm=y")
      assert.deepStrictEqual(history.entries(), ["/?utm=x", "/?utm=y"])
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
