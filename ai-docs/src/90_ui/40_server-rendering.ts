/**
 * @title Rendering on the server
 *
 * Serve the routed app's pages with `layerHttp` from
 * `effect/ui/html/HtmlServerHttp`, next to the JSON API. This is the
 * server's entry module. It serves the same `fixtures/App.ts` the browser
 * mounts, and the JSON API in `fixtures/server/NotesApi.ts`.
 */
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpRouter } from "effect/http"
import { HtmlServer } from "effect/ui/html"
// `layerHttp` has its own entry point, outside `effect/ui/html`, so a
// browser bundle never takes in the HTTP server modules.
import { layerHttp } from "effect/ui/html/HtmlServerHttp"
// The server renders views too, so it registers the HTML elements as well.
// The import reads no DOM global.
// oxlint-disable-next-line no-unassigned-import
import "effect/ui/html/register"
import { createServer } from "node:http"
import { App } from "./fixtures/App.ts"
import { AppRoute } from "./fixtures/routes.ts"
import { NotesApi } from "./fixtures/server/NotesApi.ts"

const port = 3000

// The components provide their own domain Layers on the server too, so the
// render reads notes through `Notes.layerHttp`, as the browser does. The
// one platform Layer it needs is the HTTP client. A server has no page URL
// to resolve `/api` against, so this one calls the server's own address.
const ApiClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.map(
    HttpClient.HttpClient,
    HttpClient.mapRequest(HttpClientRequest.prependUrl(`http://localhost:${port}`))
  )
).pipe(Layer.provide(FetchHttpClient.layer))

// `layerHttp` resolves each URL with `AppRoute`, answers a redirect for a
// redirected URL and a 404 for the `NotFound` route, and renders the rest
// with `Router.props(AppRoute)`, the props the browser mounts with.
//
// The server runs `init`, `update` and `view`, builds the provided Layers
// and fetches loader reads once per key in a per-request cache. It runs no
// Command, and no Subscription other than a loader watch, so data the
// server renders has to come from a loader read.
const Pages = layerHttp(App, {
  routes: AppRoute,
  // `budget` is one deadline for Layers and fetches, 500 ms by default. Set
  // it to what the page's data needs. Anything that misses it renders its
  // loading state, and the client fetches it.
  budget: "300 millis",
  // `head`, `htmlAttributes` and `bodyAttributes` come from the components'
  // `head` and are already escaped. `serializeState` makes the state safe
  // inside a script tag, which `JSON.stringify` doesn't. The state holds
  // every Model and every settled read, so treat all of it as public.
  document: (page) =>
    `<!doctype html>
<html ${page.htmlAttributes}>
  <head><meta charset="utf-8">${page.head}</head>
  <body ${page.bodyAttributes}>
    <div id="app">${page.html}</div>
    <script type="application/json" id="state">${HtmlServer.serializeState(page.state)}</script>
    <script type="module" src="/client.js"></script>
  </body>
</html>`
  // `status: (route, model) => number` replaces the default status, for what
  // the route can't know, such as a note id that doesn't exist.
}).pipe(
  // The Layer captures the render's services when the server starts, so
  // they are shared by every request. For a service that belongs to the
  // request, such as the current user, call `HtmlServer.renderToHtml` from
  // your own handler instead.
  Layer.provide(ApiClient)
)

// `NotesApi` is the JSON API the app calls, from the server render and from
// the browser. A real server also serves `/client.js`, the bundle of the
// next example.
const Main = HttpRouter.serve(Layer.mergeAll(NotesApi, Pages)).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port }))
)

Layer.launch(Main).pipe(NodeRuntime.runMain)
