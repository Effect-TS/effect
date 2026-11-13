import { Effect, Schema } from "effect"
import { type AsyncResult, Loader } from "effect/reactivity"
import { Command, Component } from "effect/ui"
import { Html } from "effect/ui/html"
import { describe, expect, it } from "tstyche"

const User = Schema.Struct({ id: Schema.String, name: Schema.String })

class GetUser extends Loader.Service<GetUser>()(
  "typetest/define/GetUser",
  { args: { id: Schema.String }, success: User, error: Schema.String, staleTime: "1 minute" },
  Effect.succeed(({ id }) => Effect.succeed({ id, name: "Ann" }))
) {}

const Message = Schema.TaggedUnion({
  Edited: { body: Schema.String },
  SaveClicked: {},
  Saved: {}
})
type Message = typeof Message.Type

const Events = Schema.TaggedUnion({ Changed: {} })

class Save extends Command.Service<Save>()(
  "typetest/define/Save",
  { args: {}, invalidates: () => [] },
  Effect.succeed(() => Effect.succeed(Message.make({ _tag: "Saved" })))
) {}
class Audit extends Command.Service<Audit>()(
  "typetest/define/Audit",
  { args: {}, invalidates: () => [] },
  Effect.succeed(() => Effect.succeed(Message.make({ _tag: "Saved" })))
) {}

const Model = Schema.Struct({ body: Schema.String, edits: Schema.Number })
type Model = typeof Model.Type

const NoteDef = Component.define({
  name: "Note",
  props: Schema.Struct({ id: Schema.String }),
  model: Model,
  message: Message,
  events: Events,
  elements: Html,
  loaders: { user: { load: GetUser, args: (_model, props) => ({ id: props.id }) } }
})

const save = NoteDef.update((model, _msg, $) => $.set(model).run(Save.make()))
const audit = NoteDef.update((model, _msg, $) => $.set(model).run(Audit.make()))
const touch = NoteDef.update((model) => ({ ...model, edits: model.edits + 1 }))

