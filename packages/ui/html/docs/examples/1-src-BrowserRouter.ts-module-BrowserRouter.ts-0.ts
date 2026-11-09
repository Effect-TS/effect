import { BrowserHost, BrowserRouter, Html } from "@effect/ui-html"
import { Effect, Layer, Option, Schema } from "effect"
import { Component, Route, Router } from "effect/ui"

const AppRoute = Route.union({
  Home: Route.make("/"),
  Person: Route.make("/people/:id", { params: { id: Schema.Number } }),
  NotFound: Route.make("/*")
})
type AppRoute = typeof AppRoute.Type

const Message = Schema.TaggedUnion({ ChangedRoute: { route: AppRoute } })

const App = Component.make({
  name: "App",
  props: Schema.Struct({ route: AppRoute }),
  model: AppRoute,
  message: Message,
  elements: Html,
  init: ($) => $.props.route,
  update: (route, message) => AppRoute.print(message.route) === AppRoute.print(route) ? route : message.route,
  subscriptions: () => [Router.subscription(AppRoute, (route) => Message.make({ _tag: "ChangedRoute", route }))],
  view: (route, h) =>
    h.div(
      h.a("Ada").attr("href", AppRoute.print(AppRoute.make({ _tag: "Person", params: { id: 1 } }))),
      h.h1(route._tag)
    )
})

const main = Effect.gen(function*() {
  const router = yield* Router.Router
  yield* BrowserHost.mount(App, { route: router.location().route as AppRoute }, document.getElementById("app")!)
  return yield* Effect.never
}).pipe(
  Effect.scoped,
  Effect.provide(BrowserRouter.layer({ routes: AppRoute }))
)