/**
 * Server rendering for `effect/ui`: renders a component tree to HTML that
 * `BrowserHost.mount` hydrates.
 *
 * `renderToHtml` builds provided Layers and fetches loader data once per key
 * in a per-request cache. Rendering waits until nothing is in flight or the
 * `budget` is spent, then serialises once. No Command runs on the server.
 * Only loader-watch Subscriptions run; other Subscriptions and `onMount`
 * work wait for the client.
 *
 * The result holds the body markup, the `state` the client adopts, with the
 * loader entries that settled, the root's Model (for the response status),
 * and the document head as escaped strings. The page puts them together;
 * `serializeState` makes the state safe to embed in a `<script>`.
 *
 * Set the budget to what your page's data needs, or 0 for no waiting. A
 * budget miss renders the loading Model, with its title, and the client
 * fetches what missed it.
 *
 * **Example** (Rendering a page)
 *
 * ```ts
 * import { HtmlServer } from "effect/ui/html"
 * import { Effect, Schema } from "effect"
 * import { Component, Head } from "effect/ui"
 *
 * const App = Component.make({
 *   name: "App",
 *   model: Schema.Struct({}),
 *   message: Schema.Never,
 *   init: () => ({}),
 *   update: (model) => model,
 *   head: () => [Head.title("Home"), Head.lang("en")],
 *   view: (_, h) => h.el("h1", "Home")
 * })
 *
 * const page = Effect.gen(function*() {
 *   const { bodyAttributes, head, html, htmlAttributes, state } = yield* HtmlServer.renderToHtml(App, {})
 *   return `<!doctype html>
 * <html ${htmlAttributes}>
 *   <head><meta charset="utf-8">${head}</head>
 *   <body ${bodyAttributes}>
 *     <div id="app">${html}</div>
 *     <script type="application/json" id="state">${HtmlServer.serializeState(state)}</script>
 *   </body>
 * </html>`
 * })
 * ```
 *
 * On the client, mount the same component with the same props and the parsed
 * state: `BrowserHost.mount(App, {}, container, { state })`, or
 * `BrowserHost.mountEffect` to wait for `root.adopted`.
 *
 * A routed app served through `HttpRouter` uses `layerHttp` instead: it
 * resolves each request's URL, answers 404s and redirects, and renders the
 * page with `Router.props(routes)` as the props.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Context from "../../Context.ts"
import type * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as HttpRouter from "../../http/HttpRouter.ts"
import * as HttpServerResponse from "../../http/HttpServerResponse.ts"
import type * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as Scope from "../../Scope.ts"
import type * as Component from "../Component.ts"
import * as Renderer from "../Renderer.ts"
import * as Router from "../Router.ts"
import type * as View from "../View.ts"
import type * as BrowserHost from "./BrowserHost.ts"
import * as Html from "./Html.ts"
import * as server from "./internal/server.ts"

/**
 * What `renderToHtml` returns.
 *
 * **Details**
 *
 * `html` is the body markup for the app's container. `state` maps each
 * instance's path to its Schema-encoded Model, plus `~deferred`, the
 * settled loader entries under `~loader`, and `~static` for a static render;
 * pass it to `BrowserHost.mount`. `model` is the root's Model
 * after the server run, for app code that sets the status (a 404 for a
 * missing record), or `undefined` if the root failed. `head` holds the
 * `<title>`, meta, link and JSON-LD tags, and `htmlAttributes` and
 * `bodyAttributes` the attributes for `<html ${htmlAttributes}>` and
 * `<body ${bodyAttributes}>`. All of them are escaped.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Rendered<out Model> {
  readonly html: string
  readonly state: Renderer.State
  readonly model: Model | undefined
  readonly head: string
  readonly htmlAttributes: string
  readonly bodyAttributes: string
}

/** Element operations on the server, where there are no elements to reach. */
const serverHtmlHost: Context.Service.Shape<typeof Html.Host> = {
  focus: () => {},
  blur: () => {},
  scrollIntoView: () => {},
  measure: () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 })
}

