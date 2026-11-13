import { Effect, Schema } from "effect"
import { AsyncResult, Loader } from "effect/reactivity"
import { Command, Component, Feature, Head, Route, Router, type Subscription } from "effect/ui"
import { TestHost } from "effect/ui/testing"
import { describe, expect, it } from "tstyche"

const AppRoute = Route.union({
  Home: Route.make("/"),
  Person: Route.make("/people/:id", { params: { id: Schema.Number }, query: { tab: Schema.optional(Schema.String) } }),
  Files: Route.make("/files/*"),
  NotFound: Route.make("/*")
})
type AppRoute = typeof AppRoute.Type

describe("Route", () => {
  it("requires a Schema for every :param", () => {
    expect(Route.make).type.not.toBeCallableWith("/people/:id")
    expect(Route.make).type.not.toBeCallableWith("/people/:id", { params: {} })
    expect(Route.make).type.not.toBeCallableWith("/people/:id/:tab", { params: { id: Schema.Number } })
    expect(Route.make).type.toBeCallableWith("/people/:id", { params: { id: Schema.Number } })
    expect(Route.make).type.toBeCallableWith("/people", { query: { q: Schema.String } })
  })

  it("types each route value, with a rest param for a trailing *", () => {
    expect<Extract<AppRoute, { _tag: "Home" }>>().type.toBe<
      { readonly _tag: "Home"; readonly params: {}; readonly query: {} }
    >()
    expect<Extract<AppRoute, { _tag: "Person" }>>().type.toBe<{
      readonly _tag: "Person"
      readonly params: { readonly id: number }
      readonly query: { readonly tab?: string | undefined }
    }>()
    expect<Extract<AppRoute, { _tag: "Files" }>["params"]>().type.toBe<{ readonly "*": string }>()
  })

  it("types a defaulted query field as required, and lets make leave it out", () => {
    const Search = Route.union({
      Search: Route.make("/search", {
        query: {
          q: Schema.optional(Schema.String),
          page: Schema.Number.pipe(Schema.withDecodingDefaultKey(Effect.succeed(1)))
        }
      })
    })
    expect<typeof Search.Type["query"]>().type.toBe<{ readonly q?: string | undefined; readonly page: number }>()
    expect(Search.make).type.toBeCallableWith({ _tag: "Search" })
    expect(Search.make).type.toBeCallableWith({ _tag: "Search", query: { q: "a" } })
    expect(Search.make).type.toBeCallableWith({ _tag: "Search", query: { page: 2 } })
    expect(Search.make).type.not.toBeCallableWith({ _tag: "Search", query: { page: "2" } })
  })

  it("prints only the union's own route values", () => {
    expect(AppRoute.print).type.toBeCallableWith(AppRoute.make({ _tag: "Home" }))
    expect(AppRoute.print).type.not.toBeCallableWith({ _tag: "Elsewhere", params: {}, query: {} })
  })
})

