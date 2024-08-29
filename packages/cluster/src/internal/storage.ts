import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import type { Option } from "effect/Option"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import type { Pod } from "../Pod.js"
import type { PodAddress } from "../PodAddress.js"
import type { ShardId } from "../ShardId.js"
import type * as Storage from "../Storage.js"

const SymbolKey = "@effect/cluster/Storage"

/** @internal */
export const TypeId: Storage.TypeId = Symbol.for(SymbolKey) as Storage.TypeId

/** @internal */
export const Tag = Context.GenericTag<Storage.Storage>(SymbolKey)

/** @internal */
export const layerNoop: Layer.Layer<Storage.Storage> = Layer.succeed(Tag, {
  [TypeId]: TypeId,
  getShardAssignments: Effect.succeed(HashMap.empty()),
  saveShardAssignments: () => Effect.void,
  streamShardAssignments: Stream.empty,
  getPods: Effect.succeed(HashMap.empty()),
  savePods: () => Effect.void
})

const makeMemory = Effect.gen(function*() {
  const assignments = yield* SubscriptionRef.make(HashMap.empty<ShardId, Option<PodAddress>>())
  const pods = yield* Ref.make(HashMap.empty<PodAddress, Pod>())

  function saveShardAssignments(value: HashMap.HashMap<ShardId, Option<PodAddress>>) {
    return SubscriptionRef.set(assignments, value)
  }

  function savePods(value: HashMap.HashMap<PodAddress, Pod>) {
    return Ref.set(pods, value)
  }

  return {
    [TypeId]: TypeId,
    getShardAssignments: SubscriptionRef.get(assignments),
    saveShardAssignments,
    streamShardAssignments: assignments.changes,
    getPods: Ref.get(pods),
    savePods
  } as const
})

/** @internal */
export const layerMemory: Layer.Layer<Storage.Storage> = Layer.effect(Tag, makeMemory)
