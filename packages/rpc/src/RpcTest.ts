/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type * as Rpc from "./Rpc.js"
import * as RpcClient from "./RpcClient.js"
import type * as RpcGroup from "./RpcGroup.js"
import * as RpcServer from "./RpcServer.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeClient: <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>
) => Effect.Effect<
  RpcClient.RpcClient<Rpcs>,
  never,
  Scope.Scope | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>
) {
  const server = yield* RpcServer.makeNoSerialization(group)
  const client = yield* RpcClient.makeNoSerialization(group, {
    supportsAck: true,
    onFromClient(message) {
      return server.write(0, message)
    }
  })
  yield* Effect.forkScoped(server.run(client.write))
  return client.client
})
