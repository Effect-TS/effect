import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Pods from "../Pods.js"

const SymbolKey = "@effect/cluster/Pods"

/** @internal */
export const Tag = Context.GenericTag<Pods.Pods>(SymbolKey)

/** @internal */
export const TypeId: Pods.TypeId = Symbol.for(SymbolKey) as Pods.TypeId

/** @internal */
export const layerNoop = Layer.succeed(Tag, {
  [TypeId]: TypeId,
  ping: () => Effect.void,
  send: () => Effect.void,
  assignShards: () => Effect.void,
  unassignShards: () => Effect.void
})
