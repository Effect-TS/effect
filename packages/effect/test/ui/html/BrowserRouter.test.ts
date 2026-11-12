// @vitest-environment happy-dom
import { assert, expect, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, Schema, Scope } from "effect"
import { Loader } from "effect/reactivity"
import { TestClock } from "effect/testing"
import { Command, Component, Route, Router } from "effect/ui"
import { BrowserHost, BrowserRouter, Html, HtmlServer } from "effect/ui/html"
import { HtmlQuery } from "effect/ui/html/testing"
import { describe } from "vitest"
import { App, AppRoute, People } from "./fixtures/routed.ts"

const SearchRoute = Route.union({
  Search: Route.make("/search", { query: { q: Schema.optional(Schema.String) } }),
  Other: Route.make("/other")
})

/** A root that holds a route with an optional query. */
const SearchApp = Component.make({
  name: "SearchApp",
  props: Schema.Struct({ route: SearchRoute }),
  model: SearchRoute,
  message: SearchRoute,
  elements: Html,
  init: ($) => $.props.route,
  update: (_, route) => route,
  subscriptions: (route) => [Router.subscription(SearchRoute, route, (next) => next)],
  view: (route, h) => h.h1(SearchRoute.print(route))
})

const ListRoute = Route.union({
  List: Route.make("/list", {
    query: {
      q: Schema.optional(Schema.String),
      page: Schema.Number.pipe(Schema.withDecodingDefaultKey(Effect.succeed(1)))
    }
  }),
  Other: Route.make("/other")
})
const ListOnly = ListRoute.subset(["List"])

const ListMessage = Schema.TaggedUnion({ Typed: { value: Schema.String }, Next: {}, Patched: {} })
const patched = Command.map(() => ListMessage.make({ _tag: "Patched" }))

/** A page whose search text and page number live in the query only. */
const ListPage = Component.make({
  name: "ListPage",
  props: Schema.Struct({ route: ListOnly }),
  model: Schema.Struct({}),
  message: ListMessage,
  elements: Html,
  init: () => ({}),
  update: (model, message, $) =>
    ListMessage.match(message, {
      Typed: ({ value }) => $.run(Router.patchQuery(ListRoute, $.props.route, { q: value || undefined }).pipe(patched)),
      Next: () =>
        $.run(
          Router.patchQuery(ListRoute, $.props.route, { page: $.props.route.query.page + 1 }, {
            history: "push",
            scroll: true
          }).pipe(patched)
        ),
      Patched: () => model
    }),
  view: (_, h) =>
    h.div(
      h.h1(`List page ${h.props.route.query.page}`),
      h.input().attr("aria-label", "Search").value(h.props.route.query.q ?? "").onInput(({ value }) =>
        ListMessage.make({ _tag: "Typed", value })
      ),
      h.button("Next").onClick(ListMessage.make({ _tag: "Next" })),
      h.a("Page 2").attr("href", ListRoute.print(ListRoute.make({ _tag: "List", query: { page: 2 } }))),
      h.a("Results").attr("href", "#results")
    )
})

/** Holds the route, and keys the list page by its path. */
const ListApp = Component.make({
  name: "ListApp",
  props: Schema.Struct({ route: ListRoute }),
  model: ListRoute,
  message: ListRoute,
  elements: Html,
  init: ($) => $.props.route,
  update: (_, route) => route,
  subscriptions: (route) => [Router.subscription(ListRoute, route, (next) => next)],
  view: (route, h) =>
    ListRoute.match(route, {
      List: (route) => h.child(ListPage, { key: ListRoute.printPath(route), props: { route } }),
      Other: () => h.h1("Other")
    })
})

/** Lets popstate, the render flush, Commands and the announcement frame run. */
const tick = Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 30)))

const container = Effect.acquireRelease(
  Effect.sync(() => document.body.appendChild(document.createElement("div"))),
  (element) => Effect.sync(() => element.remove())
)

