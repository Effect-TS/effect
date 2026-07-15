import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Data, Effect, Fiber, Layer, Option, Schema, Stream } from "effect"
import { Machine } from "effect/unstable/machine"
import { AsyncResult, Atom, AtomMachine, AtomRegistry } from "effect/unstable/reactivity"

class Count extends Schema.TaggedClass<Count>("Count")("Count", {
  value: Schema.Number
}) {}

class Done extends Schema.TaggedClass<Done>("Done")("Done", {
  value: Schema.Number
}) {}

class Finish extends Schema.TaggedClass<Finish>("Finish")("Finish", {
  by: Schema.Number
}) {}

class ReadValue extends Schema.TaggedClass<ReadValue>("ReadValue")("ReadValue", {}) {}

class ValueRead extends Schema.TaggedClass<ValueRead>("ValueRead")("ValueRead", {
  value: Schema.String
}) {}

class StartError extends Data.TaggedError("StartError")<{
  readonly reason: string
}> {}

class Multiplier extends Context.Service<Multiplier, {
  readonly multiply: (value: number) => number
}>()("test/AtomMachine/Multiplier") {}

const MachineInitial = Machine.defineStates({ Count, Done, ValueRead }).initial

const makeRegistry = Effect.acquireRelease(
  Effect.sync(() => AtomRegistry.make()),
  (registry) => Effect.sync(() => registry.dispose())
)

const mount = <A>(registry: AtomRegistry.AtomRegistry, atom: Atom.Atom<A>) =>
  Effect.acquireRelease(
    Effect.sync(() => registry.mount(atom)),
    (release) => Effect.sync(release)
  )

const waitForResult = <A, E>(
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>,
  predicate: (value: A) => boolean
) =>
  AtomRegistry.toStreamResult(registry, atom).pipe(
    Stream.filter(predicate),
    Stream.take(1),
    Stream.runCollect,
    Effect.map((values) => Array.from(values)[0]!)
  )

const makeCounterMachine = () =>
  Machine.make({
    states: { Count, Done },
    events: [Finish],
    initial: () => MachineInitial.Count(new Count({ value: 0 }))
  }).handle({
    Count: {
      on: {
        Finish: ({ state, event }) => MachineInitial.Count(new Count({ value: state.value + event.by }))
      }
    },
    Done: {
      type: "final"
    }
  })

