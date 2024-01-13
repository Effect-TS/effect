/**
 * @since 1.0.0
 */
import * as MsgPack from "@effect/experimental/MsgPack"
import * as Body from "@effect/platform/Http/Body"
import type * as Client from "@effect/platform/Http/Client"
import * as ClientRequest from "@effect/platform/Http/ClientRequest"
import * as Resolver from "@effect/rpc/Resolver"
import type * as Router from "@effect/rpc/Router"
import type * as Rpc from "@effect/rpc/Rpc"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import type * as RequestResolver from "effect/RequestResolver"
import * as Stream from "effect/Stream"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <R extends Router.Router<any, any>>(
  client: Client.Client.Default
): RequestResolver.RequestResolver<
  Rpc.Request<Router.Router.Request<R>>,
  Serializable.SerializableWithResult.Context<Router.Router.Request<R>>
> =>
  Resolver.make((requests) =>
    client(ClientRequest.post("", {
      body: Body.unsafeJson(requests)
    })).pipe(
      Effect.map((_) =>
        Stream.pipeThroughChannel(
          _.stream,
          MsgPack.unpack()
        )
      ),
      Stream.unwrap
    )
  )<R>()
