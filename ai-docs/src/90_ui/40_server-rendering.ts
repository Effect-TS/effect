/**
 * @title Server rendering and hydration
 *
 * Render a routed app to HTML on the server with `HtmlServer.renderToHtml`,
 * embed its state in the page, and hydrate it in the browser with
 * `BrowserHost.mount`.
 */
import { Effect, Option } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"
import { Router } from "effect/ui"
import { BrowserHost, BrowserRouter, HtmlServer } from "effect/ui/html"
import { App, AppRoute } from "./30_routing.ts"
import type { Note } from "./fixtures/domain/Note.ts"
import { Notes } from "./fixtures/services/Notes.ts"

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export const renderPage = Effect.fnUntraced(function*(url: string) {
  // The response status is the app's job: resolve the URL first.
  const resolved = AppRoute.resolve(url)
  if (Option.isNone(resolved)) {
    return HttpServerResponse.text("Not found", { status: 404 })
  }
  const { redirected, route } = resolved.value
  // A redirect route or a trailing slash changed the URL.
  if (redirected) {
    return HttpServerResponse.redirect(AppRoute.print(route))
  }

  // What runs on the server:
  //
  // - `init`, `update` and `view`, the provided Layers, and loader reads,
  //   fetched once per key in a per-request cache.
  // - No Command, and no Subscription other than a loader watch. Data the
  //   server renders has to come from a loader read.
  //
  // `budget` is one deadline for Layers and fetches (500 ms by default). Set
  // it to what the page's data needs: what misses it renders its loading
  // state, and the client fetches it.
  const rendered = yield* HtmlServer.renderToHtml(App, { route }, { budget: "300 millis" }).pipe(
    // The server's Router: one fixed location, and navigation does nothing.
    Effect.provide(Router.static({ routes: AppRoute, url }))
  )

  // `head`, `htmlAttributes` and `bodyAttributes` come from the components'
  // `head` and are already escaped. `serializeState` makes the state safe
  // inside a script tag: never use `JSON.stringify` for it. The state holds
  // every Model and every settled read, so treat all of it as public.
  const body = `<!doctype html>
<html ${rendered.htmlAttributes}>
  <head><meta charset="utf-8">${rendered.head}</head>
  <body ${rendered.bodyAttributes}>
    <div id="app">${rendered.html}</div>
    <script type="application/json" id="state">${HtmlServer.serializeState(rendered.state)}</script>
    <script type="module" src="/client.js"></script>
  </body>
</html>`

  // `rendered.model` is the root's Model after the render, for a status that
  // depends on loaded data.
  return HttpServerResponse.text(body, {
    status: route._tag === "NotFound" ? 404 : 200,
    contentType: "text/html"
  })
})

const seed: ReadonlyArray<Note> = [{ id: "welcome", title: "Welcome", body: "Write something." }]

// The app's requirements are provided as for a mount. Here the server holds
// the notes itself; `Notes.layerHttp` is the browser's implementation.
export const PageRoutes = HttpRouter.add(
  "GET",
  "*",
  Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => renderPage(request.url)).pipe(
    Effect.provide(Notes.layerMemory(seed))
  )
)

// ---------------------------------------------------------------------------
// Client: the module served as /client.js
// ---------------------------------------------------------------------------

// Mount the same component with the same props, plus the server's state.
// Each instance then adopts the server's Model and DOM nodes instead of
// rebuilding them, and the reads the server shipped aren't fetched again.
//
// A Layer that can never be ready on the server, such as a live connection,
// is kept off it with `Component.provide(C, layer, { server: false })`: the
// server renders that slot's fallback and the client builds it fresh.
export const hydrate = Effect.gen(function*() {
  const state = JSON.parse(document.getElementById("state")!.textContent!)
  const route = yield* Router.currentRoute(AppRoute)
  const root = yield* BrowserHost.mount(App, { route }, document.getElementById("app")!, { state })
  // Completes once every slot is live. Until then a waiting slot is inert.
  yield* root.adopted
  return yield* Effect.never
}).pipe(
  Effect.scoped,
  Effect.provide([BrowserRouter.layer({ routes: AppRoute }), Notes.layerHttp])
)
