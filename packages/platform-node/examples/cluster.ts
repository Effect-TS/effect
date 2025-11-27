import { Entity, RunnerAddress, Singleton } from "@effect/cluster"
import { NodeClusterSocket, NodeRuntime } from "@effect/platform-node"
import { Rpc } from "@effect/rpc"
import { Effect, Layer, Logger, LogLevel, Option, Schema } from "effect"

const Counter = Entity.make("Counter", [
  Rpc.make("Increment", {
    payload: { amount: Schema.Number },
    success: Schema.Number
  }),

  Rpc.make("Decrement", {
    payload: { amount: Schema.Number },
    success: Schema.Number
  })
])

const CounterLive = Counter.toLayer(
  Effect.gen(function*() {
    console.log("Creating Counter", yield* Entity.CurrentAddress)

    let state = 0

    yield* Effect.addFinalizer(() => Effect.log("Finalizing", state))

    return {
      Increment: Effect.fnUntraced(function*({ payload: { amount }, requestId }) {
        console.log("Incrementing by", amount, requestId)
        state += amount
        return state
      }),
      Decrement: Effect.fnUntraced(function*({ payload: { amount } }) {
        console.log("Decrementing by", amount)
        state -= amount
        return state
      })
    }
  }),
  { maxIdleTime: "10 seconds", concurrency: "unbounded" }
)

const SendMessage = Singleton.make(
  "SendMessage",
  Effect.gen(function*() {
    const makeClient = yield* Counter.client
    const client = makeClient("test")
    yield* Effect.log("Client", yield* client.Increment({ amount: 1 }))
    yield* Effect.log("Client 2", yield* client.Increment({ amount: 1 }))
    yield* Effect.log("Client 3", yield* client.Decrement({ amount: 1 }))
  })
)

for (let i = 0; i < 1; i++) {
  const ShardingLive = NodeClusterSocket.layer({
    storage: "local",
    shardingConfig: {
      runnerAddress: Option.some(RunnerAddress.make("localhost", 50000 + i))
    }
  })

  Layer.mergeAll(
    CounterLive,
    SendMessage
    // SendMessage2
  ).pipe(
    Layer.provide(ShardingLive),
    Layer.provide(Logger.minimumLogLevel(LogLevel.All)),
    Layer.launch,
    NodeRuntime.runMain
  )
}