/**
 * Renders a component tree to HTML, with the state the client adopts.
 *
 * **When to use**
 *
 * Use when the render needs services that belong to the request, such as
 * the current user, or when the server doesn't use `HttpRouter`. Provide
 * those services to the returned Effect per request.
 *
 * **Details**
 *
 * It needs the tree's requirements, as `BrowserHost.mount` does, and runs
 * in its own Scope. The root must render HTML or be host-neutral. Give a
 * `MessageLog` Layer to log the server run; its entries stay on the server.
 *
 * `budget` (default 500 ms) is one deadline for the whole render. It limits
 * waiting on provided Layers and fetches, not the render. A Layer that misses
 * it, or that `Component.provide(..., { server: false })` keeps off the
 * server, renders its feature children's `fallback`, and the client builds
 * that instance fresh. A fetch that misses it isn't shipped, and the client
 * fetches it after hydration. A defect renders the slot's `fallback`, and
 * the client builds the slot fresh.
 *
 * `props` may be an Effect, such as `Router.props(AppRoute)` under
 * `Router.static`, run once before `init`. Its requirements are added to the
 * render's. The client resolves its own props the same way, from its Router.
 *
 * `static: true` is for HTML built at deploy or held in a CDN, where the
 * data's age is unknown. The client then hydrates every entry stale: it is
 * invalidated at hydration, and refetched once, unless its read's
 * `staleTime` is `"Infinity"`. There is no fetch-free window. The default
 * is HTML rendered per request, whose entries hydrate fresh.
 *
 * **Gotchas**
 *
 * Read data is public: `state` includes every settled entry, including typed
 * Failures and entries no view renders.
 *
 * Route status is the app's: resolve the URL with `AppRoute.resolve` first,
 * answer a `notFound` route with a 404 and a `redirected` one with a
 * redirect. `layerHttp` does this for an app served through `HttpRouter`.
 *
 * @see {@link layerHttp} to serve a routed app through `HttpRouter`
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const renderToHtml = <
  Name extends string,
  Props,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
  RP = never
>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V> & BrowserHost.HtmlRoot<V>,
  props: Props | Effect.Effect<Props, never, RP>,
  options?: {
    readonly budget?: Duration.Input | undefined
    readonly static?: boolean | undefined
  }
): Effect.Effect<Rendered<Model>, never, Exclude<R | RP, Html.Host>> =>
  Renderer.prerender(component, props, { budget: options?.budget, elements: [Html.name], static: options?.static })
    .pipe(
      Effect.provideService(Html.Host, serverHtmlHost),
      Effect.map((rendered) => ({
        html: server.toHtml(rendered.nodes),
        state: rendered.state,
        model: rendered.model,
        head: server.headTags(rendered.head),
        htmlAttributes: server.attributes(server.htmlOwned(rendered.head)),
        bodyAttributes: server.attributes(server.bodyOwned(rendered.head))
      }))
    ) as any

/**
 * The state as JSON that is safe inside `<script type="application/json">`:
 * `<` and the line separators are escaped, so the script can't end early.
 *
 * @stability experimental
 * @category utils
 * @since 4.1.5
 */
