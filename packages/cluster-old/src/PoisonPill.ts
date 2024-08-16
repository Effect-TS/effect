/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import { TypeIdSchema } from "./internal/utils.js"

/** @internal */
const PoisonPillSymbolKey = "@effect/cluster/PoisonPill"

/**
 * @since 1.0.0
 * @category symbols
 */
export const PoisonPillTypeId: unique symbol = Symbol.for(PoisonPillSymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type PoisonPillTypeId = typeof PoisonPillTypeId

/** @internal */
const PoisonPillTypeIdSchema = TypeIdSchema(PoisonPillSymbolKey, PoisonPillTypeId)

/**
 * @since 1.0.0
 */
export namespace PoisonPill {
  /**
   * This is the shape that a PoisonPill takes over the wire.
   *
   * @since 1.0.0
   * @category models
   */
  export interface Encoded extends Schema.Schema.Encoded<typeof PoisonPill> {}
}

/**
 * A PoisonPill is a special value that tells a behaviour entity to shut itself down.
 * PoisonPill is handled only when you are using a Queue-based RecipientBehaviour.
 * Other RecipientBehaviour such as fromFunctionEffect would not care about PoisonPill.
 *
 * @since 1.0.0
 * @category models
 */
export class PoisonPill extends Schema.Class<PoisonPill>(PoisonPillSymbolKey)({
  [PoisonPillTypeId]: Schema.propertySignature(PoisonPillTypeIdSchema).pipe(Schema.fromKey(PoisonPillSymbolKey))
}) {
}

/**
 * Constructs a new PosionPill
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<PoisonPill> = Effect.succeed(
  new PoisonPill({ [PoisonPillTypeId]: PoisonPillTypeId })
)

/**
 * Checks if the given value is a PoisonPill.
 *
 * @since 1.0.0
 * @category utils
 */
export function isPoisonPill(value: unknown): value is PoisonPill {
  return (
    typeof value === "object" &&
    value !== null &&
    PoisonPillTypeId in value &&
    value[PoisonPillTypeId] === PoisonPillTypeId
  )
}

/**
 * This is the schema for a PoisonPill that is used to encode the value over the wire.
 * This is useful if you want a behavior that can be shut down from an external message.
 *
 * @since 1.0.0
 * @category schema
 */
export const schema: Schema.Schema<
  PoisonPill,
  PoisonPill.Encoded
> = Schema.asSchema(PoisonPill)

/**
 * Attempts to take a message from the queue in the same way Queue.take does.
 * If the result is a PoisonPill, it will interrupt the effect.
 *
 * @since 1.0.0
 * @category utils
 */
export function takeOrInterrupt<Req>(
  dequeue: Queue.Dequeue<Req | PoisonPill>
): Effect.Effect<Req> {
  return pipe(
    Queue.take(dequeue),
    Effect.flatMap((msg) => isPoisonPill(msg) ? Effect.interrupt : Effect.succeed(msg))
  )
}
