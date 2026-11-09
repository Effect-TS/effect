import { Schema } from "effect"
import { Command, Component, Head, Route, Router } from "effect/ui"
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
            Router.Push.make(AppRoute.make({ _tag: "Home" })).pipe(Command.map(() => Message.make({ _tag: "Done" })))
          )
          : model,
      subscriptions: () => [Router.subscription(AppRoute, () => Message.make({ _tag: "Done" }))],
      view: (_, h) => h.text("")
    })
    expect<Component.Requirements<typeof Nav>>().type.toBe<Router.Push | Router.Router>()
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
