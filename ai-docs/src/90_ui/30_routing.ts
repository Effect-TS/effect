/**
 * @title Routing and the document head
 *
 * Define typed routes with `Route` and keep the current route in the root's
 * Model. The app also sets the title and meta tags with `Head`. This entry
 * module mounts it with `BrowserRouter`. The routes are in
 * `fixtures/routes.ts` and the root component is in `fixtures/App.ts`.
 */
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/http"
import { Router } from "effect/ui"
import { BrowserHost, BrowserRouter } from "effect/ui/html"
// oxlint-disable-next-line no-unassigned-import
import "effect/ui/html/register"
// The routed app:
//
// - `fixtures/routes.ts`: the route union, in its own file
// - `fixtures/App.ts`: the root, which holds the route and picks the page
// - `fixtures/pages/NotesIndex.ts`: the page at `/`, which links with
//   printed routes
// - `fixtures/pages/notes/NotePage.ts`: the page at `/notes/:id`, from the
//   previous example
// - `fixtures/pages/search/SearchPage.ts`: the page at `/search`, from the
//   next example
import { App } from "./fixtures/App.ts"
import { AppRoute } from "./fixtures/routes.ts"

// `BrowserRouter.layer` provides the `Router` service and the navigation
// Commands over `window.history`. After each navigation it scrolls, moves
// focus and announces the page, so give a loading page a title worth
// hearing. Use `layerHash` for static hosting.
//
// A root's props can be an Effect. `Router.props` reads `{ route }` from the
// Router when the root mounts. A root with other props maps
// `Router.currentRoute(AppRoute)` instead. Both die if the union can't parse
// the URL, which the `/*` catch-all rules out.
//
// The Router and the HTTP client are the only Layers here. The pages provide
// their own domain Layers.
const Main = BrowserHost.mount(App, Router.props(AppRoute), document.getElementById("app")!).pipe(
  Layer.provide([BrowserRouter.layer({ routes: AppRoute }), FetchHttpClient.layer])
)

Layer.launch(Main).pipe(Effect.runFork)