/** Mounts the app at `url` under a browser Router, for the life of the returned Scope. */
const start = Effect.fnUntraced(function*(url: string, options?: Partial<BrowserRouter.Options>) {
  window.history.replaceState(null, "", url)
  const app = yield* container
  const context = yield* Layer.build(BrowserRouter.layer({ routes: AppRoute, ...options }))
  const router = Context.get(context, Router.Router)
  const root = yield* Effect.flatMap(
    Router.currentRoute(AppRoute),
    (route) => BrowserHost.mountEffect(App, { route }, app)
  )
    .pipe(
      Effect.provide(People.layer),
      Effect.provideContext(context)
    )
  yield* tick
  return { app, root, router }
})

/** The global window, with animation frames that only run when `run` is called. */
const manualFrames = () => {
  const frames = new Map<number, FrameRequestCallback>()
  let next = 0
  const proxy = new Proxy(window, {
    get(target, key) {
      if (key === "requestAnimationFrame") {
        return (f: FrameRequestCallback) => {
          frames.set(++next, f)
          return next
        }
      }
      if (key === "cancelAnimationFrame") return (id: number) => frames.delete(id)
      const value = Reflect.get(target, key)
      return typeof value === "function" ? value.bind(target) : value
    }
  })
  const run = () => {
    const due = [...frames.values()]
    frames.clear()
    for (const f of due) f(0)
  }
  return { window: proxy as Window, run }
}

const link = (app: Element, name: string) => HtmlQuery.getByRole(app, "link", { name })
const region = () => document.querySelector("[aria-live=assertive]")
const description = () => document.head.querySelector("meta[name=description]")?.getAttribute("content")

/** Clicks `element`, reporting whether something prevented the browser's default. The default never runs. */
const clickReporting = (element: Element, init?: MouseEventInit) => {
  let prevented = false
  const record = (event: Event) => {
    prevented = event.defaultPrevented
    event.preventDefault()
  }
  window.addEventListener("click", record)
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init }))
  window.removeEventListener("click", record)
  return prevented
}

const homeRoute = AppRoute.make({ _tag: "Home" })

/** Prerenders `component` at Home as a hash-routing shell. The `#` base lasts for the Scope. */
const hashShell = Effect.fnUntraced(function*(component: typeof App) {
  AppRoute.setBase("#")
  yield* Effect.addFinalizer(() => Effect.sync(() => AppRoute.setBase("")))
  return yield* HtmlServer.renderToHtml(component, { route: homeRoute }, { static: true }).pipe(
    Effect.provide(Router.static({ routes: AppRoute, url: "#/" }))
  )
})

/** The hash Router, with the browser at the deep link `/#/people/1`. */
const hashRouter = Effect.suspend(() => {
  window.history.replaceState(null, "", "/#/people/1")
  return Layer.build(BrowserRouter.layerHash({ routes: AppRoute }))
})

