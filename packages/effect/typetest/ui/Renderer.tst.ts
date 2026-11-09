import { Effect, Schema, type Scope } from "effect"
import { Component, Renderer } from "effect/ui"
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
