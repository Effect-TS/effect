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
export const makeClient: <Rpcs extends Rpc.Any, const Flatten extends boolean = false>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: { flatten?: Flatten | undefined }
) => Effect.Effect<
  Flatten extends true ? RpcClient.RpcClient.Flat<Rpcs> : RpcClient.RpcClient<Rpcs>,
  never,
  Scope.Scope | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.MiddlewareClient<Rpcs>
> = Effect.fnUntraced(function*<Rpcs extends Rpc.Any, const Flatten extends boolean = false>(
  group: RpcGroup.RpcGroup<Rpcs>,
  options?: { flatten?: Flatten | undefined }
) {
  // eslint-disable-next-line prefer-const
  let client!: Effect.Effect.Success<ReturnType<typeof RpcClient.makeNoSerialization<Rpcs, never, Flatten>>>
  const server = yield* RpcServer.makeNoSerialization(group, {
    onFromServer(response) {
      return client.write(response)
    }
  })
  client = yield* RpcClient.makeNoSerialization(group, {
    supportsAck: true,
    flatten: options?.flatten,
    onFromClient({ message }) {
      return server.write(0, message)
    }
  })
  return client.client
})
