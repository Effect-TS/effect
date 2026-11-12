import { Schema } from "effect"
import { Command, Component, Head, Router } from "effect/ui"
import { NotePage } from "./pages/NotePage.ts"
import { NotesIndex } from "./pages/NotesIndex.ts"
import { AppRoute } from "./routes.ts"

const indexRoute = AppRoute.make({ _tag: "Index" })

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
  // log.
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
      h.header(h.a("Notes").attr("href", AppRoute.print(indexRoute))),
      h.main(
        // `match` is exhaustive. Key each page by its printed route, so a
        // route change mounts a fresh page instead of reusing the old Model.
        AppRoute.match(route, {
          Index: (route) => h.child(NotesIndex, { key: AppRoute.print(route) }),
          Note: (route) => h.child(NotePage, { key: AppRoute.print(route), props: { id: route.params.id } }),
          NotFound: () =>
            h.section(
              h.h1("Page not found"),
              h.button("Back to all notes").onClick(AppMessage.make({ _tag: "GoHome" }))
            )
        })
      )
    )
})
