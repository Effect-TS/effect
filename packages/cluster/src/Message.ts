/**
 * @since 1.0.0
 */
import type * as Exit_ from "effect/Exit"
import type * as PrimaryKey from "effect/PrimaryKey"
import type * as Schema from "effect/Schema"
import type * as Types from "effect/Types"
import * as internal from "./internal/message.js"

/**
 * A Message is a request for an entity that will process it.
 * A Message also has a PrimaryKey so that the receiver is eventually able to detect duplicated messages.
 *
 * @since 1.0.0
 * @category models
 */
export interface Message<A, AI, E, EI>
  extends Schema.SerializableWithResult<any, any, never, A, AI, E, EI, never>, PrimaryKey.PrimaryKey
{}

/**
 * @since 1.0.0
 * @category models
 */
export namespace Message {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any =
    | Message<any, any, any, any>
    | Message<any, any, never, never>

  /**
   * Extracts the success type from a `Message`.
   *
   * @since 1.0.0
   * @category utils
   */
  export type Success<S> = S extends Message<infer A, infer _AI, infer _E, infer _EI> ? A : never

  /**
   * Extracts the success type from a `Message`.
   *
   * @since 1.0.0
   * @category utils
   */
  export type SuccessEncoded<S> = S extends Message<infer _A, infer _AI, infer _E, infer _EI> ? _AI : never

  /**
   * Extracts the error type from a `Message`.
   *
   * @since 1.0.0
   * @category utils
   */
  export type Error<S> = S extends Message<infer _A, infer _AI, infer E, infer _EI> ? E : never

  /**
   * Extracts the error type from a `Message`.
   *
   * @since 1.0.0
   * @category utils
   */
  export type ErrorEncoded<S> = S extends Message<infer _A, infer _AI, infer _E, infer _EI> ? _EI : never

  /**
   * Extracts the exit type from a `Message`.
   *
   * @since 1.0.0
   * @category utils
   */
  export type Exit<S> = S extends Schema.WithResult<infer A, infer _AI, infer E, infer _EI, infer _R> ? Exit_.Exit<A, E>
    : never
}

/**
 * @since 1.0.0
 * @category schemas
 */
export interface TaggedMessageConstructor<Tag extends string, Self, R, IS, S, IE, E, IA, A>
  extends Schema.Schema<Self, Types.Simplify<IS & { readonly _tag: Tag }>, R>
{
  new(
    props: Types.Equals<S, {}> extends true ? void : S,
    disableValidation?: boolean
  ):
    & Schema.TaggedRequest<Tag, S, IS & { readonly _tag: Tag }, never, A, IA, E, IE, never>
    & S
    & PrimaryKey.PrimaryKey
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const TaggedMessage = internal.TaggedMessage_

/**
 * @since 1.0.0
 * @category utils
 */
export const isMessageWithResult: (value: unknown) => value is Message<unknown, unknown, unknown, unknown> =
  internal.isMessageWithResult

/**
 * Extracts the exit schema from a Message. This schema will be used to encode the remote exit of the Message processor.
 *
 * @since 1.0.0
 * @category utils
 */
export const exitSchema: <A extends Message.Any>(
  message: A
) => Schema.Schema<Message.Exit<A>, unknown> = internal.exitSchema

/**
 * Extracts the failure schema from a Message. This schema will be used to encode remote failures of the Message processor.
 *
 * @since 1.0.0
 * @category utils
 */
export const failureSchema: <A extends Message.Any>(
  message: A
) => Schema.Schema<Message.Error<A>, unknown> = internal.failureSchema

/**
 * Extracts the success schema from a Message. This schema will be used to encode the remote success of the Message processor.
 *
 * @since 1.0.0
 * @category utils
 */
export const successSchema: <A extends Message.Any>(
  message: A
) => Schema.Schema<Message.Success<A>, unknown> = internal.successSchema
