/**
 * @since 1.0.0
 */
import type * as HttpClient from "@effect/platform/Http/Client"
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
export const make: {
  <const S extends RpcService.DefinitionWithSetup>(
    schemas: S,
    init: RpcSchema.Input<S["__setup"]>,
    client: HttpClient.Client.Default,
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
    client: HttpClient.Client.Default,
    options?: Client.RpcClientOptions
  ): Client.RpcClient<
    S,
    never
  >
} = (<S extends RpcService.DefinitionWithSetup>(
  schemas: S,
  client: HttpClient.Client.Default,
  init: RpcSchema.Input<S["__setup"]>,
  options?: Client.RpcClientOptions
): Effect.Effect<
  never,
  RpcError | RpcSchema.Error<S["__setup"]>,
  Client.RpcClient<
    S,
    never
  >
> =>
  Client.make(
    schemas,
    Resolver.make(client),
    init,
    options
  )) as any
