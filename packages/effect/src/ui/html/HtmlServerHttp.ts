/**
 * Serves a routed `effect/ui` app's pages through `HttpRouter`, with
 * `HtmlServer.renderToHtml` doing the rendering.
 *
 * It is a separate entry point, `effect/ui/html/HtmlServerHttp`, and
 * `effect/ui/html` doesn't re-export it. A browser bundle that imports
 * `effect/ui/html` then takes in none of the `effect/http` modules this
 * module needs, even when it uses a namespace such as `Html` as a value.
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
import * as Router from "../Router.ts"
import type * as View from "../View.ts"
import type * as BrowserHost from "./BrowserHost.ts"
import type * as Html from "./Html.ts"
import * as HtmlServer from "./HtmlServer.ts"

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
 * `routes.print(route)`. Otherwise it renders with `HtmlServer.renderToHtml` under
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
 * `HtmlServer.renderToHtml` in your own handler when a service belongs to the
 * request, such as the current user.
 *
 * **Example** (Serving a routed app)
 *
 * ```ts import.meta.vitest
 * import { Layer, Schema } from "effect"
 * import { HttpRouter } from "effect/http"
 * import { Component, Route, Router } from "effect/ui"
 * import { HtmlServer } from "effect/ui/html"
 * import { layerHttp } from "effect/ui/html/HtmlServerHttp"
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
 * const Pages = layerHttp(App, {
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
 * @see {@link HtmlServer.renderToHtml} for services that belong to the request
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
    readonly document: (rendered: HtmlServer.Rendered<Model>) => string
    readonly budget?: Duration.Input | undefined
    readonly static?: boolean | undefined
    readonly status?: ((route: U["Type"], model: Model | undefined) => number) | undefined
  }
): Layer.Layer<never, never, HttpRouter.HttpRouter | Exclude<R, Html.Host | Router.Services>> =>
  HttpRouter.use(Effect.fnUntraced(function*(router) {
    const services = Context.omit(Scope.Scope)(yield* Effect.context<Exclude<R, Html.Host | Router.Services>>())
    const render = HtmlServer.renderToHtml(component, Router.props(options.routes), {
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
