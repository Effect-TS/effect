import { Schema } from "effect"
import { Command, Component, Head, Router } from "effect/ui"
import { NotePage } from "./pages/notes/NotePage.ts"
import { NotesIndex } from "./pages/NotesIndex.ts"
import { SearchPage } from "./pages/search/SearchPage.ts"
import { AppRoute } from "./routes.ts"

const indexRoute = AppRoute.make({ _tag: "Index" })
// `make` fills in the query defaults, and `print` leaves them out, so this
// prints as `/search`.
const searchRoute = AppRoute.make({ _tag: "Search", query: {} })

export const AppMessage = Schema.TaggedUnion({
  RouteChanged: { route: AppRoute },
  GoHome: {},
  Navigated: {}
})

// The root needs no domain Layers of its own, because each page provides
// what it uses. Only the Router is left, so there is no `AppNoDeps`.
export const App = Component.make({
  name: "App",
  // The root holds the route. The first one arrives through props and every
  // later change arrives as a message, which puts navigation in the message
  // log. That includes every query change a page writes, and `init` stays
  // pure.
  props: Schema.Struct({ route: AppRoute }),
  model: Schema.Struct({ route: AppRoute }),
  message: AppMessage,
  init: ($) => ({ route: $.props.route }),
  update: (model, message, $) =>
    AppMessage.match(message, {
      RouteChanged: ({ route }) => ({ route }),
      // Navigating from `update` is a Command that can't fail, so it takes
      // `Command.map`.
      GoHome: () =>
        $.run(Router.push(AppRoute, indexRoute).pipe(Command.map(() => AppMessage.make({ _tag: "Navigated" })))),
      Navigated: () => model
    }),
  subscriptions: (model) => [
    Router.subscription(AppRoute, model.route, (route) => AppMessage.make({ _tag: "RouteChanged", route }))
  ],
  // App-wide head defaults go in the root's `head`, not in the HTML shell.
  // The template wraps the title a page below sets, giving
  // "All notes · Notes".
  head: () => [Head.titleTemplate((title) => `${title} · Notes`), Head.lang("en")],
  view: ({ route }, h) =>
    h.div(
      h.header(
        h.a.attr("href", AppRoute.print(indexRoute)).children("Notes"),
        h.a.attr("href", AppRoute.print(searchRoute)).children("Search")
      ),
      h.main(
        // `match` is exhaustive. Key each page by its path with `printPath`,
        // so a new path mounts a fresh page instead of reusing the old state.
        // `printPath` leaves out the query, so a query change updates the
        // page in place with new props, and its loaders keep their last
        // results. Keyed by `print`, the search page would remount on every
        // keystroke.
        //
        // A page that should start over when one param changes adds that
        // param to its key, as `${AppRoute.printPath(route)}?sort=${route.query.sort}`.
        AppRoute.match(route, {
          Index: (route) => h.child(NotesIndex, { key: AppRoute.printPath(route) }),
          // A page that uses its query takes the whole route as props.
          Search: (route) => h.child(SearchPage, { key: AppRoute.printPath(route), props: { route } }),
          // A page that doesn't can keep taking picked fields.
          Note: (route) => h.child(NotePage, { key: AppRoute.printPath(route), props: { id: route.params.id } }),
          NotFound: () =>
            h.section(
              h.h1("Page not found"),
              h.button.onClick(AppMessage.make({ _tag: "GoHome" })).children("Back to all notes")
            )
        })
      )
    )
})
