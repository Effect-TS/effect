/**
 * @since 1.0.0
 */
import * as internal from "@effect/rpc-http/internal/resolver"
import type { RpcResolver } from "@effect/rpc/Resolver"
import type { SchemaC } from "@effect/rpc/SchemaC"

/**
 * @category models
 * @since 1.0.0
 */
export interface FetchResolverOptions {
  readonly url: string
  readonly init?: Omit<RequestInit, "signal" | "body" | "method">
}

/**
 * @category errors
 * @since 1.0.0
 */
export interface RpcFetchError {
  readonly _tag: "RpcFetchError"
  readonly reason: "FetchError" | "JsonDecodeError"
  readonly error: unknown
}

/**
 * @category errors
 * @since 1.0.0
 */
export const RpcFetchError: SchemaC<
  RpcFetchError,
  RpcFetchError,
  { readonly reason: "FetchError" | "JsonDecodeError"; readonly error: unknown }
> = internal.RpcFetchError

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: (options: FetchResolverOptions) => RpcResolver<never> = internal.make
