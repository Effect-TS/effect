// @vitest-environment happy-dom
import { expect, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, Scope } from "effect"
import { TestClock } from "effect/testing"
import { Router } from "effect/ui"
import { BrowserHost, BrowserRouter } from "effect/ui/html"
import { HtmlQuery } from "effect/ui/html/testing"
import { describe } from "vitest"
import { App, AppRoute, People } from "./fixtures/routed.ts"

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
  const root = yield* Effect.flatMap(Router.current(AppRoute), (route) => BrowserHost.mount(App, { route }, app)).pipe(
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

describe("BrowserRouter", { concurrent: false }, () => {
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