describe("BrowserRouter", { concurrent: false }, () => {
  it.effect("hydrates a server render when both sides take their props from their own Router", () => {
    const problems: Array<Loader.Problem.Any> = []
    return Effect.gen(function*() {
      const rendered = yield* HtmlServer.renderToHtml(App, Router.props(AppRoute)).pipe(
        Effect.provide([People.layer, Router.static({ routes: AppRoute, url: "/people/1" })])
      )
      window.history.replaceState(null, "", "/people/1")
      const app = yield* container
      app.innerHTML = rendered.html
      const heading = app.querySelector("h1")
      yield* Layer.build(
        BrowserHost.mount(App, Router.props(AppRoute), app, { state: rendered.state }).pipe(
          Layer.provide([BrowserRouter.layer({ routes: AppRoute }), People.layer])
        )
      )
      yield* tick
      assert.strictEqual(app.querySelector("h1"), heading)
      assert.strictEqual(heading?.textContent, "Person 1")
      assert.deepStrictEqual(problems, [])
    }).pipe(Effect.provideService(Loader.Problems, (problem) => problems.push(problem)))
  })

  it.effect("exempts hydrated hash roots, but checks client-only hash roots", () => {
    const problems: Array<Loader.Problem.Any> = []
    return Effect.gen(function*() {
      const rendered = yield* hashShell(App)
      const context = yield* hashRouter
      const hydratedContainer = yield* container
      hydratedContainer.innerHTML = rendered.html
      const home = hydratedContainer.querySelector("h1")
      const hydrated = yield* Effect.flatMap(
        Router.currentRoute(AppRoute),
        (route) => BrowserHost.mountEffect(App, { route }, hydratedContainer, { state: rendered.state })
      ).pipe(Effect.provideContext(context))
      assert.strictEqual(hydratedContainer.querySelector("h1"), home)
      yield* tick
      assert.strictEqual(hydrated.model()?.route._tag, "Person")
      assert.deepStrictEqual(problems, [])
      const clientContainer = yield* container
      const client = yield* BrowserHost.mountEffect(App, { route: homeRoute }, clientContainer).pipe(
        Effect.provideContext(context)
      )
      yield* tick
      assert.strictEqual(client.model()?.route._tag, "Person")
      assert.strictEqual(problems.length, 1)
      assert.strictEqual(problems[0]._tag, "RouteMismatch")
    }).pipe(Effect.provide(People.layer), Effect.provideService(Loader.Problems, (problem) => problems.push(problem)))
  })

  it.effect("exempts roots hydrated from a static render when only the query differs", () => {
    const problems: Array<Loader.Problem.Any> = []
    const search = SearchRoute.make({ _tag: "Search", query: {} })
    const prerender = (url: string, route: typeof SearchRoute.Type, isStatic: boolean) =>
      HtmlServer.renderToHtml(SearchApp, { route }, { static: isStatic }).pipe(
        Effect.provide(Router.static({ routes: SearchRoute, url }))
      )
    const hydrate = Effect.fnUntraced(function*(
      context: Context.Context<Router.Services>,
      rendered: HtmlServer.Rendered<unknown>
    ) {
      const element = yield* container
      element.innerHTML = rendered.html
      const root = yield* Effect.flatMap(
        Router.currentRoute(SearchRoute),
        (route) => BrowserHost.mountEffect(SearchApp, { route }, element, { state: rendered.state })
      ).pipe(Effect.provideContext(context))
      yield* tick
      return root
    })
    const mismatches = () => problems.filter((problem) => problem._tag === "RouteMismatch").length
    return Effect.gen(function*() {
      const prerendered = yield* prerender("/search", search, true)
      const dynamic = yield* prerender("/search", search, false)
      const other = yield* prerender("/other", SearchRoute.make({ _tag: "Other" }), true)
      window.history.replaceState(null, "", "/search?q=x")
      const context = yield* Layer.build(BrowserRouter.layer({ routes: SearchRoute }))

      // Static, query only: no report, and the route is delivered.
      const root = yield* hydrate(context, prerendered)
      assert.deepStrictEqual(root.model(), SearchRoute.make({ _tag: "Search", query: { q: "x" } }))
      assert.strictEqual(mismatches(), 0)

      // A dynamic render with another query is the bug the check exists for.
      const fromDynamic = yield* hydrate(context, dynamic)
      assert.deepStrictEqual(fromDynamic.model(), SearchRoute.make({ _tag: "Search", query: { q: "x" } }))
      assert.strictEqual(mismatches(), 1)

      // A static render of another path still reports.
      const fromOther = yield* hydrate(context, other)
      assert.deepStrictEqual(fromOther.model(), SearchRoute.make({ _tag: "Search", query: { q: "x" } }))
      assert.strictEqual(mismatches(), 2)
    }).pipe(Effect.provideService(Loader.Problems, (problem) => problems.push(problem)))
  })

  it.effect("checks hash roots that cannot adopt a server Model", () => {
    const problems: Array<Loader.Problem.Any> = []
    return Effect.gen(function*() {
      const Deferred = App.pipe(Component.provide(People.layer, { server: false }))
      const deferred = yield* hashShell(Deferred)
      const rendered = yield* hashShell(App)
      const context = yield* hashRouter
      for (
        const [component, state] of [
          [Deferred, deferred.state],
          [App, {}],
          [App, { ...rendered.state, "/App": null }]
        ] as const
      ) {
        const element = yield* container
        const root = yield* BrowserHost.mountEffect(component, { route: homeRoute }, element, { state }).pipe(
          Effect.provideContext(context)
        )
        yield* tick
        assert.strictEqual(root.model()?.route._tag, "Person")
        assert.strictEqual(problems.filter((problem) => problem._tag === "RouteMismatch").length, 1)
        problems.length = 0
      }
    }).pipe(Effect.provide(People.layer), Effect.provideService(Loader.Problems, (problem) => problems.push(problem)))
  })

  it.effect("navigates by link, back and forward, and the head and announcement follow", () =>
    Effect.gen(function*() {
      const { app, root } = yield* start("/")
      expect(document.title).toBe("Home · App")
      expect(document.documentElement.getAttribute("lang")).toBe("en")
      expect(document.documentElement.getAttribute("data-eui")).toBe("lang class")
      expect(description()).toBe("Home page")
      // Nothing is announced on first load.
      expect(region()?.textContent).toBe("")

      expect(clickReporting(link(app, "Person 1"))).toBe(true)
      yield* tick
      expect(window.location.pathname).toBe("/people/1")
      expect(root.model()?.route._tag).toBe("Person")
      expect(HtmlQuery.getByRole(app, "heading").textContent).toBe("Person 1")
      expect(document.title).toBe("Person 1 · App")
      expect(description()).toBe("About person 1")
      expect(document.head.querySelector("script[type='application/ld+json'][data-eui]")?.textContent).toBe(
        "{\"@type\":\"Person\",\"identifier\":1}"
      )
      expect(region()?.textContent).toBe("Person 1 · App")

      window.history.back()
      yield* tick
      expect(window.location.pathname).toBe("/")
      expect(document.title).toBe("Home · App")
      expect(description()).toBe("Home page")
      expect(document.head.querySelector("script[type='application/ld+json']")).toBeNull()
      expect(region()?.textContent).toBe("Home · App")

      window.history.forward()
      yield* tick
      expect(window.location.pathname).toBe("/people/1")
      expect(document.title).toBe("Person 1 · App")
    }).pipe(Effect.scoped))

  it.effect("leaves modified clicks, targets, downloads and other origins to the browser", () =>
    Effect.gen(function*() {
      const { app } = yield* start("/")
      const person = link(app, "Person 1")
      expect(clickReporting(person, { ctrlKey: true })).toBe(false)
      expect(clickReporting(person, { metaKey: true })).toBe(false)
      person.setAttribute("target", "_blank")
      expect(clickReporting(person)).toBe(false)
      person.removeAttribute("target")
      person.setAttribute("download", "")
      expect(clickReporting(person)).toBe(false)
      person.removeAttribute("download")
      expect(clickReporting(link(app, "Elsewhere"))).toBe(false)
      yield* tick
      expect(window.location.pathname).toBe("/")
    }).pipe(Effect.scoped))

  it.effect("reports link intent after 50 ms of hover or focus, at once on touch, for the links a click follows", () =>
    Effect.gen(function*() {
      const { app, router } = yield* start("/")
      const intents: Array<string> = []
      const intent = router.intent
      ;(router as { intent: Router.Router["intent"] }).intent = (href) => {
        intents.push(href)
        return intent(href)
      }
      const person = link(app, "Person 1")
      const inner = person.appendChild(document.createElement("span"))
      const fire = (target: Element, type: string, relatedTarget: Element | null = null) =>
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget }))
      // Hover: 50 ms on the Clock. Moving onto an element inside the anchor neither cancels nor restarts.
      fire(person, "mouseover")
      yield* TestClock.adjust("30 millis")
      fire(person, "mouseout", inner)
      fire(inner, "mouseover", person)
      yield* TestClock.adjust("19 millis")
      expect(intents).toEqual([])
      yield* TestClock.adjust("1 millis")
      expect(intents).toEqual(["/people/1"])
      // Leaving the anchor cancels the wait.
      fire(inner, "mouseout", document.body)
      fire(link(app, "Slow"), "mouseover")
      fire(link(app, "Slow"), "mouseout", document.body)
      yield* TestClock.adjust("1 second")
      expect(intents).toEqual(["/people/1"])
      // Focus waits too, and touch doesn't.
      link(app, "Slow").dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
      yield* TestClock.adjust("50 millis")
      link(app, "Home").dispatchEvent(new Event("touchstart", { bubbles: true }))
      expect(intents).toEqual(["/people/1", "/slow", "/"])
      // The links a click leaves to the browser show no intent.
      person.setAttribute("target", "_blank")
      person.dispatchEvent(new Event("touchstart", { bubbles: true }))
      person.removeAttribute("target")
      person.setAttribute("download", "")
      person.dispatchEvent(new Event("touchstart", { bubbles: true }))
      person.removeAttribute("download")
      link(app, "Elsewhere").dispatchEvent(new Event("touchstart", { bubbles: true }))
      expect(intents).toEqual(["/people/1", "/slow", "/"])
    }).pipe(Effect.scoped))

  it.effect("follows a GET form the app has no submit handler for, and leaves a handled one alone", () =>
    Effect.gen(function*() {
      const { app, root } = yield* start("/")
      const submitForm = (name: string) =>
        HtmlQuery.getByRole(app, "form", { name }).dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        )
      submitForm("Filter")
      yield* tick
      expect(window.location.pathname).toBe("/")
      submitForm("Search")
      yield* tick
      expect(window.location.pathname + window.location.search).toBe("/search?q=ada")
      expect(root.model()?.route._tag).toBe("Search")
      expect(HtmlQuery.getByRole(app, "heading").textContent).toBe("Search ada")
    }).pipe(Effect.scoped))

  it.effect("doesn't announce a navigation a newer one replaced before its frame", () =>
    Effect.gen(function*() {
      const frames = manualFrames()
      const { app } = yield* start("/", { window: frames.window })
      clickReporting(link(app, "Person 1"))
      yield* tick
      // Person 1 settled and cleared the region; its text waits for the next frame.
      expect(region()?.textContent).toBe("")
      clickReporting(link(app, "Slow"))
      yield* tick
      frames.run()
      expect(region()?.textContent).toBe("")
      yield* TestClock.adjust("1 second")
      yield* tick
      frames.run()
      expect(region()?.textContent).toBe("Slow · App")
    }).pipe(Effect.scoped))

  it.effect("restores the scroll position on back and forward between #hash entries", () =>
    Effect.gen(function*() {
      const { app, router } = yield* start("/")
      clickReporting(link(app, "Person 2 bio"))
      yield* tick
      window.scrollTo(0, 100)
      yield* router.navigate("/people/2#top")
      yield* tick
      window.scrollTo(0, 40)
      const announced = region()?.textContent

      window.history.back()
      yield* tick
      expect(window.location.hash).toBe("#bio")
      expect(window.scrollY).toBe(100)
      window.history.forward()
      yield* tick
      expect(window.location.hash).toBe("#top")
      expect(window.scrollY).toBe(40)
      // A #hash change sends no route change and announces nothing.
      expect(region()?.textContent).toBe(announced)
    }).pipe(Effect.scoped))

  it.effect("goes to a link's #hash and moves focus there", () =>
    Effect.gen(function*() {
      const { app } = yield* start("/")
      clickReporting(link(app, "Person 2 bio"))
      yield* tick
      expect(window.location.pathname + window.location.hash).toBe("/people/2#bio")
      const bio = document.getElementById("bio")!
      expect(document.activeElement).toBe(bio)
      expect(bio.getAttribute("tabindex")).toBe("-1")
    }).pipe(Effect.scoped))

  it.effect("ignores links and reverts back and forward while blocked", () =>
    Effect.gen(function*() {
      const { app, root } = yield* start("/")
      clickReporting(link(app, "Person 1"))
      yield* tick
      HtmlQuery.click(HtmlQuery.getByRole(app, "button", { name: "Block" }))
      yield* tick
      region()!.textContent = ""

      expect(clickReporting(link(app, "Home"))).toBe(true)
      yield* tick
      expect(window.location.pathname).toBe("/people/1")

      window.history.back()
      yield* tick
      yield* tick
      expect(window.location.pathname).toBe("/people/1")
      expect(root.model()?.route._tag).toBe("Person")
      expect(region()?.textContent).toBe("")
    }).pipe(Effect.scoped))

  it.effect("puts the shell's title back and removes the region when it closes", () =>
    Effect.gen(function*() {
      document.title = "Shell"
      const scope = yield* Scope.make()
      yield* start("/").pipe(Scope.provide(scope))
      expect(document.title).toBe("Home · App")
      expect(region()).not.toBeNull()
      yield* Scope.close(scope, Exit.void)
      yield* tick
      expect(region()).toBeNull()
      expect(document.title).toBe("Shell")
      expect(document.documentElement.hasAttribute("lang")).toBe(false)
      expect(document.documentElement.hasAttribute("data-eui")).toBe(false)
      expect(document.documentElement.classList.contains("routed")).toBe(false)
      expect(document.head.querySelector("[data-eui]")).toBeNull()
    }))

  it.effect("allows one Router per document", () =>
    Effect.gen(function*() {
      yield* Layer.build(BrowserRouter.layer({ routes: AppRoute }))
      const second = yield* Effect.exit(Layer.build(BrowserRouter.layer({ routes: AppRoute })))
      expect(Exit.isFailure(second)).toBe(true)
    }).pipe(Effect.scoped))

  describe("quiet navigations", () => {
    /** Mounts the list app at `url`, with a marker in the live region that only a loud navigation clears. */
    const startList = Effect.fnUntraced(function*(url: string) {
      window.history.replaceState(null, "", url)
      const app = yield* container
      const context = yield* Layer.build(BrowserRouter.layer({ routes: ListRoute }))
      yield* Effect.flatMap(Router.currentRoute(ListRoute), (route) => BrowserHost.mountEffect(ListApp, { route }, app))
        .pipe(Effect.provideContext(context))
      yield* tick
      region()!.textContent = "marker"
      const field = HtmlQuery.getByRole(app, "textbox", { name: "Search" }) as HTMLInputElement
      return { app, field }
    })
    const url = () => window.location.pathname + window.location.search

    it.effect("a query patch announces nothing and leaves focus and scroll alone", () =>
      Effect.gen(function*() {
        const { field } = yield* startList("/list?utm_source=news")
        window.scrollTo(0, 50)
        field.focus()
        HtmlQuery.input(field, "ab")
        yield* tick
        expect(url()).toBe("/list?q=ab&utm_source=news")
        expect(document.activeElement).toBe(field)
        expect(window.scrollY).toBe(50)
        expect(region()?.textContent).toBe("marker")
      }).pipe(Effect.scoped))

    it.effect("a quiet push scrolls to the top when asked, and back restores the position, both quietly", () =>
      Effect.gen(function*() {
        const { app, field } = yield* startList("/list")
        const next = HtmlQuery.getByRole(app, "button", { name: "Next" })
        window.scrollTo(0, 80)
        next.focus()
        HtmlQuery.click(next)
        yield* tick
        expect(url()).toBe("/list?page=2")
        expect(HtmlQuery.getByRole(app, "heading").textContent).toBe("List page 2")
        expect(window.scrollY).toBe(0)
        expect(document.activeElement).toBe(next)
        window.scrollTo(0, 30)
        window.history.back()
        yield* tick
        expect(url()).toBe("/list")
        expect(HtmlQuery.getByRole(app, "heading").textContent).toBe("List page 1")
        expect(window.scrollY).toBe(80)
        expect(document.activeElement).toBe(next)
        expect(region()?.textContent).toBe("marker")
        // The page keyed by its path stayed mounted.
        expect(HtmlQuery.getByRole(app, "textbox", { name: "Search" })).toBe(field)
      }).pipe(Effect.scoped))

    it.effect("throttles the query writes of typing to one per 200 ms, writing the latest", () =>
      Effect.gen(function*() {
        const { app, field } = yield* startList("/list")
        for (const value of ["a", "ab", "abc"]) {
          HtmlQuery.input(field, value)
          yield* tick
        }
        // The page shows the latest query at once; the address bar has the first.
        expect(url()).toBe("/list?q=a")
        expect((HtmlQuery.getByRole(app, "textbox", { name: "Search" }) as HTMLInputElement).value).toBe("abc")
        yield* TestClock.adjust("199 millis")
        expect(url()).toBe("/list?q=a")
        yield* TestClock.adjust("1 millis")
        expect(url()).toBe("/list?q=abc")
      }).pipe(Effect.scoped))

    it.effect("writes the pending query on pagehide, and stops listening when its Scope closes", () =>
      Effect.gen(function*() {
        const listening = new Set<unknown>()
        const recording = new Proxy(window, {
          get(target, key) {
            if (key === "addEventListener") {
              return (type: string, f: EventListener, options?: unknown) => {
                if (type === "pagehide") listening.add(f)
                target.addEventListener(type, f, options as AddEventListenerOptions)
              }
            }
            if (key === "removeEventListener") {
              return (type: string, f: EventListener, options?: unknown) => {
                if (type === "pagehide") listening.delete(f)
                target.removeEventListener(type, f, options as EventListenerOptions)
              }
            }
            const value = Reflect.get(target, key)
            return typeof value === "function" ? value.bind(target) : value
          }
        }) as Window
        window.history.replaceState(null, "", "/list")
        yield* Effect.gen(function*() {
          const context = yield* Layer.build(BrowserRouter.layer({ routes: ListRoute, window: recording }))
          const router = Context.get(context, Router.Router)
          const held = ListOnly.make({ _tag: "List" })
          yield* router.patchQuery(held, { q: "a" })
          yield* router.patchQuery(held, { q: "ab" })
          expect(url()).toBe("/list?q=a")
          expect(listening.size).toBe(1)
          window.dispatchEvent(new Event("pagehide"))
          expect(url()).toBe("/list?q=ab")
        }).pipe(Effect.scoped)
        expect(listening.size).toBe(0)
      }))

    it.effect("writes the pending query before following an in-page #hash link", () =>
      Effect.gen(function*() {
        const { app, field } = yield* startList("/list")
        HtmlQuery.input(field, "a")
        yield* tick
        HtmlQuery.input(field, "ab")
        yield* tick
        expect(url()).toBe("/list?q=a")
        // The link resolves against the document's URL, which must be the Router's.
        expect(clickReporting(link(app, "Results"))).toBe(true)
        yield* tick
        expect(url() + window.location.hash).toBe("/list?q=ab#results")
        expect((HtmlQuery.getByRole(app, "textbox", { name: "Search" }) as HTMLInputElement).value).toBe("ab")
      }).pipe(Effect.scoped))

    it.effect("a link to its own page's query is loud", () =>
      Effect.gen(function*() {
        const { app } = yield* startList("/list")
        window.scrollTo(0, 80)
        expect(clickReporting(link(app, "Page 2"))).toBe(true)
        yield* tick
        expect(url()).toBe("/list?page=2")
        expect(window.scrollY).toBe(0)
        expect(region()?.textContent).toBe("List page 2")
      }).pipe(Effect.scoped))
  })

  it.effect("keeps the route in the fragment with layerHash", () =>
    Effect.gen(function*() {
      window.history.replaceState(null, "", "/")
      const context = yield* Layer.build(BrowserRouter.layerHash({ routes: AppRoute }))
      const router = Context.get(context, Router.Router)
      expect(window.location.hash).toBe("#/")
      expect(router.location().route._tag).toBe("Home")
      expect(yield* router.push(AppRoute.make({ _tag: "Person", params: { id: 3 } }))).toBe("navigated")
      expect(window.location.pathname + window.location.hash).toBe("/#/people/3")
      expect(Option.getOrThrow(AppRoute.parse("#/people/3"))._tag).toBe("Person")
    }).pipe(Effect.scoped, Effect.ensuring(Effect.sync(() => AppRoute.setBase("")))))
})
