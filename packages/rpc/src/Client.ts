/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type { RpcError } from "./Error.js"
import * as internal from "./internal/client.js"
import type { RpcResolver } from "./Resolver.js"
import type { RpcSchema, RpcService } from "./Schema.js"
import type { UndecodedRpcResponse } from "./Server.js"
/**
 * Represents an RPC method signature.
 *
 * @category models
 * @since 1.0.0
 */
export type Rpc<C extends RpcSchema.Any, R, SE> = C extends RpcSchema.IO<
  infer _IE,
  infer E,
  infer _II,
  infer I,
  infer _IO,
  infer O
> ? (input: I) => Effect<R, RpcError | SE | E, O>
  : C extends RpcSchema.NoError<infer _II, infer I, infer _IO, infer O> ? (input: I) => Effect<R, RpcError | SE, O>
  : C extends RpcSchema.NoOutput<infer _IE, infer E, infer _II, infer I>
    ? (input: I) => Effect<R, RpcError | SE | E, void>
  : C extends RpcSchema.NoErrorNoOutput<infer _II, infer I> ? (input: I) => Effect<R, RpcError | SE, void>
  : C extends RpcSchema.NoInput<infer _IE, infer E, infer _IO, infer O> ? Effect<R, RpcError | SE | E, O>
  : C extends RpcSchema.NoInputNoError<infer _IO, infer O> ? Effect<R, RpcError | SE, O>
  : never

type RpcClientRpcs<S extends RpcService.DefinitionWithId, R, SE = never, Depth extends ReadonlyArray<number> = []> = {
  readonly [
    K in Exclude<
      keyof S,
      "__setup"
    >
  ]: S[K] extends RpcService.DefinitionWithId ?
    Depth["length"] extends 3 ? never : RpcClientRpcs<S[K], R, SE | RpcService.Errors<S>, [0, ...Depth]>
    : S[K] extends RpcSchema.Any ? Rpc<S[K], R, SE | RpcService.Errors<S>>
    : never
}

/**
 * Represents an RPC client
 *
 * @category models
 * @since 1.0.0
 */
export type RpcClient<S extends RpcService.DefinitionWithId, R> =
  & RpcClientRpcs<
    S,
    R
  >
  & {
    readonly _schemas: S
    readonly _unsafeDecode: <
      M extends RpcService.Methods<S>,
      O extends UndecodedRpcResponse<M, any>
    >(
      method: M,
      output: O
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
 * Creates an RPC client with the specified resolver
 *
 * @category constructors
 * @since 1.0.0
 */
export const make: <
  const S extends RpcService.DefinitionWithId,
  Resolver extends RpcResolver<never> | Effect<any, never, RpcResolver<never>>
>(
  schemas: S,
  resolver: Resolver,
  ...initAndOptions: [S] extends [RpcService.DefinitionWithSetup]
    ? [init: RpcSchema.Input<S["__setup"]>, options?: RpcClientOptions | undefined]
    : [options?: RpcClientOptions | undefined]
) => [S] extends [RpcService.DefinitionWithSetup] ? Effect<
    never,
    RpcError | RpcSchema.Error<S["__setup"]>,
    RpcClient<S, [Resolver] extends [Effect<any, any, any>] ? Effect.Context<Resolver> : never>
  >
  : RpcClient<S, [Resolver] extends [Effect<any, any, any>] ? Effect.Context<Resolver> : never> = internal.make
