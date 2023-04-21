/**
 * @since 1.0.0
 */
import type { Effect } from "@effect/io/Effect"
import type { RpcError } from "@effect/rpc/Error"
import type { RpcRequest, RpcResolver } from "@effect/rpc/Resolver"
import type { RpcSchema, RpcService } from "@effect/rpc/Schema"
import type { UndecodedRpcResponse } from "@effect/rpc/Server"
import * as internal from "@effect/rpc/internal/client"
import type { Tag } from "@effect/data/Context"
import type { Cache } from "@effect/io/Request"

/**
 * Represents an RPC method signature.
 *
 * @category models
 * @since 1.0.0
 */
export type Rpc<C extends RpcSchema.Any, SE> = C extends RpcSchema.IO<
  infer _IE,
  infer E,
  infer _II,
  infer I,
  infer _IO,
  infer O
>
  ? (input: I) => Effect<never, RpcError | SE | E, O>
  : C extends RpcSchema.NoError<infer _II, infer I, infer _IO, infer O>
  ? (input: I) => Effect<never, RpcError | SE, O>
  : C extends RpcSchema.NoInput<infer _IE, infer E, infer _IO, infer O>
  ? Effect<never, RpcError | SE | E, O>
  : C extends RpcSchema.NoInputNoError<infer _IO, infer O>
  ? Effect<never, RpcError | SE, O>
  : never

type RpcClientRpcs<S extends RpcService.DefinitionWithId, SE = never> = {
  [K in keyof S]: S[K] extends RpcService.DefinitionWithId
    ? RpcClientRpcs<S[K], SE | RpcService.Errors<S>>
    : S[K] extends RpcSchema.Any
    ? Rpc<S[K], SE | RpcService.Errors<S>>
    : never
}

/**
 * @category tags
 * @since 1.0.0
 */
export interface RpcCache {
  readonly _: unique symbol
}

/**
 * @category tags
 * @since 1.0.0
 */
export const RpcCache: Tag<RpcCache, Cache<RpcRequest>> = internal.RpcCache

/**
 * Represents an RPC client
 *
 * @category models
 * @since 1.0.0
 */
export type RpcClient<S extends RpcService.DefinitionWithId> =
  RpcClientRpcs<S> & {
    _schemas: S
    _unsafeDecode: <
      M extends RpcService.Methods<S>,
      O extends UndecodedRpcResponse<M, any>,
    >(
      method: M,
      output: O,
    ) => O extends UndecodedRpcResponse<M, infer O> ? O : never
  }
/**
 * @category models
 * @since 1.0.0
 */
export interface RpcClientOptions {
  readonly spanPrefix?: string
}

/**
 * Creates an RPC client
 *
 * @category constructors
 * @since 1.0.0
 */
export const make: <S extends RpcService.DefinitionWithId>(
  schemas: S,
  transport: RpcResolver<never>,
  options?: RpcClientOptions,
) => RpcClient<S> = internal.make
