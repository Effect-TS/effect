import { Context, Effect, type Layer, Option, Schema, SchemaGetter } from "effect"
import { ClusterMachine, type MessageStorage, type Sharding } from "effect/unstable/cluster"
import { Machine } from "effect/unstable/machine"
import type { Rpc, RpcGroup } from "effect/unstable/rpc"
import { describe, expect, it } from "tstyche"

describe("ClusterMachine", () => {
  class Count extends Schema.TaggedClass<Count>("Count")("Count", {
    value: Schema.Number
  }) {}

  class Increment extends Schema.TaggedClass<Increment>("Increment")("Increment", {
    by: Schema.Number
  }) {}

  class Reset extends Schema.TaggedClass<Reset>("Reset")("Reset", {}) {}

  class Input extends Schema.Class<Input>("Input")({
    value: Schema.Number
  }) {}

  class PlanningService extends Context.Service<PlanningService, {
    readonly value: number
  }>()("test/ClusterMachine/PlanningService") {}

  class ActionService extends Context.Service<ActionService, {
    readonly run: Effect.Effect<void>
  }>()("test/ClusterMachine/ActionService") {}

  class SnapshotDecoding extends Context.Service<SnapshotDecoding, number>()(
    "test/ClusterMachine/SnapshotDecoding"
  ) {}

  class SnapshotEncoding extends Context.Service<SnapshotEncoding, number>()(
    "test/ClusterMachine/SnapshotEncoding"
  ) {}

  const states = Machine.defineStates({ Count })

  const machine = Machine.make({
    id: "Counter",
    states: states.states,
    events: [Increment, Reset],
    initial: () => states.initial.Count(new Count({ value: 0 }))
  }).handle({
    Count: {
      on: {
        Increment: Effect.fn(function*({ event, state }) {
          yield* PlanningService
          yield* Machine.action(Effect.flatMap(ActionService, (service) => service.run))
          return states.initial.Count(new Count({ value: state.value + event.by }))
        }),
        Reset: () => states.initial.Count(new Count({ value: 0 }))
      }
    }
  })

  const bridge = ClusterMachine.make("CounterEntity", machine, { version: "1" })

  it("preserves the machine event union in the send RPC", () => {
    type Rpcs = RpcGroup.Rpcs<typeof bridge.entity.protocol>
    expect<Rpc.Payload<Rpcs>>().type.toBe<Increment | Reset>()
    expect<Rpc.Success<Rpcs>>().type.toBe<ClusterMachine.Accepted | ClusterMachine.Rejected>()
  })

  it("retains machine and Cluster service requirements", () => {
    const layer = bridge.toLayer()
    expect<Layer.Services<typeof layer>>().type.toBe<
      ClusterMachine.Storage | MessageStorage.MessageStorage | Sharding.Sharding | PlanningService | ActionService
    >()
  })

  it("captures non-void machine input", () => {
    const inputMachine = Machine.make({
      id: "InputCounter",
      states: states.states,
      events: [Reset],
      input: Input,
      initial: (input) => states.initial.Count(new Count({ value: input.value }))
    })

    expect(ClusterMachine.make).type.not.toBeCallableWith(
      "InputCounterEntity",
      inputMachine,
      { version: "1" }
    )
    expect(ClusterMachine.make).type.toBeCallableWith(
      "InputCounterEntity",
      inputMachine,
      { version: "1" },
      new Input({ value: 1 })
    )
  })

  it("uses encoded Machine snapshots in checkpoints", () => {
    expect<ClusterMachine.Checkpoint["snapshot"]>().type.toBe<Machine.Machine.EncodedSnapshot>()
  })

  it("retains snapshot codec service requirements", () => {
    const ContextualNumber = Schema.Number.pipe(
      Schema.decode({
        decode: SchemaGetter.onSome((value) => Effect.as(SnapshotDecoding, Option.some(value))),
        encode: SchemaGetter.passthrough()
      }),
      Schema.encode({
        decode: SchemaGetter.passthrough(),
        encode: SchemaGetter.onSome((value) => Effect.as(SnapshotEncoding, Option.some(value)))
      })
    )
    class ContextualCount extends Schema.TaggedClass<ContextualCount>("ContextualCount")("ContextualCount", {
      value: ContextualNumber
    }) {}
    const contextualStates = Machine.defineStates({ ContextualCount })
    const contextualMachine = Machine.make({
      states: contextualStates.states,
      events: [Reset],
      initial: () => contextualStates.initial.ContextualCount(new ContextualCount({ value: 0 }))
    })
    const layer = ClusterMachine.make("ContextualCounter", contextualMachine, { version: "1" }).toLayer()

    expect<Layer.Services<typeof layer>>().type.toBe<
      | ClusterMachine.Storage
      | MessageStorage.MessageStorage
      | Sharding.Sharding
      | SnapshotDecoding
      | SnapshotEncoding
    >()
  })

  it("runs staged actions with a supplied runtime", () => {
    const action = Machine.runtime<{
      readonly events: Increment | Reset
    }>().pipe(Effect.asVoid)
    const run = Machine.runActions([action], {
      raise: () => Effect.void,
      sendParent: () => Effect.void
    })

    expect<Effect.Services<typeof run>>().type.toBe<never>()
  })
})