describe("Router", () => {
  it("puts the navigation Commands a component runs in its requirements", () => {
    const Message = Schema.TaggedUnion({ Go: {}, Done: {} })
    const Nav = Component.define({
      name: "Nav",
      model: Schema.Struct({ n: Schema.Number }),
      message: Message
    }).make({
      init: () => ({ n: 0 }),
      update: (model, message, $) =>
        message._tag === "Go"
          ? $.run(
            Router.push(AppRoute, AppRoute.make({ _tag: "Home" })).pipe(
              Command.map(() => Message.make({ _tag: "Done" }))
            )
          )
          : model,
      subscriptions: () => [Router.subscription(AppRoute, AppRoute.make({ _tag: "Home" }), () =>
        Message.make({ _tag: "Done" }))],
      view: (_, h) => h.text("")
    })
    expect<Component.Requirements<typeof Nav>>().type.toBe<Router.Push | Router.Router>()
  })

  it("takes only complete route values of the given union", () => {
    const person = AppRoute.make({ _tag: "Person", params: { id: 1 } })
    expect(Router.push).type.toBeCallableWith(AppRoute, person)
    const People = AppRoute.subset(["Person"])
    expect(Router.replace).type.toBeCallableWith(People, People.make({ _tag: "Person", params: { id: 1 } }))
    expect(Router.push).type.not.toBeCallableWith(AppRoute, { _tag: "Person" })
    expect(Router.push).type.not.toBeCallableWith(AppRoute, { _tag: "Person", params: {}, query: {} })
    expect(Router.replace).type.not.toBeCallableWith(AppRoute, { _tag: "Elsewhere", params: {}, query: {} })
    expect(Router.push).type.not.toBeCallableWith(AppRoute.subset(["Home"]), {
      _tag: "Person",
      params: { id: 1 },
      query: {}
    })
    // The Command classes only take what push and replace build.
    expect(Router.Push.make).type.not.toBeCallableWith({ _tag: "Person" })
    expect(Router.Replace.make).type.not.toBeCallableWith(person)
  })

  it("subscribes only to a route union", () => {
    const Tagged = Schema.TaggedUnion({ Home: {} })
    expect(Router.subscription).type.not.toBeCallableWith(Tagged, { _tag: "Home" }, () => 1)
    expect(Router.subscription).type.not.toBeCallableWith(AppRoute, { _tag: "Person" }, () => 1)
    expect(Router.subscription).type.not.toBeCallableWith(
      AppRoute.subset(["Home"]),
      AppRoute.make({ _tag: "Person", params: { id: 1 } }),
      () => 1
    )
    expect(Router.subscription(AppRoute, AppRoute.make({ _tag: "Home" }), (route) => route._tag)).type.toBe<
      Subscription.Subscription<AppRoute["_tag"], Router.Router>
    >()
  })

  it("blocked is a Subscription a component returns while the Model says so", () => {
    expect(Router.blocked("form")).type.toBe<Subscription.Subscription<never, Router.Router>>()
    const Form = Component.define({
      name: "Form",
      model: Schema.Struct({ dirty: Schema.Boolean }),
      message: Schema.Never
    }).make({
      init: () => ({ dirty: false }),
      update: (model) => model,
      subscriptions: (model) => [model.dirty && Router.blocked("form")],
      view: (_, h) => h.text("")
    })
    expect<Component.Requirements<typeof Form>>().type.toBe<Router.Router>()
    expect(Router).type.not.toHaveProperty("Block")
    expect(Router).type.not.toHaveProperty("Unblock")
  })

  it("gives head only the Model", () => {
    const PageDef = Component.define({
      name: "Page",
      props: Schema.Struct({ title: Schema.String }),
      model: Schema.Struct({}),
      message: Schema.Never
    })
    expect(PageDef.make).type.not.toBeCallableWith({
      init: () => ({}),
      update: (model: {}) => model,
      head: (_model: {}, props: { readonly title: string }) => [Head.title(props.title)],
      view: (_: {}, h: any) => h.text("")
    })
  })
})

class GetPerson extends Loader.Service<GetPerson>()(
  "typetest/GetPerson",
  { args: { id: Schema.Number }, success: Schema.String, error: Schema.Never, staleTime: "1 minute" },
  Effect.succeed(({ id }) => Effect.succeed(`Person ${id}`))
) {}

const PersonPage = Component.define({
  name: "PersonPage",
  props: Schema.Struct({ id: Schema.Number }),
  model: Schema.Struct({}),
  message: Schema.Never,
  loaders: { person: { load: GetPerson, args: (_model, props) => ({ id: props.id }) } }
}).make({
  init: () => ({}),
  update: (model) => model,
  view: (_, h) => h.text(AsyncResult.isSuccess(h.loaded.person) ? h.loaded.person.value : "person")
})

const HomePage = Component.define({
  name: "HomePage",
  model: Schema.Struct({}),
  message: Schema.Never
}).make({
  init: () => ({}),
  update: (model) => model,
  view: (_, h) => h.text("home")
})

/** Declares the person page, which provides its own read. */
const Declarer = Component.define({
  name: "Declarer",
  model: Schema.Struct({}),
  message: Schema.Never
}).make({
  init: () => ({}),
  update: (model) => model,
  subscriptions: () => [
    Router.prefetch(AppRoute, {
      Home: () => [Router.page(HomePage)],
      Person: ({ params }) => [Router.page(PersonPage.pipe(Component.provide(GetPerson.layer)), { id: params.id })],
      Files: () => [],
      NotFound: () => []
    })
  ],
  view: (_, h) => h.text("app")
})

