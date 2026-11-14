/**
 * The routed example: a root that holds the route, a home page, a person
 * page that reads its bio through a loader, a search route and a slow page
 * whose provided Layer takes a second to build.
 */
import { Context, Effect, Layer, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Component, Head, Route, Router } from "effect/ui"
import { Html } from "effect/ui/html"

export const AppRoute = Route.union({
  Home: Route.make("/"),
  Person: Route.make("/people/:id", { params: { id: Schema.Number } }),
  Search: Route.make("/search", { query: { q: Schema.String } }),
  Slow: Route.make("/slow"),
  NotFound: Route.make("/*")
})
export type AppRoute = typeof AppRoute.Type

export const Home = Component.define({
  name: "Home",
  model: Schema.Struct({}),
  message: Schema.Never,
  elements: Html
}).make({
  init: () => ({}),
  update: (model) => model,
  head: () => [Head.title("Home"), Head.meta({ name: "description", content: "Home page" })],
  view: (_, h) => h.h1("Home")
})

/** Where person pages read their bio. Tests swap in a slow one. */
export class People extends Context.Service<People, {
  readonly bio: (id: number) => Effect.Effect<string>
}>()("test/People") {
  static readonly layer = Layer.succeed(People, { bio: (id: number) => Effect.succeed(`Bio of person ${id}`) })
}

/** Route data: read on the server, so the page's HTML holds it. */
export class GetBio extends Loader.Service<GetBio>()("GetBio", {
  args: { id: Schema.Number },
  success: Schema.String,
  error: Schema.Never,
  staleTime: "30 seconds"
}, Effect.map(People, (people) => ({ id }) => people.bio(id))) {}

export const Person = Component.define({
  name: "Person",
  props: Schema.Struct({ id: Schema.Number }),
  model: Schema.Struct({ id: Schema.Number }),
  message: Schema.Never,
  elements: Html,
  loaders: { bio: { load: GetBio, args: (_model, props) => ({ id: props.id }) } }
}).make({
  init: ($) => ({ id: $.props.id }),
  update: (model) => model,
  head: (model) => [
    Head.title(`Person ${model.id}`),
    Head.meta({ name: "description", content: `About person ${model.id}` }),
    Head.jsonLd({ "@type": "Person", identifier: model.id })
  ],
  view: (model, h) =>
    h.div(
      h.h1(`Person ${model.id}`),
      h.p.attr("id", "bio").children(AsyncResult.isSuccess(h.loaded.bio) ? h.loaded.bio.value : "Loading")
    )
}).pipe(Component.provide(GetBio.layer))

export class SlowData extends Context.Service<SlowData, string>()("test/SlowData") {}

/** A page whose provided Layer takes a second of the TestClock to build. */
export const Slow = Component.define({
  name: "Slow",
  model: Schema.Struct({}),
  message: Schema.Never,
  elements: Html
}).make({
  init: () => ({}),
  update: (model) => model,
  head: () => [Head.title("Slow")],
  view: (_, h) => h.h1("Slow")
}).pipe(Component.provide(Layer.effect(SlowData, Effect.as(Effect.sleep("1 second"), "ready"))))

export const Message = Schema.TaggedUnion({ ChangedRoute: { route: AppRoute }, Block: {}, Filter: {} })

export const App = Component.define({
  name: "App",
  props: Schema.Struct({ route: AppRoute }),
  model: Schema.Struct({ route: AppRoute, blocked: Schema.Boolean }),
  message: Message,
  elements: Html
}).make({
  init: ($) => ({ route: $.props.route, blocked: false }),
  update: (model, message) =>
    Message.match(message, {
      ChangedRoute: ({ route }) => ({ ...model, route }),
      Block: () => ({ ...model, blocked: true }),
      Filter: () => model
    }),
  subscriptions: (model) => [
    Router.subscription(AppRoute, model.route, (route) => Message.make({ _tag: "ChangedRoute", route })),
    model.blocked && Router.blocked("editing")
  ],
  head: () => [Head.titleTemplate((title) => `${title} · App`), Head.lang("en"), Head.htmlClass("routed")],
  view: ({ route }, h) =>
    h.div(
      h.nav(
        h.a.attr("href", AppRoute.print(AppRoute.make({ _tag: "Home" }))).children("Home"),
        h.a.attr("href", AppRoute.print(AppRoute.make({ _tag: "Person", params: { id: 1 } }))).children("Person 1"),
        h.a.attr("href", `${AppRoute.print(AppRoute.make({ _tag: "Person", params: { id: 2 } }))}#bio`).children(
          "Person 2 bio"
        ),
        h.a.attr("href", "https://example.com/").children("Elsewhere"),
        h.a.attr("href", AppRoute.print(AppRoute.make({ _tag: "Slow" }))).children("Slow"),
        h.button.onClick(Message.make({ _tag: "Block" })).children("Block"),
        h.form
          .attr("method", "get")
          .attr("action", "/search")
          .attr("aria-label", "Search").children(
            h.input.attr("name", "q").attr("value", "ada"),
            h.button.attr("type", "submit").children("Search")
          ),
        h.form
          .attr("method", "get")
          .attr("action", "/search")
          .attr("aria-label", "Filter")
          .onSubmit(Message.make({ _tag: "Filter" })).children(
            h.input.attr("name", "q").attr("value", "x"),
            h.button.attr("type", "submit").children("Filter")
          )
      ),
      AppRoute.match(route, {
        Home: (route) => h.child(Home, { key: AppRoute.print(route), props: {} }),
        Person: (route) => h.child(Person, { key: AppRoute.print(route), props: { id: route.params.id } }),
        Search: (route) => h.h1(`Search ${route.query.q}`),
        Slow: (route) => h.child(Slow, { key: AppRoute.print(route), props: {} }),
        NotFound: () => h.h1("Not found")
      })
    )
})
