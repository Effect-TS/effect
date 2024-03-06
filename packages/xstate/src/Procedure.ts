/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type { Request } from "effect/Request"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/xstate/Procedure")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Procedure<Request extends Schema.TaggedRequest.Any, State, R> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly schema: Schema.Schema<Request, unknown>
  readonly tag: Request["_tag"]
  readonly handler: Handler<Request, State, any, R>
}

/**
 * @since 1.0.0
 * @category models
 */
export type Handler<
  Request extends Schema.TaggedRequest.Any,
  State,
  Requests extends Schema.TaggedRequest.Any,
  R
> = (request: Request, state: State, context: Procedure.Context<Requests, State>) => Effect.Effect<
  readonly [response: Request.Success<Request>, state: State],
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
  export interface Context<Requests extends Schema.TaggedRequest.Any, State> {
    readonly send: <Req extends Requests>(request: Req) => Effect.Effect<
      Request.Success<Req>,
      Request.Error<Req>
    >
    readonly fork: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>
    readonly forkWith: <A, E, R>(
      state: State,
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<readonly [void, State], never, R>
    readonly forkWithState: <A, E, R>(
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<readonly [void, State], never, R>
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
export const make =
  <Requests extends Schema.TaggedRequest.Any, State>() =>
  <Req extends Schema.TaggedRequest.Any, I, SR, R>(
    schema: Schema.Schema<Req, I, SR>,
    tag: Req["_tag"],
    handler: Handler<Req, State, Requests, R>
  ): Procedure<Req, State, R> => ({
    [TypeId]: TypeId,
    schema: schema as any,
    handler,
    tag,
    pipe() {
      return pipeArguments(this, arguments)
    }
  })