describe("Component.define", () => {
  it("types an untagged update over the whole message, from the definition", () => {
    NoteDef.update((model, msg, $) => {
      expect(model).type.toBe<Model>()
      expect(msg).type.toBe<Message>()
      expect($.props).type.toBe<{ readonly id: string }>()
      expect($.loaded.user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
      return model
    })
  })

  it("narrows the message of a slice by tag", () => {
    NoteDef.update("Edited", (model, msg) => {
      expect(msg).type.toBe<{ readonly _tag: "Edited"; readonly body: string }>()
      return { ...model, body: msg.body }
    })
  })

  it("rejects an unknown tag", () => {
    expect(NoteDef.update).type.not.toBeCallableWith("Deleted", (model: Model) => model)
  })

  it("types h from the definition, with its loaders and elements", () => {
    NoteDef.view((model, h) => {
      expect(model).type.toBe<Model>()
      expect(h.props).type.toBe<{ readonly id: string }>()
      expect(h.loaded.user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
      return h.p(model.body)
    })
  })

  it("unions the requirements of the functions $.combine runs", () => {
    const both = NoteDef.update((_model, _msg, $) => $.combine(touch, save, audit))
    const Note = NoteDef.make({ init: () => ({ body: "", edits: 0 }), update: both, view: (_, h) => h.p() })
    expect<Component.Requirements<typeof Note>>().type.toBe<GetUser | Save | Audit>()
  })

  it("narrows $ in a slice, and $.combine there takes same-tag slices, whole-message and inline functions", () => {
    const validate = NoteDef.update("SaveClicked", (model) => model)
    const handle = NoteDef.update("SaveClicked", (_model, _msg, $) => {
      expect($).type.toBe<
        Component.Update<
          Model,
          Message,
          typeof Events.Type,
          { readonly id: string },
          { readonly user: Component.Load<typeof GetUser> },
          { readonly _tag: "SaveClicked" }
        >
      >()
      return $.combine(validate, touch, save, (m, msg) => {
        expect(msg).type.toBe<{ readonly _tag: "SaveClicked" }>()
        return $.set(m).run(Audit.make())
      })
    })
    const Note = NoteDef.make({
      init: () => ({ body: "", edits: 0 }),
      update: { Edited: touch, SaveClicked: handle, Saved: touch },
      view: (_, h) => h.p()
    })
    expect<Component.Requirements<typeof Note>>().type.toBe<GetUser | Save | Audit>()
  })

  it("rejects another tag's slice in $.combine in a slice", () => {
    const edited = NoteDef.update("Edited", (model, msg) => ({ ...model, body: msg.body }))
    NoteDef.update("SaveClicked", (model, _msg, $) => {
      expect($.combine).type.not.toBeCallableWith(edited)
      return model
    })
  })

  it("calls a slice by hand from an update over the whole message", () => {
    const edited = NoteDef.update("Edited", (model, msg, $) => $.combine(() => ({ ...model, body: msg.body }), save))
    const Note = NoteDef.make({
      init: () => ({ body: "", edits: 0 }),
      update: (model, msg, $) => msg._tag === "Edited" ? edited(model, msg, $) : model,
      view: (_, h) => h.p()
    })
    expect<Component.Requirements<typeof Note>>().type.toBe<GetUser | Save>()
  })

  it("rejects a tagged slice in $.combine", () => {
    const edited = NoteDef.update("Edited", (model, msg) => ({ ...model, body: msg.body }))
    NoteDef.update((_model, _msg, $) => {
      expect($.combine).type.not.toBeCallableWith(edited)
      return $.combine(touch)
    })
  })

  it("takes a record of slices, with inline handlers narrowed", () => {
    const Note = NoteDef.make({
      init: () => ({ body: "", edits: 0 }),
      update: {
        Edited: (model, msg, $) => {
          expect(msg).type.toBe<{ readonly _tag: "Edited"; readonly body: string }>()
          expect($.combine).type.not.toBeCallableWith(touch as (model: Model, msg: { readonly _tag: "Saved" }) => Model)
          return { ...model, body: msg.body }
        },
        SaveClicked: NoteDef.update("SaveClicked", (_model, _msg, $) => $.combine(touch, save)),
        Saved: touch
      },
      view: (_, h) => h.p()
    })
    expect<Component.Requirements<typeof Note>>().type.toBe<GetUser | Save>()
  })

  it("rejects a record with a missing tag", () => {
    expect(NoteDef.make).type.not.toBeCallableWith({
      init: () => ({ body: "", edits: 0 }),
      update: { Edited: touch, SaveClicked: touch },
      view: (_: Model, h: Component.Helper<typeof NoteDef>) => h.p()
    })
  })

  it("fragment types h from the definition, with its loaders and elements, and infers the other arguments", () => {
    const row = NoteDef.fragment((h, label: string, count: number) => {
      expect(h).type.toBe<Component.Helper<typeof NoteDef>>()
      expect(h.props).type.toBe<{ readonly id: string }>()
      expect(h.loaded.user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
      return h.li(`${label} ${count}`)
    })
    expect<Parameters<typeof row>>().type.toBe<[h: Component.Helper<typeof NoteDef>, label: string, count: number]>()
    NoteDef.view((model, h) => {
      expect(row).type.not.toBeCallableWith(h, model.body)
      return h.ul(row(h, model.body, model.edits))
    })
  })

  it("Helper types a view fragment that takes more than the Model", () => {
    const row = (h: Component.Helper<typeof NoteDef>, label: string) => {
      expect(h.loaded.user).type.toBe<AsyncResult.AsyncResult<typeof User.Type, string>>()
      return h.li(label)
    }
    NoteDef.view((model, h) => h.ul(row(h, model.body)))
  })
})
