/**
 * @since 1.0.0
 */
import type { RpcError } from "@effect/rpc/Error"
import * as internal from "@effect/rpc/internal/client"
import type { RpcResolver } from "@effect/rpc/Resolver"
import type { RpcSchema, RpcService } from "@effect/rpc/Schema"
import type { UndecodedRpcResponse } from "@effect/rpc/Server"
import type { Effect } from "effect/Effect"

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
  : C extends RpcSchema.NoInput<infer _IE, infer E, infer _IO, infer O> ? Effect<R, RpcError | SE | E, O>
  : C extends RpcSchema.NoInputNoError<infer _IO, infer O> ? Effect<R, RpcError | SE, O>
  : never

type RpcClientRpcs<S extends RpcService.DefinitionWithId, R, SE = never> = {
  readonly [
    K in Exclude<
      keyof S,
      "__setup"
    >
  ]: S[K] extends RpcService.DefinitionWithId ? RpcClientRpcs<S[K], R, SE | RpcService.Errors<S>>
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
    _schemas: S
    _unsafeDecode: <
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
 * Creates an RPC client
 *
 * @category constructors
 * @since 1.0.0
 */
export const make: {
  <S extends RpcService.DefinitionWithSetup>(
    schemas: S,
    init: RpcSchema.Input<S["__setup"]>,
    options?: RpcClientOptions
  ): Effect<
    never,
    RpcError | RpcSchema.Error<S["__setup"]>,
    RpcClient<S, RpcResolver<never>>
  >
  <S extends RpcService.DefinitionWithoutSetup>(
    schemas: S,
    options?: RpcClientOptions
  ): RpcClient<S, RpcResolver<never>>
} = internal.make

/**
 * Creates an RPC client with the specified resolver
 *
 * @category constructors
 * @since 1.0.0
 */
export const makeWithResolver: {
  <
    S extends RpcService.DefinitionWithSetup,
    Resolver extends
      | RpcResolver<never>
      | Effect<any, never, RpcResolver<never>>
  >(
    schemas: S,
    resolver: Resolver,
    init: RpcSchema.Input<S["__setup"]>,
    options?: RpcClientOptions | undefined
  ): Effect<
    never,
    RpcError | RpcSchema.Error<S["__setup"]>,
    RpcClient<
      S,
      [Resolver] extends [Effect<any, any, any>] ? Effect.Context<Resolver>
        : never
    >
  >
  <
    S extends RpcService.DefinitionWithoutSetup,
    Resolver extends
      | RpcResolver<never>
      | Effect<any, never, RpcResolver<never>>
  >(
    schemas: S,
    resolver: Resolver,
    options?: RpcClientOptions | undefined
  ): RpcClient<
    S,
    [Resolver] extends [Effect<any, any, any>] ? Effect.Context<Resolver>
      : never
  >
} = internal.makeWithResolver
