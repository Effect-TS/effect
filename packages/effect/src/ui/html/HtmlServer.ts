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
 * @stability experimental
 * @since 4.1.3
 */
import type * as Context from "../../Context.ts"
import type * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import type * as Component from "../Component.ts"
import * as Renderer from "../Renderer.ts"
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
 * @since 4.1.3
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
 * Route status is the app's: parse the URL with `AppRoute.parse` first and
 * answer a `NotFound` route with a 404.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const renderToHtml = <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V> & BrowserHost.HtmlRoot<V>,
  props: Props,
  options?: {
    readonly budget?: Duration.Input | undefined
    readonly static?: boolean | undefined
  }
): Effect.Effect<Rendered<Model>, never, Exclude<R, Html.Host>> =>
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
 * @since 4.1.3
 */
export const serializeState = (state: Renderer.State): string =>
  JSON.stringify(state).replace(/[<\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`)
