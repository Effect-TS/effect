import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Pods from "../Pods.js"

/** @internal */
const PodsSymbolKey = "@effect/cluster/Pods"

/** @internal */
export const PodsTypeId: Pods.PodsTypeId = Symbol.for(PodsSymbolKey) as Pods.PodsTypeId

/** @internal */
export const podsTag = Context.GenericTag<Pods.Pods>(PodsSymbolKey)

/** @internal */
export function make(
  args: Omit<Pods.Pods, Pods.PodsTypeId>
): Pods.Pods {
  return { [PodsTypeId]: PodsTypeId, ...args }
}

/** @internal */
export const noop = Layer.succeed(podsTag, {
  [PodsTypeId]: PodsTypeId,
  assignShards: () => Effect.void,
  unassignShards: () => Effect.void,
  ping: () => Effect.void,
  sendAndGetState: () => Effect.never
})
