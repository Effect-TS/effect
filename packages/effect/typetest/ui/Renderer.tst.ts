import { Effect, Schema, type Scope } from "effect"
import { Component, Renderer, Route, Router } from "effect/ui"
import { TestHost } from "effect/ui/testing"
import { describe, expect, it } from "tstyche"
import { Counter } from "../../test/ui/fixtures/components.ts"
import { Tiny, type TinyField, type TinyHost } from "../../test/ui/fixtures/vocabulary.ts"

const Msg = Schema.TaggedUnion({ Typed: { value: Schema.String }, Mounted: {} })
const Field = Renderer.ref<TinyField>("Field")

describe("Renderer", () => {
  it("mount requires the root vocabulary's host marker", () => {
    const Form = Component.make({
      name: "Form",
      model: Schema.String,
      message: Msg,
      elements: Tiny,
      init: () => "",
      update: (model) => model,
      view: (_, h) => h.box(h.field())
    })
    expect(Renderer.mount(Form, {}, null)).type.toBe<
      Effect.Effect<Renderer.Root<string, typeof Msg.Type>, never, TinyHost | Renderer.Renderer | Scope.Scope>
    >()
  })

  it("a host-neutral root needs no marker", () => {
    expect(Renderer.mount(Counter, { initial: 0 }, null)).type.toBe<
      Effect.Effect<
        Renderer.Root<{ readonly count: number }, typeof Counter.message.Type>,
        never,
        Renderer.Renderer | Scope.Scope
      >
    >()
  })

  it("TestHost mounts any vocabulary", () => {
    const Form = Component.make({
      name: "Form",
      model: Schema.String,
      message: Msg,
      elements: Tiny,
      init: () => "",
      update: (model) => model,
      view: (_, h) => h.box(h.field())
    })
    expect(TestHost.mount(Form, {})).type.toBe<
      Effect.Effect<TestHost.TestRoot<string, typeof Msg.Type, never>, never, TestHost.TestHost | Scope.Scope>
    >()
  })
})

describe("Effect props", () => {
  const AppRoute = Route.union({ Home: Route.make("/"), NotFound: Route.make("/*") })
  type AppRoute = typeof AppRoute.Type
  const App = Component.make({
    name: "App",
    props: Schema.Struct({ route: AppRoute }),
    model: AppRoute,
    message: Schema.Never,
    init: ($) => $.props.route,
    update: (route) => route,
    view: (route, h) => h.text(route._tag)
  })

  it("Router.props reads the route props from the Router", () => {
    expect(Router.props(AppRoute)).type.toBe<Effect.Effect<{ readonly route: AppRoute }, never, Router.Router>>()
  })

  it("mount and prerender add the props' requirements", () => {
    expect(Renderer.mount(App, Router.props(AppRoute), null)).type.toBe<
      Effect.Effect<Renderer.Root<AppRoute, never>, never, Router.Router | Renderer.Renderer | Scope.Scope>
    >()
    expect(Renderer.prerender(App, Router.props(AppRoute))).type.toBe<
      Effect.Effect<Renderer.Prerendered<AppRoute>, never, Router.Router>
    >()
    expect(TestHost.mount(App, Router.props(AppRoute))).type.toBe<
      Effect.Effect<TestHost.TestRoot<AppRoute, never, never>, never, Router.Router | TestHost.TestHost | Scope.Scope>
    >()
  })

  it("plain props still infer and add nothing", () => {
    expect(Renderer.mount(App, { route: AppRoute.make({ _tag: "Home" }) }, null)).type.toBe<
      Effect.Effect<Renderer.Root<AppRoute, never>, never, Renderer.Renderer | Scope.Scope>
    >()
    expect(TestHost.mount(App, { route: AppRoute.make({ _tag: "Home" }) })).type.toBe<
      Effect.Effect<TestHost.TestRoot<AppRoute, never, never>, never, TestHost.TestHost | Scope.Scope>
    >()
  })

  it("rejects props, plain or as an Effect, of the wrong shape", () => {
    expect(TestHost.mount).type.not.toBeCallableWith(App, { route: "/" })
    expect(TestHost.mount).type.not.toBeCallableWith(App, Effect.succeed({ route: "/" }))
  })
})

describe("View elements", () => {
  it("refs are typed by the node they reach", () => {
    Component.make({
      name: "Refs",
      model: Schema.String,
      message: Msg,
      elements: Tiny,
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.field().ref(Field)).type.not.toRaiseError()
        expect(h.box().ref).type.not.toBeCallableWith(Field)
        return h.box()
      }
    })
  })

  it("onMount types the node and joins the component's requirements", () => {
    Component.make({
      name: "Mounts",
      model: Schema.String,
      message: Msg,
      elements: Tiny,
      init: () => "",
      update: (model) => model,
      view: (_, h) =>
        h.field().onMount("focus", (node) => {
          expect(node).type.toBe<TinyField>()
          return Effect.succeed(Msg.make({ _tag: "Mounted" }))
        })
    })
  })

  it("handlers get the vocabulary's payload and return the component's messages", () => {
    Component.make({
      name: "Events",
      model: Schema.String,
      message: Msg,
      elements: Tiny,
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.field().on).type.toBeCallableWith(
          "input",
          ({ value }: { readonly value: string }) => Msg.make({ _tag: "Typed", value })
        )
        expect(h.field().on).type.not.toBeCallableWith("click", Msg.make({ _tag: "Mounted" }))
        expect(h.field().on).type.not.toBeCallableWith("input", "not a message")
        return h.box()
      }
    })
  })

  it("refs are invariant in their node", () => {
    expect(Field.at("row-1")).type.toBe<Renderer.Ref<TinyField>>()
    expect<Renderer.Ref<unknown>>().type.not.toBeAssignableFrom(Field)
  })
})
