/**
 * A two-page app on the Router: a root that holds the route, a home page, a
 * person page that loads on entry (a server Command), counts its visits (a
 * client-only Command) and counts clicks, and a slow page whose provided Layer
 * takes a second to build.
 */
import { Context, Effect, Layer, Schema } from "effect"
import { Command, Component, Head, Route, Router } from "effect/ui"

export const AppRoute = Route.union(
  {
    Home: Route.make("/"),
    Person: Route.make("/people/:id", { params: { id: Schema.Number } }),
    Slow: Route.make("/slow"),
    NotFound: Route.make("/*")
  },
  Route.redirect("/old/:id", (params) => ({ _tag: "Person", params: { id: Number(params.id) }, query: {} }))
)
export type AppRoute = typeof AppRoute.Type

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export const Home = Component.make({
  name: "Home",
  model: Schema.Struct({}),
  message: Schema.Never,
  init: () => ({}),
  update: (model) => model,
  head: () => [Head.title("Home"), Head.meta({ name: "description", content: "The home page" })],
  view: (_, h) => h.el("h1", "Home")
})

export const PersonMessage = Schema.TaggedUnion({ Loaded: { name: Schema.String }, Visited: {}, Bump: {} })

export class LoadPerson extends Command.Service<LoadPerson>()(
  "LoadPerson",
  Effect.succeed((id: number) => Effect.succeed(PersonMessage.make({ _tag: "Loaded", name: `Person ${id}` }))),
  { server: true }
) {}

export const CountVisit = Command.make("CountVisit", () => Effect.succeed(PersonMessage.make({ _tag: "Visited" })))

export const Person = Component.make({
  name: "Person",
  props: Schema.Struct({ id: Schema.Number }),
  model: Schema.Struct({ id: Schema.Number, name: Schema.String, count: Schema.Number, visits: Schema.Number }),
  message: PersonMessage,
  init: ($) =>
    $.set({ id: $.props.id, name: "Loading", count: 0, visits: 0 }).run(LoadPerson.make($.props.id)).run(CountVisit()),
  update: (model, message) =>
    PersonMessage.match(message, {
      Loaded: ({ name }) => ({ ...model, name }),
      Visited: () => ({ ...model, visits: model.visits + 1 }),
      Bump: () => ({ ...model, count: model.count + 1 })
    }),
  head: (model) => [Head.title(model.name), Head.meta({ name: "description", content: `About ${model.name}` })],
  view: (model, h) =>
    h.el(
      "div",
      h.el("h1", model.name),
      h.el("button", `count ${model.count}`).on("click", PersonMessage.make({ _tag: "Bump" }))
    )
}).pipe(Component.provide(LoadPerson.layer))

export class SlowData extends Context.Service<SlowData, { readonly text: string }>()("test/SlowData") {}

export const Slow = Component.make({
  name: "Slow",
  model: Schema.Struct({}),
  message: Schema.Never,
  init: () => ({}),
  update: (model) => model,
  head: () => [Head.title("Slow")],
  view: (_, h) => h.el("h1", "Slow")
}).pipe(
  Component.provide(Layer.effect(SlowData, Effect.as(Effect.sleep("1 second"), { text: "ready" })))
)

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export const AppMessage = Schema.TaggedUnion({
  ChangedRoute: { route: AppRoute },
  Go: { route: AppRoute },
  Back: {},
  Block: {},
  Unblock: {},
  Navigated: { outcome: Schema.Literals(["navigated", "blocked"]) },
  Done: {}
})

const navigated = (outcome: Router.Outcome) => AppMessage.make({ _tag: "Navigated", outcome })
const done = () => AppMessage.make({ _tag: "Done" })

export const App = Component.make({
  name: "App",
  props: Schema.Struct({ route: AppRoute }),
  model: Schema.Struct({ route: AppRoute, outcomes: Schema.Array(Schema.String) }),
  message: AppMessage,
  init: ($) => ({ route: $.props.route, outcomes: [] }),
  update: (model, message, $) =>
    AppMessage.match(message, {
      ChangedRoute: ({ route }) =>
        route._tag === model.route._tag && AppRoute.print(route) === AppRoute.print(model.route)
          ? model
          : { ...model, route },
      Go: ({ route }) => $.run(Router.push(AppRoute, route).pipe(Command.map(navigated))),
      Back: () => $.run(Router.Back.make().pipe(Command.map(navigated))),
      Block: () => $.run(Router.Block.make("editing").pipe(Command.map(done))),
      Unblock: () => $.run(Router.Unblock.make("editing").pipe(Command.map(done))),
      Navigated: ({ outcome }) => ({ ...model, outcomes: [...model.outcomes, outcome] }),
      Done: () => model
    }),
  subscriptions: () => [Router.subscription(AppRoute, (route) => AppMessage.make({ _tag: "ChangedRoute", route }))],
  head: () => [Head.titleTemplate((title) => `${title} · App`), Head.lang("en")],
  view: (model, h) => {
    const go = (label: string, route: AppRoute) =>
      h.el("button", label).on("click", AppMessage.make({ _tag: "Go", route }))
    return h.el(
      "div",
      h.el(
        "nav",
        go("Home", AppRoute.make({ _tag: "Home" })),
        go("Person 1", AppRoute.make({ _tag: "Person", params: { id: 1 } })),
        go("Person 2", AppRoute.make({ _tag: "Person", params: { id: 2 } })),
        go("Slow", AppRoute.make({ _tag: "Slow" })),
        h.el("button", "Back").on("click", AppMessage.make({ _tag: "Back" })),
        h.el("button", "Block").on("click", AppMessage.make({ _tag: "Block" })),
        h.el("button", "Unblock").on("click", AppMessage.make({ _tag: "Unblock" }))
      ),
      AppRoute.match(model.route, {
        Home: (route) => h.child(Home, { key: AppRoute.print(route), props: {} }),
        Person: (route) => h.child(Person, { key: AppRoute.print(route), props: { id: route.params.id } }),
        Slow: (route) => h.child(Slow, { key: AppRoute.print(route), props: {} }),
        NotFound: () => h.el("h1", "Not found")
      })
    )
  }
})
