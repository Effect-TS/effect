import * as Array from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { PodAddress } from "../PodAddress.js"
import { ShardId } from "../ShardId.js"
import type * as ShardManager from "../ShardManager.js"
import * as InternalShardingConfig from "./shardingConfig.js"

const SymbolKey = "@effect/cluster/ShardManager/Client"

/** @internal */
export const TypeId: ShardManager.ClientTypeId = Symbol.for(SymbolKey) as ShardManager.ClientTypeId

/** @internal */
export const Tag = Context.GenericTag<ShardManager.ShardManager.Client>(SymbolKey)

const makeLocal = Effect.gen(function*() {
  const config = yield* InternalShardingConfig.Tag
  const address = PodAddress.make({ host: config.host, port: config.port })
  const shards = pipe(
    Array.range(1, config.numberOfShards),
    Array.map((n) => [ShardId.make(n), Option.some(address)] as const),
    HashMap.fromIterable
  )

  return {
    [TypeId]: TypeId,
    register: () => Effect.void,
    unregister: () => Effect.void,
    notifyUnhealthyPod: () => Effect.void,
    getAssignments: Effect.succeed(shards)
  } as const
})

/** @internal */
export const layerLocal = Layer.effect(Tag, makeLocal)
