import { Schema } from "effect"
import { Command, Component, Head, Route, Router, type Subscription } from "effect/ui"
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

  it("prints only the union's own route values", () => {
    expect(AppRoute.print).type.toBeCallableWith(AppRoute.make({ _tag: "Home" }))
    expect(AppRoute.print).type.not.toBeCallableWith({ _tag: "Elsewhere", params: {}, query: {} })
  })
})

describe("Router", () => {
  it("puts the navigation Commands a component runs in its requirements", () => {
    const Message = Schema.TaggedUnion({ Go: {}, Done: {} })
    const Nav = Component.make({
      name: "Nav",
      model: Schema.Struct({ n: Schema.Number }),
      message: Message,
      init: () => ({ n: 0 }),
      update: (model, message, $) =>
        message._tag === "Go"
          ? $.run(
            Router.push(AppRoute, AppRoute.make({ _tag: "Home" })).pipe(
              Command.map(() => Message.make({ _tag: "Done" }))
            )
          )
          : model,
      subscriptions: () => [Router.subscription(AppRoute, () => Message.make({ _tag: "Done" }))],
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
    expect(Router.subscription).type.not.toBeCallableWith(Tagged, () => 1)
    expect(Router.subscription(AppRoute, (route) => route._tag)).type.toBe<
      Subscription.Subscription<AppRoute["_tag"], Router.Router>
    >()
  })

  it("blocked is a Subscription a component returns while the Model says so", () => {
    expect(Router.blocked("form")).type.toBe<Subscription.Subscription<never, Router.Router>>()
    const Form = Component.make({
      name: "Form",
      model: Schema.Struct({ dirty: Schema.Boolean }),
      message: Schema.Never,
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
    expect(Component.make).type.not.toBeCallableWith({
      name: "Page",
      props: Schema.Struct({ title: Schema.String }),
      model: Schema.Struct({}),
      message: Schema.Never,
      init: () => ({}),
      update: (model: {}) => model,
      head: (_model: {}, props: { readonly title: string }) => [Head.title(props.title)],
      view: (_: {}, h: any) => h.text("")
    })
  })
})
