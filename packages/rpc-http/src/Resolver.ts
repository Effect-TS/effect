/**
 * @since 1.0.0
 */
import type { RpcResolver } from "@effect/rpc/Resolver"
import type { SchemaC } from "@effect/rpc/SchemaC"
import * as internal from "./internal/resolver"

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
