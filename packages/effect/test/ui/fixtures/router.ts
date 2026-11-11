/**
 * A two-page app on the Router: a root that holds the route, a home page, a
 * person page that reads its name through a loader, counts its visits (a
 * Command) and counts clicks, and a slow page whose provided Layer takes a
 * second to build.
 */
import { Context, Effect, Layer, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
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

/** Counts every fetch, so a test can see when a restore refetches. */
export const personFetches = { count: 0 }

export class GetPerson extends Loader.Service<GetPerson>()(
  "GetPerson",
  {
    args: { id: Schema.Number },
    success: Schema.String,
    error: Schema.Never,
    staleTime: "30 seconds"
  },
  Effect.succeed(({ id }) =>
    Effect.sync(() => {
      personFetches.count++
      return `Person ${id}`
    })
  )
) {}

export const PersonSnapshot = Loader.Snapshot(GetPerson, "person")

/** Renames optimistically, and never finishes: the patch stays live. */
export class RenamePerson extends Command.Service<RenamePerson>()("RenamePerson", {
  args: { id: Schema.Number },
  invalidates: () => [],
  optimistic: ({ id }) => [GetPerson.patch({ id }, () => "Renamed")]
}, Effect.succeed(() => Effect.never)) {}

export const PersonMessage = Schema.TaggedUnion({
  Loaded: { snapshot: PersonSnapshot, name: Schema.String },
  Visited: {},
  Bump: {},
  Rename: {},
  Renamed: {}
})

export const CountVisit = Command.make(
  "CountVisit",
  { args: {} },
  () => Effect.succeed(PersonMessage.make({ _tag: "Visited" }))
)

export const Person = Component.make({
  name: "Person",
  props: Schema.Struct({ id: Schema.Number }),
  model: Schema.Struct({
    id: Schema.Number,
    person: PersonSnapshot,
    name: Schema.String,
    count: Schema.Number,
    visits: Schema.Number
  }),
  message: PersonMessage,
  loaders: { person: (_model, props) => ({ id: props.id }) },
  init: ($) => $.set({ ...$.empty, id: $.props.id, name: "Loading", count: 0, visits: 0 }).run(CountVisit()),
  update: (model, message, $) =>
    PersonMessage.match(message, {
      Loaded: ({ name, snapshot }) => ({ ...model, person: snapshot, name }),
      Rename: () =>
        $.run(RenamePerson.make({ id: model.id }).pipe(Command.map(() => PersonMessage.make({ _tag: "Renamed" })))),
      Renamed: () => model,
      Visited: () => ({ ...model, visits: model.visits + 1 }),
      Bump: () => ({ ...model, count: model.count + 1 })
    }),
  subscriptions: (_model, _props, watch) => [
    watch({
      person: (snapshot, result) =>
        PersonMessage.make({
          _tag: "Loaded",
          snapshot,
          name: AsyncResult.isSuccess(result) ? result.value : "Loading"
        })
    })
  ],
  head: (model) => [Head.title(model.name), Head.meta({ name: "description", content: `About ${model.name}` })],
  view: (model, h) =>
    h.el(
      "div",
      h.el("h1", model.name),
      h.el("button", `count ${model.count}`).on("click", PersonMessage.make({ _tag: "Bump" })),
      h.el("button", "Rename").on("click", PersonMessage.make({ _tag: "Rename" }))
    )
}).pipe(Component.provide(Layer.merge(GetPerson.layer, RenamePerson.layer)))

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
  Navigated: { outcome: Schema.Literals(["navigated", "blocked"]) }
})

const navigated = (outcome: Router.Outcome) => AppMessage.make({ _tag: "Navigated", outcome })

export const App = Component.make({
  name: "App",
  props: Schema.Struct({ route: AppRoute }),
  model: Schema.Struct({ route: AppRoute, outcomes: Schema.Array(Schema.String), blocked: Schema.Boolean }),
  message: AppMessage,
  init: ($) => ({ route: $.props.route, outcomes: [], blocked: false }),
  update: (model, message, $) =>
    AppMessage.match(message, {
      ChangedRoute: ({ route }) =>
        route._tag === model.route._tag && AppRoute.print(route) === AppRoute.print(model.route)
          ? model
          : { ...model, route },
      Go: ({ route }) => $.run(Router.push(AppRoute, route).pipe(Command.map(navigated))),
      Back: () => $.run(Router.Back.make().pipe(Command.map(navigated))),
      Block: () => ({ ...model, blocked: true }),
      Unblock: () => ({ ...model, blocked: false }),
      Navigated: ({ outcome }) => ({ ...model, outcomes: [...model.outcomes, outcome] })
    }),
  subscriptions: (model) => [
    Router.subscription(AppRoute, (route) => AppMessage.make({ _tag: "ChangedRoute", route })),
    model.blocked && Router.blocked("editing")
  ],
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
