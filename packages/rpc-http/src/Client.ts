/**
 * @since 1.0.0
 */
import * as Resolver from "@effect/rpc-http/Resolver"
import * as Client from "@effect/rpc/Client"
import type { RpcService } from "@effect/rpc/Schema"

export * from "@effect/rpc/Client"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <S extends RpcService.DefinitionWithoutSetup>(
  schemas: S,
  options: Client.RpcClientOptions & Resolver.FetchResolverOptions,
): Client.RpcClient<S, never> =>
  Client.makeWithResolver(
    schemas as any,
    Resolver.make(options),
    options,
  ) as any
