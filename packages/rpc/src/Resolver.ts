/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as Request from "effect/Request"
import type * as Resolver from "effect/RequestResolver"
import type { RpcError, RpcTransportError } from "./Error.js"
import * as internal from "./internal/resolver.js"
import type { RpcSchema } from "./Schema.js"

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcResolver<R> extends Resolver.RequestResolver<RpcRequest, R> {}

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcRequest extends Request.Request<RpcError, unknown> {
  readonly payload: RpcRequest.Payload
  readonly hash: number
  readonly schema: RpcSchema.Any
}

/**
 * @since 1.0.0
 */
export namespace RpcRequest {
  /**
   * @category models
   * @since 1.0.0
   */
  export interface Tracing {
    readonly spanName: string
    readonly traceId: string
    readonly spanId: string
    readonly sampled: boolean
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface Payload extends Tracing {
    readonly _tag: string
    readonly input?: unknown
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface WithInput<M extends string, I> extends Tracing {
    readonly _tag: M
    readonly input: I
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface NoInput<M extends string> extends Tracing {
    readonly _tag: M
  }
}

/**
 * @category models
 * @since 1.0.0
 */
export type RpcResponse = RpcResponse.Error | RpcResponse.Success

/**
 * @since 1.0.0
 */
export namespace RpcResponse {
  /**
   * @category models
   * @since 1.0.0
   */
  export interface Error {
    readonly _tag: "Error"
    error: RpcError
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface Success {
    readonly _tag: "Success"
    value: unknown
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: <R>(
  send: (
    requests: ReadonlyArray<RpcRequest.Payload>
  ) => Effect.Effect<R, RpcTransportError, unknown>
) => RpcResolver<R> = internal.make

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeWithSchema: <R>(
  send: (
    requests: ReadonlyArray<RpcRequest>
  ) => Effect.Effect<R, RpcTransportError, unknown>
) => RpcResolver<R> = internal.makeWithSchema

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeSingle: <R>(
  send: (
    request: RpcRequest.Payload
  ) => Effect.Effect<R, RpcTransportError, unknown>
) => RpcResolver<R> = internal.makeSingle

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeSingleWithSchema: <R>(
  send: (request: RpcRequest) => Effect.Effect<R, RpcTransportError, unknown>
) => RpcResolver<R> = internal.makeSingleWithSchema
