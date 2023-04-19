/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as Request from "@effect/io/Request"
import type * as Resolver from "@effect/io/RequestResolver"
import type { RpcError, RpcTransportError } from "@effect/rpc/Error"
import * as internal from "@effect/rpc/internal/resolver"

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcResolver<R>
  extends Resolver.RequestResolver<R, RpcRequest> {}

/**
 * @category models
 * @since 1.0.0
 */
export interface RpcRequest
  extends Request.Request<RpcError, unknown>,
    RpcRequest.Fields {}

export namespace RpcRequest {
  /**
   * @category models
   * @since 1.0.0
   */
  export interface Tracing {
    readonly spanName: string
    readonly traceId: string
    readonly spanId: string
  }

  /**
   * @category models
   * @since 1.0.0
   */
  export interface Fields extends Tracing {
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
    requests: ReadonlyArray<RpcRequest>,
  ) => Effect.Effect<R, RpcTransportError, ReadonlyArray<RpcResponse>>,
) => RpcResolver<R> = internal.make
