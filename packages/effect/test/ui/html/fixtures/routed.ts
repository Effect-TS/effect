/**
 * The routed example: a root that holds the route, a home page, a person
 * page that loads its bio on entry with a server Command, a search route
 * and a slow page whose provided Layer takes a second to build.
 */
import { Context, Effect, Layer, Schema } from "effect"
import { Command, Component, Head, Route, Router } from "effect/ui"
import { Html } from "effect/ui/html"

export const AppRoute = Route.union({
  Home: Route.make("/"),
  Person: Route.make("/people/:id", { params: { id: Schema.Number } }),
  Search: Route.make("/search", { query: { q: Schema.String } }),
  Slow: Route.make("/slow"),
  NotFound: Route.make("/*")
})
export type AppRoute = typeof AppRoute.Type

export const Home = Component.make({
  name: "Home",
  model: Schema.Struct({}),
  message: Schema.Never,
  elements: Html,
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

export const PersonMessage = Schema.TaggedUnion({ Loaded: { bio: Schema.String } })

/** Route data: read on the server, so the page's HTML holds it. */
export class LoadBio extends Command.Service<LoadBio>()(
  "LoadBio",
  { args: { id: Schema.Number }, invalidates: () => [], server: true },
  Effect.gen(function*() {
    const people = yield* People
    return ({ id }) => Effect.map(people.bio(id), (bio) => PersonMessage.make({ _tag: "Loaded", bio }))
  })
) {}

export const Person = Component.make({
  name: "Person",
  props: Schema.Struct({ id: Schema.Number }),
  model: Schema.Struct({ id: Schema.Number, bio: Schema.optional(Schema.String) }),
  message: PersonMessage,
  elements: Html,
  init: ($) => $.set({ id: $.props.id }).run(LoadBio.make({ id: $.props.id })),
  update: (model, message) => ({ ...model, bio: message.bio }),
  head: (model) => [
    Head.title(`Person ${model.id}`),
    Head.meta({ name: "description", content: `About person ${model.id}` }),
    Head.jsonLd({ "@type": "Person", identifier: model.id })
  ],
  view: (model, h) => h.div(h.h1(`Person ${model.id}`), h.p(model.bio ?? "Loading").attr("id", "bio"))
}).pipe(Component.provide(LoadBio.layer))

export class SlowData extends Context.Service<SlowData, string>()("test/SlowData") {}

/** A page whose provided Layer takes a second of the TestClock to build. */
export const Slow = Component.make({
  name: "Slow",
  model: Schema.Struct({}),
  message: Schema.Never,
  elements: Html,
  init: () => ({}),
  update: (model) => model,
  head: () => [Head.title("Slow")],
  view: (_, h) => h.h1("Slow")
}).pipe(Component.provide(Layer.effect(SlowData, Effect.as(Effect.sleep("1 second"), "ready"))))

export const Message = Schema.TaggedUnion({ ChangedRoute: { route: AppRoute }, Block: {}, Filter: {} })

export const App = Component.make({
  name: "App",
  props: Schema.Struct({ route: AppRoute }),
  model: Schema.Struct({ route: AppRoute, blocked: Schema.Boolean }),
  message: Message,
  elements: Html,
  init: ($) => ({ route: $.props.route, blocked: false }),
  update: (model, message) =>
    Message.match(message, {
      ChangedRoute: (changed) =>
        AppRoute.print(changed.route) === AppRoute.print(model.route) ? model : { ...model, route: changed.route },
      Block: () => ({ ...model, blocked: true }),
      Filter: () => model
    }),
  subscriptions: (model) => [
    Router.subscription(AppRoute, (route) => Message.make({ _tag: "ChangedRoute", route })),
    model.blocked && Router.blocked("editing")
  ],
  head: () => [Head.titleTemplate((title) => `${title} · App`), Head.lang("en"), Head.htmlClass("routed")],
  view: ({ route }, h) =>
    h.div(
      h.nav(
        h.a("Home").attr("href", AppRoute.print(AppRoute.make({ _tag: "Home" }))),
        h.a("Person 1").attr("href", AppRoute.print(AppRoute.make({ _tag: "Person", params: { id: 1 } }))),
        h.a("Person 2 bio").attr("href", `${AppRoute.print(AppRoute.make({ _tag: "Person", params: { id: 2 } }))}#bio`),
        h.a("Elsewhere").attr("href", "https://example.com/"),
        h.a("Slow").attr("href", AppRoute.print(AppRoute.make({ _tag: "Slow" }))),
        h.button("Block").onClick(Message.make({ _tag: "Block" })),
        h.form(h.input().attr("name", "q").attr("value", "ada"), h.button("Search").attr("type", "submit"))
          .attr("method", "get")
          .attr("action", "/search")
          .attr("aria-label", "Search"),
        h.form(h.input().attr("name", "q").attr("value", "x"), h.button("Filter").attr("type", "submit"))
          .attr("method", "get")
          .attr("action", "/search")
          .attr("aria-label", "Filter")
          .onSubmit(Message.make({ _tag: "Filter" }))
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
