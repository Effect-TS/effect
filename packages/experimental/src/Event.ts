/**
 * @since 1.0.0
 */
import * as MsgPack from "@effect/platform/MsgPack"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/experimental/Event")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isEvent = (u: unknown): u is Event<any, any, any, any> => Predicate.hasProperty(u, TypeId)

/**
 * Represents an event in an EventLog.
 *
 * @since 1.0.0
 * @category models
 */
export interface Event<
  out Tag extends string,
  in out Payload extends Schema.Schema.Any = typeof Schema.Void,
  in out Success extends Schema.Schema.Any = typeof Schema.Void,
  in out Error extends Schema.Schema.All = typeof Schema.Never
> {
  readonly [TypeId]: TypeId
  readonly tag: Tag
  readonly primaryKey: (payload: Schema.Schema.Type<Payload>) => string
  readonly payload: Payload
  readonly payloadMsgPack: MsgPack.schema<Payload>
  readonly success: Success
  readonly error: Error
}

/**
 * @since 1.0.0
 * @category models
 */
export interface EventHandler<in out Tag extends string> {
  readonly _: unique symbol
  readonly tag: Tag
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Event {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId
    readonly tag: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface AnyWithProps extends Event<string, Schema.Schema.Any, Schema.Schema.Any, Schema.Schema.Any> {}

  /**
   * @since 1.0.0
   * @category models
   */
  export type ToService<A> = A extends Event<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error
  > ? EventHandler<_Tag> :
    never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Tag<A> = A extends Event<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error
  > ? _Tag :
    never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ErrorSchema<A extends Any> = A extends Event<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error
  > ? _Error
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Error<A extends Any> = Schema.Schema.Type<ErrorSchema<A>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type AddError<A extends Any, Error extends Schema.Schema.Any> = A extends Event<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error
  > ? Event<_Tag, _Payload, _Success, _Error | Error>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type PayloadSchema<A extends Any> = A extends Event<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error
  > ? _Payload
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Payload<A extends Any> = Schema.Schema.Type<PayloadSchema<A>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type TaggedPayload<A extends Any> = A extends Event<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error
  > ? {
      readonly _tag: _Tag
      readonly payload: Schema.Schema.Type<_Payload>
    }
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type SuccessSchema<A extends Any> = A extends Event<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error
  > ? _Success
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Success<A extends Any> = Schema.Schema.Type<SuccessSchema<A>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<A> = A extends Event<
    infer _Name,
    infer _Payload,
    infer _Success,
    infer _Error
  > ? Schema.Schema.Context<_Payload> | Schema.Schema.Context<_Success> | Schema.Schema.Context<_Error>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithTag<Events extends Any, Tag extends string> = Extract<Events, { readonly tag: Tag }>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExcludeTag<Events extends Any, Tag extends string> = Exclude<Events, { readonly tag: Tag }>

  /**
   * @since 1.0.0
   * @category models
   */
  export type PayloadWithTag<Events extends Any, Tag extends string> = Payload<WithTag<Events, Tag>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type SuccessWithTag<Events extends Any, Tag extends string> = Success<WithTag<Events, Tag>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ErrorWithTag<Events extends Any, Tag extends string> = Error<WithTag<Events, Tag>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ContextWithTag<Events extends Any, Tag extends string> = Context<WithTag<Events, Tag>>
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  Tag extends string,
  Payload extends Schema.Schema.Any = typeof Schema.Void,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never
>(options: {
  readonly tag: Tag
  readonly primaryKey: (payload: Schema.Schema.Type<Payload>) => string
  readonly payload?: Payload
  readonly success?: Success
  readonly error?: Error
}): Event<Tag, Payload, Success, Error> =>
  Object.assign(Object.create(Proto), {
    tag: options.tag,
    primaryKey: options.primaryKey,
    payload: options.payload ?? Schema.Void,
    payloadMsgPack: MsgPack.schema(options.payload ?? Schema.Void),
    success: options.success ?? Schema.Void,
    error: options.error ?? Schema.Never
  })
