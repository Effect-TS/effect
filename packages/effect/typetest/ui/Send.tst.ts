import { Context, Layer, Schema } from "effect"
import { Component, Feature, type View } from "effect/ui"
import { Story, TestHost } from "effect/ui/testing"
import { describe, expect, it } from "tstyche"

const EditorMessage = Schema.TaggedUnion({ Clear: {}, Focus: {}, Typed: { text: Schema.String } })
type EditorMessage = typeof EditorMessage.Type
type Received = Extract<EditorMessage, { readonly _tag: "Clear" | "Focus" }>

const Editor = Component.define({
  name: "Editor",
  model: Schema.String,
  message: EditorMessage,
  receives: ["Clear", "Focus"]
}).make({
  init: () => "",
  update: (text, message) => message._tag === "Typed" ? message.text : message._tag === "Clear" ? "" : text,
  view: (text, h) => h.el("p", text)
})

// Receives Clear only.
const Note = Component.define({
  name: "Note",
  model: Schema.String,
  message: EditorMessage,
  receives: ["Clear"]
}).make({
  init: () => "",
  update: (text) => text,
  view: (text, h) => h.el("p", text)
})

const Plain = Component.define({ name: "Plain", model: Schema.Null, message: EditorMessage }).make({
  init: () => null,
  update: (model) => model,
  view: (_, h) => h.el("p")
})

const Draft = Editor.ref("Draft")
const Rows = Note.ref("Row")

class Store extends Context.Service<Store, { readonly draft: string }>()("typetest/send/Store") {}
const ProvidedEditor = Component.provide(Editor, Layer.succeed(Store, { draft: "" }))

// Receives Clear, and requires Store.
declare const NeedsStore: Component.Component<
  "NeedsStore",
  {},
  string,
  EditorMessage,
  never,
  Store,
  never,
  {},
  Extract<EditorMessage, { readonly _tag: "Clear" }>
>

const TodosMessage = Schema.TaggedUnion({ Clear: {} })
class Todos extends Feature.Service<Todos>()("Todos", {
  props: Schema.Struct({}),
  receives: TodosMessage
}) {}

declare const condition: boolean
// Either one of two components, and only Editor receives Clear and Focus.
const EditorOrPlain = condition ? Editor : Plain
const EditorOrNote = condition ? Editor : Note

// Erased: its receives are `any`, which grants nothing.
declare const ErasedPlain: Component.Component<"ErasedPlain", {}, null, EditorMessage, never, never, never, {}, any>
declare const anyFeature: Feature.Any

declare const untrusted: unknown
declare const arbitraryObject: object

const ParentMessage = Schema.TaggedUnion({ Go: {} })
const ParentDef = Component.define({ name: "Parent", model: Schema.Null, message: ParentMessage })

describe("Component receives", () => {
  it("is the Schema of the listed cases, and a ref carries them", () => {
    expect(Editor.receives).type.toBe<Schema.Codec<Received, any>>()
    expect<Component.Receives<typeof Editor>>().type.toBe<Received>()
    expect(Draft).type.toBe<Component.Ref<Received, EditorMessage>>()
    expect(Draft.at(1)).type.toBe<Component.Ref<Received, EditorMessage>>()
    expect<Component.Receives<typeof Plain>>().type.toBe<never>()
  })

  it("rejects a tag that isn't one of the message's", () => {
    expect(Component.define).type.not.toBeCallableWith({
      name: "Bad",
      model: Schema.Null,
      message: EditorMessage,
      receives: ["Delete"]
    })
  })

  it("keeps what a provided component receives", () => {
    expect<Component.Receives<typeof ProvidedEditor>>().type.toBe<Received>()
  })
})

