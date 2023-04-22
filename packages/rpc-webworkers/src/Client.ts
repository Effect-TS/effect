/**
 * @since 1.0.0
 */
import type { LazyArg } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type { Scope } from "@effect/io/Scope"
import * as Resolver from "@effect/rpc-webworkers/Resolver"
import * as Client from "@effect/rpc/Client"
import type { RpcService } from "@effect/rpc/Schema"

export * from "@effect/rpc/Client"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <S extends RpcService.DefinitionWithId>(
  schemas: S,
  options?: Client.RpcClientOptions,
): Client.RpcClient<S, Resolver.WebWorkerResolver> =>
  Client.make(schemas, Resolver.WebWorkerResolver, options)

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeWith = <S extends RpcService.DefinitionWithId>(
  schemas: S,
  evaluate: LazyArg<Worker>,
  options?: {
    size?: Effect.Effect<never, never, number>
    workerPermits?: number | undefined
  },
  clientOptions?: Client.RpcClientOptions,
): Effect.Effect<Scope, never, Client.RpcClient<S, never>> =>
  Effect.map(Resolver.makeEffect(evaluate, options), (resolver) =>
    Client.make(schemas, resolver, clientOptions),
  )
