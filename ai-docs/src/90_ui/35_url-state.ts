/**
 * @title Search, filters and pagination in the URL
 *
 * Keep a search page's text, order and page number in the query, so a link
 * or a reload shows the same results. The page reads them from its route,
 * writes them with `Router.patchQuery`, and fetches with a debounced loader.
 * This entry module mounts the routed app. The page is in
 * `fixtures/pages/search/SearchPage.ts`.
 */
import { Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/http"
import { Router } from "effect/ui"
import { BrowserHost, BrowserRouter } from "effect/ui/html"
// oxlint-disable-next-line no-unassigned-import
import "effect/ui/html/register"
// The URL is the only copy of the search. Read the files in this order:
//
// - `fixtures/routes.ts`: the `Search` route, whose query fields have
//   defaults and decode leniently
// - `fixtures/App.ts`: the root, which holds the route and keys each page by
//   its path with `AppRoute.printPath`
// - `fixtures/pages/search/SearchPage.ts`: the page, which takes its whole
//   route as props, writes the query with `Router.patchQuery` and fetches
//   with `Component.debounce`
// - `fixtures/notes/loaders/SearchNotes.ts`: the read behind the results,
//   keyed by the whole search
import { App } from "./fixtures/App.ts"
import { AppRoute } from "./fixtures/routes.ts"

// `BrowserRouter.layer` provides `PatchQuery` with the other navigation
// Commands, so the search page's requirement is met here. A same-page
// replace, such as a keystroke's `patchQuery`, updates the route at once,
// and the address bar at most every 200 ms.
//
// A URL with a query value that doesn't decode, such as `/search?page=abc`,
// mounts with the default and the Router replaces the URL with `/search`.
const Main = BrowserHost.mount(App, Router.props(AppRoute), document.getElementById("app")!).pipe(
  Layer.provide([BrowserRouter.layer({ routes: AppRoute }), FetchHttpClient.layer])
)

Layer.launch(Main).pipe(Effect.runFork)
