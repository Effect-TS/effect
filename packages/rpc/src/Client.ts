/**
 * @since 1.0.0
 */
import type { Effect } from "@effect/io/Effect"
import type { RpcError } from "@effect/rpc/Error"
import type { RpcResolver } from "@effect/rpc/Resolver"
import type { RpcSchema, RpcService } from "@effect/rpc/Schema"
import type { UndecodedRpcResponse } from "@effect/rpc/Server"
import * as internal from "@effect/rpc/internal/client"

/**
 * Represents an RPC method signature.
 *
 * @category models
 * @since 1.0.0
 */
export type Rpc<C extends RpcSchema.Any, TR> = C extends RpcSchema.IO<
  infer _IE,
  infer E,
  infer _II,
  infer I,
  infer _IO,
  infer O
>
  ? (input: I) => Effect<TR, RpcError | E, O>
  : C extends RpcSchema.NoError<infer _II, infer I, infer _IO, infer O>
  ? (input: I) => Effect<TR, RpcError, O>
  : C extends RpcSchema.NoInput<infer _IE, infer E, infer _IO, infer O>
  ? Effect<TR, RpcError | E, O>
  : C extends RpcSchema.NoInputNoError<infer _IO, infer O>
  ? Effect<TR, RpcError, O>
  : never

type RpcClientRpcs<S extends RpcService.DefinitionWithId, TR> = {
  [K in keyof S]: S[K] extends RpcService.DefinitionWithId
    ? RpcClientRpcs<S[K], TR>
    : S[K] extends RpcSchema.Any
    ? Rpc<S[K], TR>
    : never
}

/**
 * Represents an RPC client
 *
 * @category models
 * @since 1.0.0
 */
export type RpcClient<
  S extends RpcService.DefinitionWithId,
  TR,
> = RpcClientRpcs<S, TR> & {
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
export const make: <
  S extends RpcService.DefinitionWithId,
  T extends RpcResolver<any>,
>(
  schemas: S,
  transport: T,
  options?: RpcClientOptions,
) => RpcClient<S, T extends RpcResolver<infer R> ? R : never> = internal.make