describe("$.send", () => {
  it("takes a message the ref's component receives, and rejects any other", () => {
    ParentDef.update((model, _msg, $) => {
      expect($.send(Draft, { _tag: "Clear" })).type.not.toRaiseError()
      // `make` returns the whole Message: its tag is checked when the send is made.
      expect($.send(Draft, EditorMessage.make({ _tag: "Clear" }))).type.not.toRaiseError()
      expect($.send(Draft, EditorMessage.cases.Focus.make({}))).type.not.toRaiseError()
      // A case narrowed to one the component doesn't receive is still rejected.
      expect($.send).type.not.toBeCallableWith(Draft, EditorMessage.cases.Typed.make({ text: "x" }))
      // A component that receives nothing takes nothing, not even `make`'s result.
      expect($.send).type.not.toBeCallableWith(Plain.ref("P"), EditorMessage.make({ _tag: "Clear" }))
      expect($.send(Todos.ref("Main"), TodosMessage.make({ _tag: "Clear" }))).type.not.toRaiseError()
      // Wider than the child's Message: nothing says the value is one.
      expect($.send).type.not.toBeCallableWith(Draft, untrusted)
      expect($.send).type.not.toBeCallableWith(Draft, arbitraryObject)
      expect($.send).type.not.toBeCallableWith(Draft, { _tag: "Clear" } as { readonly _tag: string })
      expect($.send).type.not.toBeCallableWith(Draft, { _tag: "Typed", text: "x" })
      expect($.send).type.not.toBeCallableWith(Plain.ref("P"), { _tag: "Clear" })
      expect($.send).type.not.toBeCallableWith(Rows.at(1), { _tag: "Focus" })
      return model
    })
  })

  it("takes nothing through an erased ref, from any public output, and keeps concrete refs", () => {
    ParentDef.view((_, h) => {
      // A slot's `component` is `Component.Any | Feature.Any`, and `Feature.Any`'s ref receives `any`.
      const target = h.child(Todos, { ref: Todos.ref("Main"), fallback: () => h.el("p") }).component
      if (Feature.isService(target)) {
        const erased = target.ref("Main")
        ParentDef.update((model, _msg, $) => {
          expect($.send).type.not.toBeCallableWith(erased, { _tag: "Clear" })
          expect($.send).type.not.toBeCallableWith(erased, { arbitrary: 1 })
          expect($.send).type.not.toBeCallableWith(erased.at("t1"), { arbitrary: 1 })
          return model
        })
      }
      // A slot's `ref` receives `unknown`.
      const slotRef = h.child(Editor, { ref: Draft }).ref!
      ParentDef.update((model, _msg, $) => {
        expect($.send).type.not.toBeCallableWith(slotRef, { _tag: "Clear" })
        expect($.send).type.not.toBeCallableWith(slotRef.at(1), { arbitrary: 1 })
        return model
      })
      return h.el("p")
    })
    ParentDef.update((model, _msg, $) => {
      // What a step sent, and what `isRef` narrows to.
      const sent = $.send(Draft, { _tag: "Clear" }).sends[0]!.ref
      expect($.send).type.not.toBeCallableWith(sent, { arbitrary: 1 })
      if (Component.isRef(untrusted)) expect($.send).type.not.toBeCallableWith(untrusted.at("x"), { _tag: "Clear" })
      // A component whose receives are `any`.
      expect($.send).type.not.toBeCallableWith(ErasedPlain.ref("E"), { arbitrary: 1 })
      expect($.send).type.not.toBeCallableWith(ErasedPlain.ref("E").at(1), { _tag: "Clear" })
      // Concrete refs, and their rows, still infer.
      expect($.send(Draft.at("a"), { _tag: "Focus" })).type.not.toRaiseError()
      expect($.send(Rows.at(1), EditorMessage.make({ _tag: "Clear" }))).type.not.toRaiseError()
      expect($.send(Todos.ref("Main").at(2), { _tag: "Clear" })).type.not.toRaiseError()
      return model
    })
  })

  it("isn't available in init", () => {
    ParentDef.make({
      init: ($) => {
        expect($.set(null)).type.not.toHaveProperty("send")
        return null
      },
      update: (model) => model,
      view: (_, h) => h.el("p")
    })
  })
})

