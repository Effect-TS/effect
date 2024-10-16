/**
 * @since 1.0.0
 */
import type * as Deferred from "effect/Deferred"
import type * as Effect from "effect/Effect"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import type { Request } from "effect/Request"
import type * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/experimental/Machine/Procedure")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface TaggedRequest<Tag extends string, A, E> extends Request<A, E> {
  readonly _tag: Tag
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace TaggedRequest {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any =
    | TaggedRequest<string, any, any>
    | TaggedRequest<string, any, never>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Procedure<Request extends TaggedRequest.Any, State, R> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly tag: Request["_tag"]
  readonly handler: Handler<Request, State, any, R>
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const SerializableTypeId: unique symbol = Symbol.for("@effect/experimental/Machine/SerializableProcedure")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SerializableTypeId = typeof SerializableTypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSerializable = (u: unknown): u is SerializableProcedure<any, any, any> =>
  Predicate.hasProperty(u, SerializableTypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface SerializableProcedure<Request extends Schema.TaggedRequest.All, State, R>
  extends Procedure<Request, State, R>
{
  readonly [SerializableTypeId]: SerializableTypeId
  readonly schema: Schema.Schema<Request, unknown>
}

/**
 * @since 1.0.0
 * @category symbols
 */
export const NoReply = Symbol.for("@effect/experimental/Machine/Procedure/NoReply")

/**
 * @since 1.0.0
 * @category symbols
 */
export type NoReply = typeof NoReply

/**
 * @since 1.0.0
 * @category models
 */
export type Handler<
  Request extends TaggedRequest.Any,
  State,
  Requests extends TaggedRequest.Any,
  R
> = (
  context: Procedure.Context<Requests | Request, Request, State>
) => Effect.Effect<
  readonly [response: Request.Success<Request> | NoReply, state: State],
  Request.Error<Request>,
  R
>

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Procedure {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface BaseContext {
    readonly fork: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>
    readonly forkOne: {
      (id: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>
      <A, E, R>(effect: Effect.Effect<A, E, R>, id: string): Effect.Effect<void, never, R>
    }
    readonly forkReplace: {
      (id: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>
      <A, E, R>(effect: Effect.Effect<A, E, R>, id: string): Effect.Effect<void, never, R>
    }
    readonly unsafeSend: <Req extends TaggedRequest.Any>(request: Req) => Effect.Effect<void>
    readonly unsafeSendAwait: <Req extends TaggedRequest.Any>(request: Req) => Effect.Effect<
      Request.Success<Req>,
      Request.Error<Req>
    >
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ContextProto<Requests extends TaggedRequest.Any, State> extends BaseContext {
    readonly send: <Req extends Requests>(request: Req) => Effect.Effect<void>
    readonly sendAwait: <Req extends Requests>(request: Req) => Effect.Effect<
      Request.Success<Req>,
      Request.Error<Req>
    >
    readonly forkWith: {
      (state: State): <A, E, R>(
        effect: Effect.Effect<A, E, R>
      ) => Effect.Effect<readonly [void, State], never, R>
      <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        state: State
      ): Effect.Effect<readonly [void, State], never, R>
    }
    readonly forkOneWith: {
      (
        id: string,
        state: State
      ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<readonly [void, State], never, R>
      <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        id: string,
        state: State
      ): Effect.Effect<readonly [void, State], never, R>
    }
    readonly forkReplaceWith: {
      (
        id: string,
        state: State
      ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<readonly [void, State], never, R>
      <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        id: string,
        state: State
      ): Effect.Effect<readonly [void, State], never, R>
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Context<Requests extends TaggedRequest.Any, Request extends TaggedRequest.Any, State>
    extends ContextProto<Requests, State>
  {
    readonly request: Request
    readonly state: State
    readonly deferred: Deferred.Deferred<
      Request.Success<Request>,
      Request.Error<Request>
    >
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type InferRequest<P> = P extends Procedure<infer Req, infer _, infer _> ? Req : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type InferContext<P> = P extends Procedure<infer _, infer _, infer R> ? R : never
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Requests extends TaggedRequest.Any, State>() =>
<Req extends TaggedRequest.Any>() =>
<R>(
  tag: Req["_tag"],
  handler: Handler<Req, State, Requests, R>
): Procedure<Req, State, R> => ({
  [TypeId]: TypeId,
  handler,
  tag,
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerializable = <
  Requests extends TaggedRequest.Any,
  State
>() =>
<
  Req extends Schema.TaggedRequest.All,
  IS,
  R,
  RS
>(
  schema: Schema.Schema<Req, IS, RS> & { readonly _tag: Req["_tag"] },
  handler: Handler<Req, State, Requests, R>
): SerializableProcedure<Req, State, R | Schema.SerializableWithResult.Context<Req>> => ({
  [TypeId]: TypeId,
  [SerializableTypeId]: SerializableTypeId,
  schema: schema as any,
  handler,
  tag: schema._tag,
  pipe() {
    return pipeArguments(this, arguments)
  }
})
