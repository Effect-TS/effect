/**
 * The browser's Router: `window.history` behind the `effect/ui` Router
 * contract, plus link interception, scroll, route-change announcements and
 * focus.
 *
 * **Details**
 *
 * Provide `layer` (or `layerHash`, for static hosting) next to the host. The
 * root holds the route: its props carry the initial one and
 * `Router.subscription` delivers each change as a message.
 *
 * Links are plain anchors with a printed route. A click is intercepted only
 * when the routes parse its href and it has no modifier key, `target` or
 * `download`. Anything else is a full page load. `<form method="get">` is
 * intercepted by the same test.
 *
 * Once a navigation settles (the first flush after the root received it in
 * which no Layer build begun since is still pending), the router scrolls,
 * announces the page in a live region and moves focus. A push goes to the top
 * or to its `#hash` element, and back and forward restore the saved position.
 *
 * **Example** (A two-page app)
 *
 * ```ts
 * import { BrowserHost, BrowserRouter, Html } from "effect/ui/html"
 * import { Effect, Schema } from "effect"
 * import { Component, Route, Router } from "effect/ui"
 *
 * const AppRoute = Route.union({
 *   Home: Route.make("/"),
 *   Person: Route.make("/people/:id", { params: { id: Schema.Number } }),
 *   NotFound: Route.make("/*")
 * })
 * type AppRoute = typeof AppRoute.Type
 *
 * const Message = Schema.TaggedUnion({ ChangedRoute: { route: AppRoute } })
 *
 * const App = Component.make({
 *   name: "App",
 *   props: Schema.Struct({ route: AppRoute }),
 *   model: AppRoute,
 *   message: Message,
 *   elements: Html,
 *   init: ($) => $.props.route,
 *   update: (route, message) => AppRoute.print(message.route) === AppRoute.print(route) ? route : message.route,
 *   subscriptions: () => [Router.subscription(AppRoute, (route) => Message.make({ _tag: "ChangedRoute", route }))],
 *   view: (route, h) =>
 *     h.div(
 *       h.a("Ada").attr("href", AppRoute.print(AppRoute.make({ _tag: "Person", params: { id: 1 } }))),
 *       h.h1(route._tag)
 *     )
 * })
 *
 * const main = Effect.gen(function*() {
 *   yield* BrowserHost.mount(App, { route: yield* Router.current(AppRoute) }, document.getElementById("app")!)
 *   return yield* Effect.never
 * }).pipe(
 *   Effect.scoped,
 *   Effect.provide(BrowserRouter.layer({ routes: AppRoute }))
 * )
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import type * as Route from "../Route.ts"
import * as Router from "../Router.ts"
import * as submit from "./internal/submit.ts"

/**
 * The options of `layer`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.3
 */
export interface Options {
  readonly routes: Route.AnyUnion
  /**
   * The base path the routes are relative to. A string is used as it is. A
   * function is given the first segment of the URL's path at startup and
   * says whether it's the base, as with an i18n prefix like `/en`.
   */
  readonly base?: string | ((segment: string) => boolean) | undefined
  /** Scroll to the top, a `#hash` or the saved position after a navigation. Defaults to `true`. */
  readonly scroll?: boolean | undefined
  /** Announce each navigation in a live region. Defaults to `true`. */
  readonly announce?: boolean | undefined
  /** Move focus after each navigation. Defaults to `true`. */
  readonly focus?: boolean | undefined
  /** The window to run in. Defaults to the global `window`. */
  readonly window?: Window | undefined
}