describe("Router.prefetch", () => {
  it("adds a page's own reads to the declarer's requirements, even when the page provides them", () => {
    expect<Component.Requirements<typeof Declarer>>().type.toBe<Router.Router | GetPerson>()
    const mounted = TestHost.mount(Declarer, {}).pipe(
      Effect.provide(Router.memory({ routes: AppRoute })),
      Effect.provide(TestHost.layer()),
      Effect.scoped
    )
    // The page's provide can't satisfy the declarer: a compile error at mount.
    expect(Effect.runPromise).type.not.toBeCallableWith(mounted)
    expect(Effect.runPromise).type.toBeCallableWith(mounted.pipe(Effect.provide(GetPerson.layer)))
    // Hoisted to the declarer, it does.
    const Hoisted = Declarer.pipe(Component.provide(GetPerson.layer))
    expect<Component.Requirements<typeof Hoisted>>().type.toBe<Router.Router>()
    expect(Router.page(PersonPage, { id: 1 })).type.toBe<Router.Page<GetPerson>>()
    // Provided, it is still a component, and still names its reads.
    expect(Router.page(PersonPage.pipe(Component.provide(GetPerson.layer)), { id: 1 })).type.toBe<
      Router.Page<GetPerson>
    >()
    // For a union of components, each member's reads are kept.
    const Selected = Math.random() > 0.5 ? PersonPage : HomePage
    expect(Router.page(Selected, { id: 1 })).type.toBe<Router.Page<GetPerson>>()
    const Provided = Math.random() > 0.5 ? PersonPage.pipe(Component.provide(GetPerson.layer)) : HomePage
    expect(Router.page(Provided, { id: 1 })).type.toBe<Router.Page<GetPerson>>()
    // Declared, the union's reads join the declarer's requirements.
    const UnionDeclarer = Component.define({
      name: "UnionDeclarer",
      model: Schema.Struct({}),
      message: Schema.Never
    }).make({
      init: () => ({}),
      update: (model) => model,
      subscriptions: () => [
        Router.prefetch(AppRoute, {
          Home: () => [],
          Person: ({ params }) => [Router.page(Selected, { id: params.id })],
          Files: () => [],
          NotFound: () => []
        })
      ],
      view: (_, h) => h.text("app")
    })
    expect<Component.Requirements<typeof UnionDeclarer>>().type.toBe<Router.Router | GetPerson>()
  })

  it("rejects a Mountable, whose erased Model hides the page's reads", () => {
    const Erased: Component.Mountable<{ readonly id: number }, never, GetPerson> = PersonPage
    expect(Router.page).type.not.toBeCallableWith(Erased, { id: 1 })
    class Badge extends Feature.Service<Badge>()("Badge", { props: Schema.Struct({}), events: Schema.Never }) {}
    expect(Router.page).type.not.toBeCallableWith(Badge)
    expect(Router.page).type.toBeCallableWith(PersonPage, { id: 1 })
    expect(Router.page).type.toBeCallableWith(PersonPage.pipe(Component.provide(GetPerson.layer)), { id: 1 })
  })

  it("rejects an erased member of a union of components", () => {
    const Selected = Math.random() > 0.5 ? PersonPage : HomePage
    expect(Router.page).type.toBeCallableWith(Selected, { id: 1 })
    const Erased: Component.Mountable<{ readonly id: number }, never, GetPerson> = PersonPage
    const Mixed = Math.random() > 0.5 ? Erased : HomePage
    expect(Router.page).type.not.toBeCallableWith(Mixed, { id: 1 })
  })

  it("takes props like h.child, and a handler for every route", () => {
    expect(Router.page).type.toBeCallableWith(HomePage)
    expect(Router.page).type.not.toBeCallableWith(PersonPage)
    expect(Router.page).type.not.toBeCallableWith(PersonPage, { id: "1" })
    expect(Router.prefetch).type.not.toBeCallableWith(AppRoute, { Home: () => [] })
    expect(Router.prefetch).type.toBeCallableWith(AppRoute.subset(["Home"]), { Home: () => [] })
  })
})
