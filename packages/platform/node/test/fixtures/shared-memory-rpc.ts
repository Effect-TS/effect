import * as Effect from "effect/Effect"
import * as Rpc from "effect/rpc/Rpc"
import * as RpcGroup from "effect/rpc/RpcGroup"
import * as Schema from "effect/Schema"
import * as SharedMemory from "effect/workers/SharedMemory"

const Range = { from: Schema.Number, to: Schema.Number }

export const Compute = RpcGroup.make(
  Rpc.make("Fill", { payload: { data: SharedMemory.schema(Int32Array), ...Range } }),
  Rpc.make("Sum", { payload: { data: SharedMemory.schema(Float64Array), ...Range }, success: Schema.Number })
)

export const ComputeLive = Compute.toLayer({
  Fill: ({ data, from, to }) =>
    Effect.sync(() => {
      for (let i = from; i < to; i++) data[i] = i * 2
    }),
  Sum: ({ data, from, to }) =>
    Effect.sync(() => {
      let sum = 0
      for (let i = from; i < to; i++) sum += data[i]
      return sum
    })
})
