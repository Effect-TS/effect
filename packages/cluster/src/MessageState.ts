/**
 * @since 1.0.0
 */
import * as Data from "effect/Data"
import type { Exit } from "effect/Exit"
import { identity } from "effect/Function"
import { hasProperty } from "effect/Predicate"
import * as Schema from "effect/Schema"
import { SnowflakeFromString } from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/MessageState")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const isMessageState = (u: unknown): u is MessageState<unknown, unknown> => hasProperty(u, TypeId)

/**
 * Represents the state of a message after it has been delivered to an entity
 * for processing.
 *
 * A message can either be in an `Acknowledged` state, indicating that the
 * message was successfully recieved by the entity but has not yet been
 * processed, or in a `Processed` state, indicating that the message has been
 * processed by the entity and a result is available.
 *
 * @since 1.0.0
 * @category models
 */
export type MessageState<A, E> = Unacknowledged | Acknowledged | Processing | Processed<A, E>

/**
 * Represents the state of a message after it has been delivered to an entity
 * for processing.
 *
 * A message can either be in an `Acknowledged` state, indicating that the
 * message was successfully recieved by the entity but has not yet been
 * processed, or in a `Processed` state, indicating that the message has been
 * processed by the entity and a result is available.
 *
 * @since 1.0.0
 * @category schemas
 */
export const MessageState = <A extends Schema.Schema.Any, E extends Schema.Schema.All>(
  options: {
    readonly success: A
    readonly failure: E
  }
): Schema.Schema<
  MessageState<A["Type"], E["Type"]>,
  | { readonly _tag: "Unacknowledged" }
  | { readonly _tag: "Acknowledged" }
  | { readonly _tag: "Processing"; readonly lastConsumedReplyId: null | string }
  | { readonly _tag: "Processed"; readonly result: Schema.ExitEncoded<A["Encoded"], E["Encoded"], unknown> },
  A["Context"] | E["Context"]
> => Schema.Union(Unacknowledged, Acknowledged, Processing, Processed.schema(options))

/**
 * @since 1.0.0
 * @category models
 */
export class Unacknowledged
  extends Schema.TaggedClass<Unacknowledged>("@effect/cluster/MessageState/Unacknowledged")("Unacknowledged", {})
{
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * Represents the state of a message after being acknowledged by an entity.
 *
 * This message state indicates that an entity has received the message
 * successfully and will eventually process the message at some later time.
 *
 * @since 1.0.0
 * @category models
 */
export class Acknowledged
  extends Schema.TaggedClass<Acknowledged>("@effect/cluster/MessageState/Acknowledged")("Acknowledged", {})
{
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * @since 1.0.0
 * @category models
 */
export class Processing
  extends Schema.TaggedClass<Processing>("@effect/cluster/MessageState/Processing")("Processing", {
    lastConsumedReplyId: Schema.NullOr(SnowflakeFromString)
  })
{
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * Represents the state of a message after being processed by an entity.
 *
 * This message state indicates that an entity has received **and processed**
 * the message and provides access to the result of processing the message.
 *
 * @since 1.0.0
 * @category models
 */
export class Processed<A, E> extends Data.TaggedClass("Processed")<{
  readonly result: Exit<A, E>
}> {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
  /**
   * @since 1.0.0
   */
  static schema<A extends Schema.Schema.Any, E extends Schema.Schema.All>(options: {
    readonly success: A
    readonly failure: E
  }): Schema.Schema<
    Processed<A["Type"], E["Type"]>,
    {
      readonly _tag: "Processed"
      readonly result: Schema.ExitEncoded<A["Encoded"], E["Encoded"], unknown>
    },
    A["Context"] | E["Context"]
  > {
    return Schema.transform(
      Schema.Struct({
        _tag: Schema.Literal("Processed"),
        result: Schema.Exit({ ...options, defect: Schema.Defect })
      }),
      Schema.declare((u): u is Processed<A["Type"], E["Type"]> => isMessageState(u) && u._tag === "Processed"),
      {
        decode: (encoded) => new Processed(encoded),
        encode: identity
      }
    )
  }
}
