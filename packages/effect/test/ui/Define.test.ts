import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema } from "effect"
import { Command, Component } from "effect/ui"
import { Story } from "effect/ui/testing"

const Message = Schema.TaggedUnion({ Step: {}, Logged: { n: Schema.Number } })
const Events = Schema.TaggedUnion({ Stepped: { n: Schema.Number } })

class Log extends Command.Service<Log>()(
  "test/define/Log",
  { args: { n: Schema.Number }, invalidates: () => [] },
  Effect.succeed(({ n }) => Effect.succeed(Message.make({ _tag: "Logged", n })))
) {}

const CounterDef = Component.define({
  name: "Counter",
  props: Schema.Struct({ by: Schema.Number }),
  model: Schema.Struct({ n: Schema.Number, seen: Schema.Array(Schema.String) }),
  message: Message,
  events: Events
})

// Changes the Model, runs a Command and emits, all from the Model it is given.
const bump = CounterDef.update((model, msg, $) => {
  const n = model.n + $.props.by
  return $.set({ n, seen: [...model.seen, msg._tag] })
    .run(Log.make({ n }))
    .emit(Events.make({ _tag: "Stepped", n }))
})

const Counter = CounterDef.make({
  init: () => ({ n: 0, seen: [] }),
  update: {
    Step: (_model, _msg, $) => $.combine(bump, bump),
    Logged: (model, msg) => ({ ...model, seen: [...model.seen, `logged ${msg.n}`] })
  },
  view: (model, h) => h.el("p", String(model.n))
})

// `$.combine` in a slice runs `bump` with the message the slice was given.
const onLogged = CounterDef.update("Logged", (_model, _msg, $) => $.combine(bump))

// Calls the slice by hand with a message other than the one it received.
const ByHand = CounterDef.make({
  init: () => ({ n: 0, seen: [] }),
  update: (model, msg, $) => msg._tag === "Step" ? onLogged(model, { _tag: "Logged", n: 0 }, $) : model,
  view: (model, h) => h.el("p", String(model.n))
})

describe("Component.define", () => {
  it("$.combine folds the Model and keeps every Command and event in call order", () => {
    Story.make(Counter, { by: 2 }, (s) =>
      s.send(Message.make({ _tag: "Step" }))
        .model((model) => assert.deepStrictEqual(model, { n: 4, seen: ["Step", "Step"] }))
        .expectExact(Log.make({ n: 2 }), Log.make({ n: 4 }))
        .emitted((emitted) =>
          assert.deepStrictEqual(emitted, [
            Events.make({ _tag: "Stepped", n: 2 }),
            Events.make({ _tag: "Stepped", n: 4 })
          ])
        )
        .resolve(Log.make({ n: 2 }), Message.make({ _tag: "Logged", n: 2 }))
        .resolve(Log.make({ n: 4 }), Message.make({ _tag: "Logged", n: 4 })))
  })

  it("a record update dispatches by _tag", () => {
    Story.make(Counter, { by: 1 }, (s) =>
      s.send(Message.make({ _tag: "Step" }))
        .resolve(Log.make({ n: 1 }), Message.make({ _tag: "Logged", n: 1 }))
        .resolve(Log.make({ n: 2 }), Message.make({ _tag: "Logged", n: 2 }))
        .model((model) => assert.deepStrictEqual(model.seen, ["Step", "Step", "logged 1", "logged 2"])))
  })

  it("a slice called by hand binds $ to the message it is given", () => {
    Story.make(ByHand, { by: 1 }, (s) =>
      s.send(Message.make({ _tag: "Step" }))
        .model((model) => assert.deepStrictEqual(model.seen, ["Logged"]))
        .resolve(Log.make({ n: 1 }), Message.make({ _tag: "Logged", n: 1 })))
  })
})
