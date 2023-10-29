/**
 * @since 1.0.0
 */
import * as Client from "@effect/rpc/Client"
import type { RpcError } from "@effect/rpc/Error"
import type { RpcSchema, RpcService } from "@effect/rpc/Schema"
import type * as Effect from "effect/Effect"
import * as Resolver from "./Resolver"

/**
 * @since 1.0.0
 */
export * from "@effect/rpc/Client"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: {
  <const S extends RpcService.DefinitionWithSetup>(
    schemas: S,
    init: RpcSchema.Input<S["__setup"]>,
    options?: Client.RpcClientOptions
  ): Effect.Effect<
    never,
    RpcError | RpcSchema.Error<S["__setup"]>,
    Client.RpcClient<
      S,
      Resolver.RpcWorkerPool
    >
  >
  <const S extends RpcService.DefinitionWithId>(
    schemas: S,
    options?: Client.RpcClientOptions
  ): Client.RpcClient<
    S,
    Resolver.RpcWorkerPool
  >
} = (<S extends RpcService.DefinitionWithSetup>(
  schemas: S,
  init: RpcSchema.Input<S["__setup"]>,
  options?: Client.RpcClientOptions
): Effect.Effect<
  never,
  RpcError | RpcSchema.Error<S["__setup"]>,
  Client.RpcClient<
    S,
    Resolver.RpcWorkerPool
  >
> =>
  Client.make(
    schemas,
    Resolver.makeFromContext,
    init,
    options
  )) as any

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeFromPool: {
  <const S extends RpcService.DefinitionWithSetup>(
    schemas: S,
    pool: Resolver.RpcWorkerPool,
    init: RpcSchema.Input<S["__setup"]>,
    options?: Client.RpcClientOptions
  ): Effect.Effect<
    never,
    RpcError | RpcSchema.Error<S["__setup"]>,
    Client.RpcClient<
      S,
      never
    >
  >
  <const S extends RpcService.DefinitionWithId>(
    schemas: S,
    pool: Resolver.RpcWorkerPool,
    options?: Client.RpcClientOptions
  ): Client.RpcClient<
    S,
    never
  >
} = (<S extends RpcService.DefinitionWithSetup>(
  schemas: S,
  pool: Resolver.RpcWorkerPool,
  init: RpcSchema.Input<S["__setup"]>,
  options?: Client.RpcClientOptions
): Effect.Effect<
  never,
  RpcError | RpcSchema.Error<S["__setup"]>,
  Client.RpcClient<
    S,
    Resolver.RpcWorkerPool
  >
> =>
  Client.make(
    schemas,
    Resolver.make(pool),
    init,
    options
  )) as any
