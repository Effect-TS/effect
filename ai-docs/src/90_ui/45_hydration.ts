/**
 * @title Hydrating in the browser
 *
 * Hydrate what the server rendered with `BrowserHost`. This is the browser
 * entry module of the server-rendered app, served as `/client.js`.
 */
import { Effect } from "effect"
import { FetchHttpClient } from "effect/http"
import { Router } from "effect/ui"
import { BrowserHost, BrowserRouter } from "effect/ui/html"
// oxlint-disable-next-line no-unassigned-import
import "effect/ui/html/register"
import { App } from "./fixtures/App.ts"
import { AppRoute } from "./fixtures/routes.ts"

// Mount the same component with the same props, plus the server's state.
// `Router.props` reads the route from the browser's URL. Each instance then
// adopts the server's state, its Model and its loaders' slots, and its DOM
// nodes instead of rebuilding them. The reads the server shipped aren't
// fetched again.
//
// A Layer that can never be ready on the server, such as a live connection,
// is kept off it with `Component.provide(C, layer, { server: false })`. The
// server then renders that slot's fallback and the client builds it fresh.
const hydrate = Effect.gen(function*() {
  const state = JSON.parse(document.getElementById("state")!.textContent!)
  const root = yield* BrowserHost.mountEffect(App, Router.props(AppRoute), document.getElementById("app")!, {
    state
  })
  // `mountEffect` is `mount` as an Effect that returns the root. `adopted`
  // completes once every slot is live. Until then a waiting slot is inert.
  yield* root.adopted
  return yield* Effect.never
}).pipe(
  Effect.scoped,
  Effect.provide([BrowserRouter.layer({ routes: AppRoute }), FetchHttpClient.layer])
)

Effect.runFork(hydrate)
