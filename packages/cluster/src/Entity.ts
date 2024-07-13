/**
 * @since 1.0.0
 */
import type { Schema } from "@effect/schema/Schema"
import * as Data from "effect/Data"
import * as Predicate from "effect/Predicate"
import type { Envelope } from "./Envelope.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/Entity")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * An `Entity` represents a logical unit for processing work within the cluster
 * that is capable of maintaining its own state and processing incoming
 * messages. The behavior of an `Entity` is defined by the set of operations or
 * actions it can perform in response to an incoming message.
 *
 * An `Entity` can either be a `Standard` entity, which represents an entity
 * that is only ever alive on a single pod in the cluster at a time, or a
 * `Clustered` entity, which can be alive on multiple pods in the cluster at a
 * time.
 *
 * @since 1.0.0
 * @category models
 */
export type Entity<Msg extends Envelope.AnyMessage> =
  | Standard<Msg>
  | Clustered<Msg>

/**
 * @since 1.0.0
 */
export declare namespace Entity {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface CommonProps<Msg extends Envelope.AnyMessage> {
    /**
     * The name to give to the entity.
     */
    readonly name: string
    /**
     * The schema definition for messages that the entity is capable of
     * processing.
     */
    readonly schema: Schema<Msg, any>
  }
}

/**
 * A `Standard` entity is an entity that is only ever alive on a single pod at
 * any given time.
 *
 * @since 1.0.0
 * @category models
 */
export class Standard<
  Msg extends Envelope.AnyMessage
> extends Data.TaggedClass("Standard")<Entity.CommonProps<Msg>> {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * A `Clustered` entity is an entity that may be alive on multiple pods at any
 * given time.
 *
 * @since 1.0.0
 * @category models
 */
export class Clustered<
  Msg extends Envelope.AnyMessage
> extends Data.TaggedClass("Clustered")<Entity.CommonProps<Msg>> {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEntity = (u: unknown): u is Entity<Envelope.AnyMessage> =>
  Predicate.isObject(u) && Predicate.hasProperty(u, TypeId)