describe("h.child with a ref", () => {
  it("takes a ref in place of a key, and rejects both or neither", () => {
    ParentDef.view((_, h) => {
      expect(h.child(Editor, { ref: Draft })).type.not.toRaiseError()
      expect(h.child(Note, { ref: Rows.at("t1") })).type.not.toRaiseError()
      expect(h.child).type.not.toBeCallableWith(Editor, { key: "a", ref: Draft })
      expect(h.child).type.not.toBeCallableWith(Editor, {})
      return h.el("p")
    })
  })

  it("checks the ref against what the component receives", () => {
    ParentDef.view((_, h) => {
      // A provided copy receives what the component does.
      expect(h.child(ProvidedEditor, { ref: Draft })).type.not.toRaiseError()
      // Editor receives Clear, so a ref for Clear only fits it.
      expect(h.child(Editor, { ref: Rows })).type.not.toRaiseError()
      // Note doesn't receive Focus.
      expect(h.child).type.not.toBeCallableWith(Note, { ref: Draft })
      expect(h.child).type.not.toBeCallableWith(Plain, { ref: Draft })
      return h.el("p")
    })
  })

  it("takes a feature's ref, on the feature or on an implementation", () => {
    const Main = Todos.ref("Main")
    expect(Main).type.toBe<Component.Ref<typeof TodosMessage.Type, typeof TodosMessage.Type>>()
    ParentDef.view((_, h) => {
      expect(h.child(Todos, { ref: Main, fallback: () => h.el("p") })).type.not.toRaiseError()
      expect(h.child(Editor, { ref: Main })).type.not.toRaiseError()
      expect(h.child).type.not.toBeCallableWith(Plain, { ref: Main })
      return h.el("p")
    })
  })

  it("checks a union of components against each member", () => {
    ParentDef.view((_, h) => {
      expect(h.child(EditorOrNote, { ref: Rows })).type.not.toRaiseError()
      expect(h.child).type.not.toBeCallableWith(EditorOrNote, { ref: Draft })
      expect(h.child).type.not.toBeCallableWith(EditorOrPlain, { ref: Rows })
      return h.el("p")
    })
  })

  it("rejects a ref when explicit type arguments leave Rcv out", () => {
    ParentDef.view((_, h) => {
      expect(h.child<{}, never, never>).type.not.toBeCallableWith(Plain, { ref: Rows })
      expect(h.child<{}, never, never>).type.not.toBeCallableWith(Editor, { ref: Rows })
      expect(h.child<{}, never, never>(Plain, { key: "a" })).type.not.toRaiseError()
      // Rcv given explicitly is checked against the component.
      expect(h.child<{}, never, never, Received>).type.not.toBeCallableWith(Plain, { ref: Draft })
      expect(h.child<{}, never, never, Received>(Editor, { ref: Draft })).type.not.toRaiseError()
      return h.el("p")
    })
  })

  it("keeps requirements and provided components", () => {
    ParentDef.view((_, h) => {
      expect(h.child(NeedsStore, { ref: Rows })).type.toBe<View.Child<typeof ParentMessage.Type, Store>>()
      expect(h.child(Editor.pipe(Component.provide(Layer.succeed(Store, { draft: "" }))), { ref: Draft })).type
        .not.toRaiseError()
      // Provided inline, data-first.
      expect(h.child(Component.provide(Editor, Layer.succeed(Store, { draft: "" })), { ref: Draft })).type.toBe<
        View.Child<typeof ParentMessage.Type, never>
      >()
      expect(h.child(Component.provide(NeedsStore, Layer.empty), { ref: Rows })).type.toBe<
        View.Child<typeof ParentMessage.Type, Store>
      >()
      expect(h.child).type.not.toBeCallableWith(Component.provide(Note, Layer.empty), { ref: Draft })
      expect(h.child).type.not.toBeCallableWith(Component.provide(Plain, Layer.empty), { ref: Rows })
      return h.el("p")
    })
  })

  it("rejects a ref for an erased component or feature", () => {
    const erased = Story.start(Plain, {}).current.component
    ParentDef.view((_, h) => {
      expect(h.child).type.not.toBeCallableWith(erased, { ref: Rows })
      expect(h.child).type.not.toBeCallableWith(ErasedPlain, { ref: Rows })
      expect(h.child).type.not.toBeCallableWith(anyFeature, { ref: Rows, fallback: () => h.el("p") })
      expect(h.child(erased, { key: "a" })).type.not.toRaiseError()
      expect(h.child(ErasedPlain, { key: "a" })).type.not.toRaiseError()
      return h.el("p")
    })
  })
})

describe("Mountable", () => {
  it("can't claim a message the component doesn't receive", () => {
    expect<Component.Mountable<{}, never, never, Received>>().type.not.toBeAssignableFrom(Plain)
    expect<Component.Mountable<{}, never, never, Received>>().type.not.toBeAssignableFrom(Note)
  })

  it("takes a component that receives more, or anything with Rcv left out", () => {
    expect<Component.Mountable<{}, never, never, Received>>().type.toBeAssignableFrom(Editor)
    expect<Component.Mountable<{}, never, never, Extract<Received, { readonly _tag: "Clear" }>>>().type
      .toBeAssignableFrom(Editor)
    expect<Component.Mountable<{}, never, never>>().type.toBeAssignableFrom(Plain)
    expect<Component.Mountable<{}, never, never>>().type.toBeAssignableFrom(Editor)
  })
})

describe("Feature receives", () => {
  it("toLayer takes an implementation that receives every case, or more", () => {
    expect(Todos.toLayer(Note)).type.toBe<Layer.Layer<Todos, never, never>>()
    expect(Todos.toLayer(Editor)).type.toBe<Layer.Layer<Todos, never, never>>()
  })

  it("toLayer rejects an implementation that misses a case", () => {
    expect(Todos.toLayer).type.not.toBeCallableWith(Plain)
    // Each member of a union must receive every case.
    expect(Todos.toLayer).type.not.toBeCallableWith(EditorOrPlain)
    expect(Todos.toLayer(EditorOrNote)).type.toBe<Layer.Layer<Todos, never, never>>()
    // Explicit type arguments leave Rcv out, and that receives nothing.
    expect(Todos.toLayer<never>).type.not.toBeCallableWith(Plain)
    expect(Todos.toLayer<never>).type.not.toBeCallableWith(Note)
    expect(Todos.toLayer(NeedsStore)).type.toBe<Layer.Layer<Todos, never, Store>>()
    expect(Todos.toLayer(Component.provide(NeedsStore, Layer.succeed(Store, { draft: "" })))).type.toBe<
      Layer.Layer<Todos, never, never>
    >()
  })

  it("toLayer rejects an erased component", () => {
    expect(Todos.toLayer).type.not.toBeCallableWith(Story.start(Plain, {}).current.component)
    expect(Todos.toLayer).type.not.toBeCallableWith(ErasedPlain)
  })
})

describe("a component that receives", () => {
  it("mounts, and runs in a story", () => {
    expect(TestHost.mount(Editor, {})).type.not.toRaiseError()
    expect(Story.make(Editor, {}, (s) => s.send(EditorMessage.make({ _tag: "Clear" })))).type.not.toRaiseError()
  })
})