/**
 * The browser Router, with routes in the URL's path.
 *
 * **Details**
 *
 * There's one per document: building a second fails as a defect, and the
 * claim is released when the Layer's Scope closes.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const layer = (options: Options): Layer.Layer<Router.Services> => make(options, false)

/**
 * The browser Router for static hosting, with routes in the URL's fragment,
 * as `/#/people/1`.
 *
 * **Details**
 *
 * Parsing and printing work as with `layer`, with the base `"#"`. As the
 * fragment holds the route, there are no in-page `#hash` links.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const layerHash = (options: Omit<Options, "base">): Layer.Layer<Router.Services> => make(options, true)

const claimed = new WeakSet<Document>()

const make = (options: Options, inFragment: boolean): Layer.Layer<Router.Services> =>
  Layer.effectContext(Effect.gen(function*() {
    const window = options.window ?? globalThis.window
    const document = window.document
    if (claimed.has(document)) {
      return yield* Effect.die(new Error("BrowserRouter: this document already has a Router"))
    }
    claimed.add(document)
    yield* Effect.addFinalizer(() => Effect.sync(() => claimed.delete(document)))

    const { routes } = options
    const scroll = options.scroll !== false
    const announce = options.announce !== false
    const focus = options.focus !== false
    const location = window.location
    const history = window.history

    if (inFragment) routes.setBase("#")
    else if (typeof options.base === "string") routes.setBase(options.base)
    else if (options.base !== undefined) {
      const segment = location.pathname.split("/")[1] ?? ""
      routes.setBase(segment !== "" && options.base(segment) ? `/${segment}` : "")
    } else routes.setBase("")

    const currentUrl = () =>
      inFragment ? (location.hash === "" ? "#/" : location.hash) : location.pathname + location.search + location.hash

    // --- scroll ------------------------------------------------------------
    const positions = new Map<number, { readonly x: number; readonly y: number }>()
    if (scroll && "scrollRestoration" in history) {
      const previous = history.scrollRestoration
      history.scrollRestoration = "manual"
      yield* Effect.addFinalizer(() => Effect.sync(() => (history.scrollRestoration = previous)))
    }
    const target = (hash: string): HTMLElement | null => {
      if (hash.length <= 1) return null
      const id = decodeURIComponent(hash.slice(1))
      return document.getElementById(id) ?? document.getElementsByName(id)[0] as HTMLElement | undefined ?? null
    }
    const scrollTo = (hash: string) => {
      const element = target(hash)
      if (element !== null) element.scrollIntoView()
      else window.scrollTo(0, 0)
    }

    // --- announcements -----------------------------------------------------
    let region: HTMLElement | undefined
    if (announce) {
      const live = document.createElement("div")
      live.setAttribute("aria-live", "assertive")
      live.setAttribute("aria-atomic", "true")
      live.setAttribute(
        "style",
        "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0"
      )
      document.body.appendChild(live)
      region = live
      yield* Effect.addFinalizer(() => Effect.sync(() => live.remove()))
    }
    /** Runs `f` on the next frame, and returns a function that cancels it. */
    const nextFrame = (f: () => void): () => void => {
      if (typeof window.requestAnimationFrame === "function") {
        const id = window.requestAnimationFrame(f)
        return () => window.cancelAnimationFrame(id)
      }
      const id = setTimeout(f, 0)
      return () => clearTimeout(id)
    }
    let cancelAnnouncement: (() => void) | undefined
    yield* Effect.addFinalizer(() => Effect.sync(() => cancelAnnouncement?.()))

    // --- focus -------------------------------------------------------------
    const focusOn = (element: HTMLElement) => element.focus({ preventScroll: true })
    const resetFocus = () => {
      const body = document.body
      if (document.activeElement !== null && document.activeElement !== body) return
      const tabindex = body.getAttribute("tabindex")
      body.setAttribute("tabindex", "-1")
      focusOn(body)
      if (tabindex === null) body.removeAttribute("tabindex")
      else body.setAttribute("tabindex", tabindex)
    }

    const onSettled = (settled: Router.Settled) => {
      const { action, hash } = settled.location
      const container = settled.container as Element
      // Decided in the announcing flush, applied after scroll.
      const autofocus = focus ? container.querySelector<HTMLElement>("[autofocus]") : null
      const hashTarget = focus && action === "push" && !inFragment ? target(hash) : null
      if (scroll) {
        if (action === "pop") {
          const saved = positions.get(settled.index)
          window.scrollTo(saved?.x ?? 0, saved?.y ?? 0)
        } else scrollTo(inFragment ? "" : hash)
      }
      if (focus) {
        if (autofocus !== null) focusOn(autofocus)
        else if (hashTarget !== null) {
          if (hashTarget.tabIndex < 0 && !hashTarget.hasAttribute("tabindex")) hashTarget.setAttribute("tabindex", "-1")
          focusOn(hashTarget)
        } else resetFocus()
      }
      if (region !== undefined) {
        const live = region
        const text = (settled.head.title ?? "").trim() ||
          (container.querySelector("h1")?.textContent ?? "").trim() ||
          new URL(settled.location.url, location.href).pathname
        const seq = settled.location.seq
        live.textContent = ""
        cancelAnnouncement?.()
        cancelAnnouncement = nextFrame(() => {
          cancelAnnouncement = undefined
          // A navigation that started before the frame makes this one obsolete.
          if (router.location().seq === seq) live.textContent = text
        })
      }
    }

    // --- history -----------------------------------------------------------
    const browserHistory: Router.History = {
      current: () => ({ url: currentUrl(), state: history.state }),
      push: (url, state) => history.pushState(state, "", url),
      replace: (url, state) => history.replaceState(state, "", url),
      go: (delta) => history.go(delta),
      load: (href) => location.assign(href),
      listen: (popped) => {
        const f = () => popped(currentUrl(), history.state)
        window.addEventListener("popstate", f)
        return () => window.removeEventListener("popstate", f)
      }
    }

    const routerLayer = Router.make({
      routes,
      history: browserHistory,
      onSettled,
      onHash: (hash, action, index) => {
        if (!scroll) return
        const saved = action === "pop" ? positions.get(index) : undefined
        if (saved !== undefined) window.scrollTo(saved.x, saved.y)
        else scrollTo(hash)
      },
      onLeave: (index) => {
        positions.set(index, { x: window.scrollX, y: window.scrollY })
      }
    })
    const context = yield* Layer.build(routerLayer)
    const router = Context.get(context, Router.Router)

    // --- interception ------------------------------------------------------
    /** The href the routes see for an absolute URL, or undefined when it leaves this app. */
    const local = (url: URL): string | undefined => {
      if (url.origin !== location.origin) return undefined
      if (!inFragment) return url.pathname + url.search + url.hash
      return url.pathname === location.pathname && url.search === location.search && url.hash !== ""
        ? url.hash
        : undefined
    }
    const follow = (event: Event, href: string | undefined) => {
      if (href === undefined || Option.isNone(routes.parse(href))) return
      event.preventDefault()
      Effect.runSync(router.navigate(href))
    }
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.composedPath().find((node): node is Element =>
        "localName" in node && (node as Element).localName === "a" && (node as Element).hasAttribute("href")
      )
      if (anchor === undefined) return
      const targetAttribute = anchor.getAttribute("target")
      if (
        (targetAttribute !== null && targetAttribute !== "" && targetAttribute !== "_self") ||
        anchor.hasAttribute("download")
      ) return
      const rawHref = anchor.getAttribute("href")!
      follow(event, local(new URL(rawHref, document.baseURI)))
    }
    const onSubmit = (event: SubmitEvent) => {
      // BrowserHost prevents every submission of a form the app rendered. If the app has no
      // submit handler for it, the form is still the Router's to follow.
      const ownedUnhandled = submit.ownedUnhandled.has(event)
      if (event.defaultPrevented && !ownedUnhandled) return
      const form = event.target as HTMLFormElement | null
      if (form === null || form.localName !== "form") return
      const submitter = event.submitter as HTMLButtonElement | null
      const method = (submitter?.getAttribute("formmethod") ?? form.getAttribute("method") ?? "get").toLowerCase()
      const targetAttribute = submitter?.getAttribute("formtarget") ?? form.getAttribute("target")
      if (method !== "get" || (targetAttribute !== null && targetAttribute !== "" && targetAttribute !== "_self")) {
        return
      }
      const action = submitter?.getAttribute("formaction") ?? form.getAttribute("action") ?? ""
      const url = new URL(action, document.baseURI)
      const data = new FormData(form, submitter ?? undefined)
      const query = new URLSearchParams()
      for (const [name, value] of data) if (typeof value === "string") query.append(name, value)
      url.search = query.toString()
      url.hash = ""
      const href = local(url)
      // The host already stopped the browser's submission, so the Router makes it: a full page
      // load for anything the routes don't parse.
      if (ownedUnhandled) Effect.runSync(href !== undefined ? router.navigate(href) : router.load(url.href))
      else follow(event, href)
    }
    document.addEventListener("click", onClick)
    document.addEventListener("submit", onSubmit)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        document.removeEventListener("click", onClick)
        document.removeEventListener("submit", onSubmit)
      })
    )
    return context
  }))
