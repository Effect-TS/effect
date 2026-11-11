/**
 * @title Routing and the document head
 *
 * Define typed routes with `Route`, keep the current route in the root's
 * Model with `Router`, set the title and meta tags with `Head`, and run the
 * app in the browser with `BrowserRouter`.
 */
import { Effect, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Command, Component, Head, Route, Router } from "effect/ui"
import { BrowserHost, BrowserRouter, Html } from "effect/ui/html"
import { NotePageLive } from "./20_composition.ts"
import { ListNotes } from "./fixtures/notes/ListNotes.ts"
import { Notes } from "./fixtures/services/Notes.ts"

// A route union is a `Schema.TaggedUnion` with a parser and a printer that
// agree. Params and query are decoded through their Schemas, and `/*` is the
// catch-all. Always build URLs with `print`, never by hand.
export const AppRoute = Route.union({
  Index: Route.make("/"),
  Note: Route.make("/notes/:id", { params: { id: Schema.String } }),
  NotFound: Route.make("/*")
})

const indexRoute = AppRoute.make({ _tag: "Index" })
const noteUrl = (id: string) => AppRoute.print(AppRoute.make({ _tag: "Note", params: { id } }))

const NotesSnapshot = Loader.Snapshot(ListNotes, "notes")
const NotesIndexMessage = Schema.TaggedUnion({ NotesChanged: { snapshot: NotesSnapshot } })

export const NotesIndex = Component.make({
  name: "NotesIndex",
  model: Schema.Struct({ notes: NotesSnapshot }),
  message: NotesIndexMessage,
  elements: Html,
  loaders: { notes: () => ({}) },
  init: ($) => $.empty,
  update: (_model, message) => ({ notes: message.snapshot }),
  subscriptions: (_model, _props, watch) => [
    watch({ notes: (snapshot) => NotesIndexMessage.make({ _tag: "NotesChanged", snapshot }) })
  ],
  // Every mounted instance contributes head entries. They merge in document
  // order, and the later entry wins.
  head: () => [Head.title("All notes"), Head.meta({ name: "description", content: "Every note you wrote" })],
  view: (_model, h) =>
    AsyncResult.match(h.loaded.notes, {
      onInitial: () => h.p("Loading notes…"),
      onFailure: () => h.p("The notes couldn't be loaded."),
      // Links are plain anchors with a printed route. The browser Router
      // intercepts clicks on hrefs the routes parse. `.key` identifies a row.
      onSuccess: ({ value: notes }) =>
        h.ul(notes.map((note) => h.li(h.a(note.title).attr("href", noteUrl(note.id))).key(note.id)))
    })
}).pipe(Component.provide(ListNotes.layer))

export const AppMessage = Schema.TaggedUnion({
  RouteChanged: { route: AppRoute },
  GoHome: {},
  Navigated: {}
})

export const App = Component.make({
  name: "App",
  // The root holds the route: the initial one arrives through props, and every
  // later change arrives as a message, so navigation is in the message log.
  props: Schema.Struct({ route: AppRoute }),
  model: Schema.Struct({ route: AppRoute }),
  message: AppMessage,
  elements: Html,
  init: ($) => ({ route: $.props.route }),
  update: (model, message, $) =>
    AppMessage.match(message, {
      RouteChanged: ({ route }) => ({ route }),
      // Navigating from `update` is a Command. It can't fail, so `Command.map`.
      GoHome: () =>
        $.run(Router.push(AppRoute, indexRoute).pipe(Command.map(() => AppMessage.make({ _tag: "Navigated" })))),
      Navigated: () => model
    }),
  subscriptions: (model) => [
    Router.subscription(AppRoute, model.route, (route) => AppMessage.make({ _tag: "RouteChanged", route }))
  ],
  // App-wide head defaults go in the root's `head`, not in the HTML shell.
  // The template wraps the title a page below sets: "All notes · Notes".
  head: () => [Head.titleTemplate((title) => `${title} · Notes`), Head.lang("en")],
  view: ({ route }, h) =>
    h.div(
      h.header(h.a("Notes").attr("href", AppRoute.print(indexRoute))),
      h.main(
        // `match` is exhaustive. Key each page by its printed route, so a
        // route change mounts a fresh page instead of reusing the old Model.
        AppRoute.match(route, {
          Index: (route) => h.child(NotesIndex, { key: AppRoute.print(route) }),
          Note: (route) => h.child(NotePageLive, { key: AppRoute.print(route), props: { id: route.params.id } }),
          NotFound: () =>
            h.section(
              h.h1("Page not found"),
              h.button("Back to all notes").onClick(AppMessage.make({ _tag: "GoHome" }))
            )
        })
      )
    )
})

// `BrowserRouter.layer` provides the `Router` service and the navigation
// Commands over `window.history`. After each navigation it scrolls, moves
// focus and announces the page, so give a loading page a title worth
// hearing. Use `layerHash` for static hosting.
export const main = Effect.gen(function*() {
  const route = yield* Router.currentRoute(AppRoute)
  yield* BrowserHost.mount(App, { route }, document.getElementById("app")!)
  return yield* Effect.never
}).pipe(
  Effect.scoped,
  Effect.provide([BrowserRouter.layer({ routes: AppRoute }), Notes.layerHttp])
)