describe("AtomMachine", () => {
  it.effect("exposes snapshots and sends events", () =>
    Effect.scoped(Effect.gen(function*() {
      const registry = yield* makeRegistry
      const bridge = AtomMachine.make(makeCounterMachine())
      yield* mount(registry, bridge.snapshot)

      const initial = yield* AtomRegistry.getResult(registry, bridge.snapshot)
      assert.deepStrictEqual(initial, {
        status: "active",
        state: {
          path: "Count",
          value: new Count({ value: 0 })
        }
      })

      yield* Effect.sync(() => registry.set(bridge.send, new Finish({ by: 2 })))

      const state = yield* waitForResult(registry, bridge.state, (state) => state.value.value === 2)
      assert.deepStrictEqual(state, {
        path: "Count",
        value: new Count({ value: 2 })
      })
    })))

  it.effect("stops the machine when the registry is disposed", () =>
    Effect.gen(function*() {
      const registry = AtomRegistry.make()
      const bridge = AtomMachine.make(makeCounterMachine())
      const ref = yield* AtomRegistry.getResult(registry, bridge.ref)
      const watcher = yield* Machine.watch(ref).pipe(
        Stream.runCollect,
        Effect.forkScoped
      )

      yield* Effect.sync(() => registry.dispose())

      const events = Array.from(yield* Fiber.join(watcher))
      assert.strictEqual(events.length, 1)
      assert.strictEqual(events[0]?._tag, "Stopped")
    }))

  it.effect("stops the machine through the writable stop atom", () =>
    Effect.scoped(Effect.gen(function*() {
      const registry = yield* makeRegistry
      const bridge = AtomMachine.make(makeCounterMachine())
      yield* mount(registry, bridge.snapshot)
      yield* mount(registry, bridge.send)

      yield* AtomRegistry.getResult(registry, bridge.snapshot)
      yield* Effect.sync(() => registry.set(bridge.stop, undefined))

      const snapshot = yield* waitForResult(registry, bridge.snapshot, (snapshot) => snapshot.status === "stopped")
      assert.deepStrictEqual(snapshot, {
        status: "stopped",
        state: {
          path: "Count",
          value: new Count({ value: 0 })
        }
      })
    })))

  it.effect("keeps snapshot previous success when refresh startup fails", () =>
    Effect.scoped(Effect.gen(function*() {
      const registry = yield* makeRegistry
      const failOnStart = Atom.make(false)
      const machine = Machine.make({
        states: { Count },
        events: [Finish],
        initial: Effect.fn(function*() {
          const fail = yield* Atom.get(failOnStart)
          if (fail) {
            return yield* Effect.fail(new StartError({ reason: "refresh" }))
          }
          return MachineInitial.Count(new Count({ value: 0 }))
        })
      }).handle({
        Count: {}
      })
      const bridge = AtomMachine.make(machine)
      yield* mount(registry, bridge.snapshot)

      const initial = yield* AtomRegistry.getResult(registry, bridge.snapshot)
      assert.deepStrictEqual(initial, {
        status: "active",
        state: {
          path: "Count",
          value: new Count({ value: 0 })
        }
      })

      yield* Effect.sync(() => {
        registry.set(failOnStart, true)
        registry.refresh(bridge.ref)
      })

      const failed = yield* Effect.sync(() => registry.get(bridge.snapshot))
      assert(AsyncResult.isFailure(failed))
      const previous = AsyncResult.value(failed)
      assert(Option.isSome(previous))
      assert.deepStrictEqual(previous.value, {
        status: "stopped",
        state: {
          path: "Count",
          value: new Count({ value: 0 })
        }
      })
    })))

  it.effect("exposes stopped send failures through the writable send atom", () =>
    Effect.scoped(Effect.gen(function*() {
      const registry = yield* makeRegistry
      const bridge = AtomMachine.make(makeCounterMachine())
      yield* mount(registry, bridge.snapshot)

      yield* AtomRegistry.getResult(registry, bridge.snapshot)
      yield* Effect.sync(() => registry.set(bridge.stop, undefined))
      yield* waitForResult(registry, bridge.snapshot, (snapshot) => snapshot.status === "stopped")
      const failureFiber = yield* AtomRegistry.toStream(registry, bridge.send).pipe(
        Stream.filter(AsyncResult.isFailure),
        Stream.take(1),
        Stream.runCollect,
        Effect.forkChild({ startImmediately: true })
      )
      yield* Effect.sync(() => registry.set(bridge.send, new Finish({ by: 1 })))

      const result = Array.from(yield* Fiber.join(failureFiber))[0]!
      assert.strictEqual(AsyncResult.isFailure(result), true)
      if (AsyncResult.isFailure(result)) {
        const error = Cause.findErrorOption(result.cause)
        assert.strictEqual(Option.isSome(error), true)
        if (Option.isSome(error)) {
          assert.instanceOf(error.value, Machine.StoppedError)
        }
      }
    })))

  it.effect("runs a machine and exposes the final snapshot", () =>
    Effect.scoped(Effect.gen(function*() {
      const registry = yield* makeRegistry
      const machine = Machine.make({
        states: {
          Count,
          Done: {
            schema: Done,
            type: "final",
            output: Schema.Number
          }
        },
        events: [Finish],
        initial: () => MachineInitial.Count(new Count({ value: 1 }))
      }).handle({
        Count: {
          on: {
            Finish: ({ state, event }) => MachineInitial.Done(new Done({ value: state.value + event.by }))
          }
        },
        Done: {
          type: "final",
          output: ({ state }) => state.value
        }
      })
      const bridge = AtomMachine.make(machine)
      yield* mount(registry, bridge.snapshot)

      yield* Effect.sync(() => registry.set(bridge.send, new Finish({ by: 3 })))

      const snapshot = yield* waitForResult(registry, bridge.snapshot, (snapshot) => snapshot.status === "done")
      assert.deepStrictEqual(snapshot, {
        status: "done",
        state: {
          path: "Done",
          value: new Done({ value: 4 })
        },
        output: 4
      })
    })))

  it.effect("provides AtomRegistry to machine effects", () =>
    Effect.scoped(Effect.gen(function*() {
      const registry = yield* makeRegistry
      const valueAtom = Atom.make("from-atom")
      const machine = Machine.make({
        states: { Count, ValueRead },
        events: [ReadValue],
        initial: () => MachineInitial.Count(new Count({ value: 0 }))
      }).handle({
        Count: {
          on: {
            ReadValue: Effect.fn(function*() {
              const value = yield* Atom.get(valueAtom)
              return MachineInitial.ValueRead(new ValueRead({ value }))
            })
          }
        },
        ValueRead: {
          type: "final"
        }
      })
      const bridge = AtomMachine.make(machine)
      yield* mount(registry, bridge.snapshot)

      yield* Effect.sync(() => registry.set(bridge.send, new ReadValue({})))

      const state = yield* waitForResult(registry, bridge.state, (state) => state.value._tag === "ValueRead")
      assert.deepStrictEqual(state, {
        path: "ValueRead",
        value: new ValueRead({ value: "from-atom" })
      })
    })))

  it.effect("uses AtomRuntime services when starting a machine", () =>
    Effect.scoped(Effect.gen(function*() {
      const registry = yield* makeRegistry
      const runtime = Atom.runtime(Layer.succeed(
        Multiplier,
        Multiplier.of({
          multiply: (value) => value * 2
        })
      ))
      const machine = Machine.make({
        states: { Count },
        events: [Finish],
        initial: () => MachineInitial.Count(new Count({ value: 0 }))
      }).handle({
        Count: {
          on: {
            Finish: Effect.fn(function*({ event }) {
              const multiplier = yield* Multiplier
              return MachineInitial.Count(new Count({ value: multiplier.multiply(event.by) }))
            })
          }
        }
      })
      const bridge = AtomMachine.make(runtime, machine)
      yield* mount(registry, bridge.state)

      yield* Effect.sync(() => registry.set(bridge.send, new Finish({ by: 3 })))

      const state = yield* waitForResult(registry, bridge.state, (state) => state.value.value === 6)
      assert.deepStrictEqual(state, {
        path: "Count",
        value: new Count({ value: 6 })
      })
    })))
})
