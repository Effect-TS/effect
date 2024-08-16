import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import type * as MessageState from "../MessageState.js"
import type * as SerializedEnvelope from "../SerializedEnvelope.js"
import type * as SerializedMessage from "../SerializedMessage.js"
import type * as ShardingException from "../ShardingException.js"

/** @internal */
const EntityStateSymbolKey = "@effect/cluster/EntityState"

/** @internal */
export const EntityStateTypeId = Symbol.for(EntityStateSymbolKey)

/** @internal */
export type EntityStateTypeId = typeof EntityStateTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface EntityState {
  readonly [EntityStateTypeId]: EntityStateTypeId
  readonly sendAndGetState: (
    envelope: SerializedEnvelope.SerializedEnvelope
  ) => Effect.Effect<
    MessageState.MessageState<SerializedMessage.SerializedMessage>,
    ShardingException.ExceptionWhileOfferingMessageException | ShardingException.SerializationException
  >
  readonly expirationFiber: Fiber.RuntimeFiber<void, never>
  readonly executionScope: Scope.CloseableScope
  readonly terminationFiber: Option.Option<Fiber.RuntimeFiber<void, never>>
  readonly lastReceivedAt: number
}

/** @internal */
export function make(
  data: Omit<EntityState, EntityStateTypeId>
): EntityState {
  return Data.struct({ [EntityStateTypeId]: EntityStateTypeId, ...data })
}

/** @internal */
export function withTerminationFiber(
  terminationFiber: Fiber.RuntimeFiber<void, never>
): (entityState: EntityState) => EntityState {
  return (entityState) => ({ ...entityState, terminationFiber: Option.some(terminationFiber) })
}

/** @internal */
export function withExpirationFiber(
  expirationFiber: Fiber.RuntimeFiber<void, never>
): (entityState: EntityState) => EntityState {
  return (entityState) => ({ ...entityState, expirationFiber })
}

/** @internal */
export function withLastReceivedAd(
  lastReceivedAt: number
): (entityState: EntityState) => EntityState {
  return (entityState) => ({ ...entityState, lastReceivedAt })
}
