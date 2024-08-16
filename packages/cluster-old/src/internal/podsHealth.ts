import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Pods from "../Pods.js"
import type * as PodsHealth from "../PodsHealth.js"

/** @internal */
const PodsHealthSymbolKey = "@effect/cluster/PodsHealth"

/** @internal */
export const PodsHealthTypeId: PodsHealth.PodsHealthTypeId = Symbol.for(
  PodsHealthSymbolKey
) as PodsHealth.PodsHealthTypeId

/** @internal */
export const podsHealthTag = Context.GenericTag<PodsHealth.PodsHealth>(PodsHealthSymbolKey)

/** @internal */
export function make(args: Omit<PodsHealth.PodsHealth, PodsHealth.PodsHealthTypeId>): PodsHealth.PodsHealth {
  return Data.struct({ [PodsHealthTypeId]: PodsHealthTypeId, ...args })
}

/** @internal */
export const noop = Layer.succeed(podsHealthTag, {
  [PodsHealthTypeId]: PodsHealthTypeId,
  isAlive: () => Effect.succeed(true)
})

/** @internal */
export const local = Layer.effect(
  podsHealthTag,
  Effect.map(Pods.Pods, (podApi) =>
    make({
      isAlive: (address) => pipe(podApi.ping(address), Effect.option, Effect.map(Option.isSome))
    }))
)
