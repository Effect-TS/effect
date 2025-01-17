import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import type * as Pod from "../Pod.js"
import type * as PodAddress from "../PodAddress.js"
import type * as ShardId from "../ShardId.js"
import type * as Storage from "../Storage.js"

/** @internal */
const StorageSymbolKey = "@effect/cluster/StorageTypeId"

/** @internal */
export const StorageTypeId: Storage.StorageTypeId = Symbol.for(StorageSymbolKey) as Storage.StorageTypeId

/** @internal */
export const storageTag: Context.Tag<Storage.Storage, Storage.Storage> = Context.GenericTag<Storage.Storage>(
  StorageSymbolKey
)

/** @internal */
export function make(args: Omit<Storage.Storage, Storage.StorageTypeId>): Storage.Storage {
  return ({ [StorageTypeId]: StorageTypeId, ...args })
}

/** @internal */
export const memory: Layer.Layer<Storage.Storage> = Layer.effect(
  storageTag,
  Effect.gen(function*() {
    const assignmentsRef = yield* SubscriptionRef.make(
      HashMap.empty<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>()
    )
    const podsRef = yield* Ref.make(HashMap.empty<PodAddress.PodAddress, Pod.Pod>())

    return make({
      getAssignments: SubscriptionRef.get(assignmentsRef),
      saveAssignments: (assignments) => pipe(assignmentsRef, SubscriptionRef.set(assignments)),
      assignmentsStream: assignmentsRef.changes,
      getPods: Ref.get(podsRef),
      savePods: (pods) => pipe(podsRef, Ref.set(pods))
    })
  })
)

/** @internal */
export const noop: Layer.Layer<Storage.Storage> = Layer.effect(
  storageTag,
  Effect.succeed(make({
    getAssignments: Effect.succeed(HashMap.empty()),
    saveAssignments: () => Effect.void,
    assignmentsStream: Stream.empty,
    getPods: Effect.succeed(HashMap.empty()),
    savePods: () => Effect.void
  }))
)
