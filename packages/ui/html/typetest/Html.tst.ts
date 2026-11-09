import { BrowserHost, Html } from "@effect/ui-html"
import { Effect, Schema, type Scope } from "effect"
import { Component, Renderer, type View } from "effect/ui"
import { describe, expect, it } from "tstyche"

const Msg = Schema.TaggedUnion({
  Typed: { value: Schema.String },
  Checked: { checked: Schema.Boolean },
  Sent: { title: Schema.String },
  Focused: { found: Schema.Boolean },
  Mounted: {}
})
type Msg = typeof Msg.Type

const Field = Html.ref("Field", "input")

interface NativeTags<Msg> {
  readonly view: () => View.ElementBuilder<Msg>
}
interface NativeHost {
  readonly NativeHost: unique symbol
}
interface Native extends View.Elements {
  readonly Tags: NativeTags<this["Msg"]>
  readonly Host: NativeHost
}

describe("Html", () => {
  it("the module is a vocabulary", () => {
    expect(Html).type.toBeAssignableTo<View.Vocabulary<Html.Elements>>()
    Component.make({
      name: "Tags",
      model: Schema.String,
      message: Msg,
      elements: Html,
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.div(h.span("text"), "more")).type.toBe<
          Html.Element<Msg, never, Html.EventsOf<"div">, HTMLDivElement>
        >()
        expect(h.input()).type.toBe<Html.Element<Msg, never, Html.EventsOf<"input">, HTMLInputElement>>()
        expect(h).type.not.toHaveProperty("script")
        expect(h.input).type.not.toBeCallableWith("child")
        return h.div()
      }
    })
  })

  it("events carry the tag's payloads", () => {
    Component.make({
      name: "Events",
      model: Schema.String,
      message: Msg,
      elements: Html,
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.input().onInput).type.toBeCallableWith(
          ({ checked }: Html.InputPayload) => Msg.make({ _tag: "Checked", checked })
        )
        expect(h.textarea().on).type.toBeCallableWith(
          "input",
          ({ value }: Html.ValuePayload) => Msg.make({ _tag: "Typed", value })
        )
        expect(h.form().onSubmit).type.toBeCallableWith(({ fields }: Html.SubmitPayload) =>
          Msg.make({ _tag: "Sent", title: fields.title ?? "" })
        )
        expect(h.button().onClick).type.toBeCallableWith(({ shift }: Html.PointerPayload) =>
          shift ? undefined : Msg.make({ _tag: "Mounted" })
        )
        expect(h.div().on).type.not.toBeCallableWith("input", Msg.make({ _tag: "Mounted" }))
        expect(h.div().on).type.not.toBeCallableWith("submit", Msg.make({ _tag: "Mounted" }))
        expect(h.button().onClick).type.not.toBeCallableWith("not a message")
        return h.div()
      }
    })
  })

  it("controlled properties exist on the elements that have them", () => {
    Component.make({
      name: "Controlled",
      model: Schema.String,
      message: Msg,
      elements: Html,
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.input().value).type.toBeCallableWith("text")
        expect(h.select().value).type.toBeCallableWith("a")
        expect(h.input().checked).type.toBeCallableWith(true)
        expect(h.option().selected).type.toBeCallableWith(true)
        expect(h.details().open).type.toBeCallableWith(true)
        expect(h.div().value).type.not.toBeCallableWith("text")
        expect(h.select().checked).type.not.toBeCallableWith(true)
        expect(h.input().open).type.not.toBeCallableWith(true)
        return h.div()
      }
    })
  })

  it("refs and onMount are typed by tag", () => {
    expect(Field).type.toBe<Renderer.Ref<HTMLInputElement>>()
    Component.make({
      name: "Refs",
      model: Schema.String,
      message: Msg,
      elements: Html,
      init: () => "",
      update: (model) => model,
      view: (_, h) => {
        expect(h.input().ref).type.toBeCallableWith(Field)
        expect(h.textarea().ref).type.not.toBeCallableWith(Field)
        return h.input().onMount("focus", (element) => {
          expect(element).type.toBe<HTMLInputElement>()
          return Effect.succeed(Msg.make({ _tag: "Mounted" }))
        })
      }
    })
  })

  it("ref Commands add nothing to a component's requirements", () => {
    const Form = Component.make({
      name: "Form",
      model: Schema.String,
      message: Msg,
      elements: Html,
      init: () => "",
      update: (_model, _, $) => $.run(Html.focus(Field, ({ found }) => Msg.make({ _tag: "Focused", found }))),
      view: (_, h) => h.input().ref(Field)
    })
    expect(Form).type.toBe<Component.Component<"Form", {}, string, Msg, never, never, Html.Elements>>()
  })
})

describe("BrowserHost", () => {
  const Counter = Component.make({
    name: "Counter",
    model: Schema.Number,
    message: Msg,
    elements: Html,
    init: () => 0,
    update: (count) => count + 1,
    view: (count, h) => h.button(String(count)).onClick(Msg.make({ _tag: "Mounted" }))
  })

  it("mount needs only a Scope for an HTML root", () => {
    expect(BrowserHost.mount(Counter, {}, document.body)).type.toBe<
      Effect.Effect<Renderer.Root<number, Msg>, never, Scope.Scope>
    >()
  })

  it("Renderer.mount of an HTML root needs Html.Host", () => {
    expect(Renderer.mount(Counter, {}, document.body)).type.toBe<
      Effect.Effect<Renderer.Root<number, Msg>, never, Html.Host | Renderer.Renderer | Scope.Scope>
    >()
  })

  it("mount rejects a root of another vocabulary", () => {
    const Native: View.Vocabulary<Native> = { name: "native", tags: {} }
    const App = Component.make({
      name: "App",
      model: Schema.Number,
      message: Msg,
      elements: Native,
      init: () => 0,
      update: (count) => count,
      view: (_, h) => h.view()
    })
    expect(BrowserHost.mount).type.not.toBeCallableWith(App, {}, document.body)
  })
})
