/**
 * @since 1.0.0
 */
import { WebWorkerResolver } from "@effect/rpc-webworkers/Resolver"
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
): Client.RpcClient<S, WebWorkerResolver> =>
  Client.make(schemas, WebWorkerResolver, options)
