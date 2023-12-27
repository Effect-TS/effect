/**
 * @since 1.0.0
 */
import * as Client from "@effect/rpc/Client"
import type { RpcError } from "@effect/rpc/Error"
import type { RpcSchema, RpcService } from "@effect/rpc/Schema"
import type * as Effect from "effect/Effect"
import * as Resolver from "./Resolver.js"

/**
 * @since 1.0.0
 */
export * from "@effect/rpc/Client"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <S extends RpcService.DefinitionWithId>(
  schemas: S,
  ...args: [S] extends [RpcService.DefinitionWithSetup] ? [
      init: RpcSchema.Input<S["__setup"]>,
      options?: Client.RpcClientOptions
    ] :
    [options?: Client.RpcClientOptions]
): [S] extends [RpcService.DefinitionWithSetup] ? Effect.Effect<
    never,
    RpcError | RpcSchema.Error<S["__setup"]>,
    Client.RpcClient<
      S,
      Resolver.RpcWorkerPool
    >
  > :
  Client.RpcClient<
    S,
    Resolver.RpcWorkerPool
  > =>
  Client.make(
    schemas as any,
    Resolver.makeFromContext,
    args[0],
    args[1]
  ) as any

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeFromPool = <S extends RpcService.DefinitionWithId>(
  schemas: S,
  pool: Resolver.RpcWorkerPool,
  ...args: [S] extends [RpcService.DefinitionWithSetup] ? [
      init: RpcSchema.Input<S["__setup"]>,
      options?: Client.RpcClientOptions
    ] :
    [options?: Client.RpcClientOptions]
): [S] extends [RpcService.DefinitionWithSetup] ?
  Effect.Effect<never, RpcError | RpcSchema.Error<S["__setup"]>, Client.RpcClient<S, never>> :
  Client.RpcClient<S, Resolver.RpcWorkerPool> =>
  Client.make(
    schemas as any,
    Resolver.make(pool),
    args[0],
    args[1]
  ) as any
