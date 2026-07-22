import { Context, Effect, Layer, type Option, Schema } from "effect"
import { Machine } from "effect/unstable/machine"
import { Atom, AtomMachine } from "effect/unstable/reactivity"
import { describe, expect, it } from "tstyche"

class Idle extends Schema.TaggedClass<Idle>("Idle")("Idle", {}) {}

class Tick extends Schema.TaggedClass<Tick>("Tick")("Tick", {}) {}

class Multiplier extends Context.Service<Multiplier, number>()("test/AtomMachine/Multiplier") {}

const States = Machine.defineStates({ Idle })

const makeMachine = () =>
  Machine.make({
    states: States.states,
    events: [Tick],
    initial: () => States.initial.Idle(new Idle({}))
  }).handle({
    Idle: {}
  })

describe("AtomMachine", () => {
  it("derives invoked child protocols from the child descriptor", () => {
    const childMachine = makeMachine()
    const Child = Machine.child("child", childMachine)
    const parentMachine = Machine.make({
      states: States.states,
      events: [],
      initial: () => States.initial.Idle(new Idle({}))
    }).handle({
      Idle: {
        invoke: Machine.invokeMachine({ child: Child })
      }
    })
    const child = AtomMachine.make(parentMachine).child(Child)

    expect<Atom.Success<typeof child.ref>>().type.toBe<Option.Option<Machine.ChildMachine.Ref<typeof Child>>>()
    expect<typeof child.send extends Atom.Writable<any, infer Event> ? Event : never>().type.toBe<Tick>()
  })

  it("accepts machines without external requirements", () => {
    expect(AtomMachine.make).type.toBeCallableWith(makeMachine())
  })

  it("accepts compatible machine runtime requirements", () => {
    const machine = Machine.make({
      states: States.states,
      events: [Tick],
      initial: Effect.fn(function*() {
        const runtime = yield* Machine.runtime<{ readonly events: Tick }>()
        yield* runtime.raise(new Tick({}))
        return States.initial.Idle(new Idle({}))
      })
    }).handle({
      Idle: {}
    })

    expect(AtomMachine.make).type.toBeCallableWith(machine)
  })

  it("requires an AtomRuntime for external requirements", () => {
    const machine = Machine.make({
      states: States.states,
      events: [Tick],
      initial: () => States.initial.Idle(new Idle({}))
    }).handle({
      Idle: {
        on: {
          Tick: Effect.fn(function*() {
            yield* Multiplier
            return States.initial.Idle(new Idle({}))
          })
        }
      }
    })
    const runtime = Atom.runtime(Layer.succeed(Multiplier, 2))

    expect(AtomMachine.make).type.not.toBeCallableWith(machine)
    expect(AtomMachine.make).type.toBeCallableWith(runtime, machine)
  })

  it("rejects unknown and any requirements without an AtomRuntime", () => {
    const unknownRequirement = Effect.void as Effect.Effect<void, never, unknown>
    const anyRequirement = Effect.void as Effect.Effect<void, never, any>
    const unknownMachine = Machine.make({
      states: States.states,
      events: [Tick],
      initial: () => unknownRequirement.pipe(Effect.as(States.initial.Idle(new Idle({}))))
    }).handle({
      Idle: {}
    })
    const anyMachine = Machine.make({
      states: States.states,
      events: [Tick],
      initial: () => anyRequirement.pipe(Effect.as(States.initial.Idle(new Idle({}))))
    }).handle({
      Idle: {}
    })

    expect(AtomMachine.make).type.not.toBeCallableWith(unknownMachine)
    expect(AtomMachine.make).type.not.toBeCallableWith(anyMachine)
  })
})