export const serializeState = (state: Renderer.State): string =>
  JSON.stringify(state).replace(/[<\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`)

/**
 * Serves a routed app's pages through `HttpRouter`: a `GET *` route that
 * renders the component at the request's URL and answers with a document.
 *
 * **When to use**
 *
 * Use when the app's root takes `{ route }` and mounts in the browser with
 * `Router.props(routes)`, and every service the render needs can be built
 * once with the server.
 *
 * **Details**
 *
 * Per request it resolves the URL with `routes`. A URL that doesn't resolve
 * is a 404, and a redirected or normalised one is a 301 to
 * `routes.print(route)`. Otherwise it renders with `renderToHtml` under
 * `Router.static` at the URL, with `Router.props(routes)` as the props,
 * the same props the client hydrates with. The response is
 * `document(rendered)` as `text/html`.
 *
 * The status is 404 for the catch-all `"/*"` route and 200 otherwise.
 * `status` replaces that default, for what the route can't know, such as a
 * record that doesn't exist. Its `model` is `undefined` if the root
 * failed. `budget` and `static` are `renderToHtml`'s options.
 *
 * The Layer captures the component's services when it is built, so provide
 * them with `Layer.provide`. It needs no request service.
 *
 * **Gotchas**
 *
 * A service provided to the Layer is shared by every request. Render with
 * `renderToHtml` in your own handler when a service belongs to the
 * request, such as the current user.
 *
 * **Example** (Serving a routed app)
 *
 * ```ts import.meta.vitest
 * import { Layer, Schema } from "effect"
 * import { HttpRouter } from "effect/http"
 * import { Component, Route, Router } from "effect/ui"
 * import { HtmlServer } from "effect/ui/html"
 *
 * const AppRoute = Route.union({
 *   Home: Route.make("/"),
 *   NotFound: Route.make("/*")
 * })
 *
 * const App = Component.make({
 *   name: "App",
 *   props: Schema.Struct({ route: AppRoute }),
 *   model: Schema.Struct({ route: AppRoute }),
 *   message: Schema.Never,
 *   init: ($) => ({ route: $.props.route }),
 *   update: (model) => model,
 *   view: ({ route }, h) => h.el("h1", route._tag === "Home" ? "Home" : "Page not found")
 * })
 *
 * const Pages = HtmlServer.layerHttp(App, {
 *   routes: AppRoute,
 *   budget: "300 millis",
 *   document: (page) => `<!doctype html>
 * <html ${page.htmlAttributes}>
 *   <head><meta charset="utf-8">${page.head}</head>
 *   <body ${page.bodyAttributes}>
 *     <div id="app">${page.html}</div>
 *     <script type="application/json" id="state">${HtmlServer.serializeState(page.state)}</script>
 *     <script type="module" src="/client.js"></script>
 *   </body>
 * </html>`
 * })
 *
 * const { dispose, handler } = HttpRouter.toWebHandler(Pages, { disableLogger: true })
 * const response = await handler(new Request("http://localhost/nowhere"))
 * response.status // => 404
 * await dispose()
 * ```
 *
 * @see {@link renderToHtml} for services that belong to the request
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const layerHttp = <
  Name extends string,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
  U extends Router.Routes
>(
  component:
    & Component.Component<Name, { readonly route: U["Type"] }, Model, Msg, Events, R, V>
    & BrowserHost.HtmlRoot<V>,
  options: {
    readonly routes: U
    readonly document: (rendered: Rendered<Model>) => string
    readonly budget?: Duration.Input | undefined
    readonly static?: boolean | undefined
    readonly status?: ((route: U["Type"], model: Model | undefined) => number) | undefined
  }
): Layer.Layer<never, never, HttpRouter.HttpRouter | Exclude<R, Html.Host | Router.Services>> =>
  HttpRouter.use(Effect.fnUntraced(function*(router) {
    const services = Context.omit(Scope.Scope)(yield* Effect.context<Exclude<R, Html.Host | Router.Services>>())
    const render = renderToHtml(component, Router.props(options.routes), {
      budget: options.budget,
      static: options.static
    })
    yield* router.add("GET", "*", (request) => {
      const resolved = options.routes.resolve(request.url)
      if (Option.isNone(resolved)) {
        return Effect.succeed(HttpServerResponse.text("Not found", { status: 404 }))
      }
      const { notFound, redirected, route } = resolved.value
      if (redirected) {
        return Effect.succeed(HttpServerResponse.redirect(options.routes.print(route), { status: 301 }))
      }
      return render.pipe(
        Effect.provide(Router.static({ routes: options.routes, url: request.url })),
        Effect.provideContext(services as Context.Context<any>),
        Effect.map((rendered) =>
          HttpServerResponse.text(options.document(rendered), {
            status: options.status ? options.status(route, rendered.model) : notFound ? 404 : 200,
            contentType: "text/html"
          })
        )
      ) as Effect.Effect<HttpServerResponse.HttpServerResponse>
    })
  }))
