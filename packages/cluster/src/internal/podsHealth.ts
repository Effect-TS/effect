import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { PodAddress } from "../PodAddress.js"
import type * as PodsHealth from "../PodsHealth.js"
import * as InternalPods from "./pods.js"

const SymbolKey = "@effect/cluster/PodsHealth"

/** @internal */
export const TypeId: PodsHealth.TypeId = Symbol.for(SymbolKey) as PodsHealth.TypeId

/** @internal */
export const Tag = Context.GenericTag<PodsHealth.PodsHealth>(SymbolKey)

const Proto = {
  [TypeId]: TypeId
}

/** @internal */
export const layerNoop = Layer.succeed(
  Tag,
  Object.assign(Object.create(Proto), {
    isAlive: () => Effect.succeed(true)
  })
)

const makeLocal = Effect.gen(function*() {
  const pods = yield* InternalPods.Tag

  function isAlive(address: PodAddress): Effect.Effect<boolean> {
    return Effect.isSuccess(pods.ping(address))
  }

  return Object.assign(Object.create(Proto), {
    isAlive
  })
})

/** @internal */
export const layerLocal = Layer.effect(Tag, makeLocal)
