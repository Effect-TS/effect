/**
 * @since 1.0.0
 */
import * as Body from "@effect/platform/HttpBody"
import * as Client from "@effect/platform/HttpClient"
import * as ClientRequest from "@effect/platform/HttpClientRequest"
import type * as Rpc from "@effect/rpc/Rpc"
import * as Resolver from "@effect/rpc/RpcResolver"
import type * as Router from "@effect/rpc/RpcRouter"
import type * as Serializable from "@effect/schema/Serializable"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import type * as RequestResolver from "effect/RequestResolver"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <R extends Router.RpcRouter<any, any>>(
  client: Client.HttpClient
): RequestResolver.RequestResolver<
  Rpc.Request<Router.RpcRouter.Request<R>>,
  Serializable.SerializableWithResult.Context<Router.RpcRouter.Request<R>>
> =>
  Resolver.make((requests) =>
    client.post("", {
      body: Body.unsafeJson(requests)
    }).pipe(
      Effect.map((_) =>
        _.stream.pipe(
          Stream.decodeText(),
          Stream.splitLines,
          Stream.map((_) => Chunk.unsafeFromArray(JSON.parse(_))),
          Stream.flattenChunks
        )
      ),
      Stream.unwrapScoped
    )
  )<R>()

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeClient = <R extends Router.RpcRouter<any, any>>(
  baseUrl: string
): Serializable.SerializableWithResult.Context<Router.RpcRouter.Request<R>> extends never ? Effect.Effect<
    Resolver.Client<
      RequestResolver.RequestResolver<
        Rpc.Request<Router.RpcRouter.Request<R>>
      >
    >,
    never,
    Client.HttpClient
  >
  : "request context is not `never`" =>
  Effect.map(Client.HttpClient, (client) =>
    Resolver.toClient(make<R>(client.pipe(
      Client.mapRequest(ClientRequest.prependUrl(baseUrl)),
      Client.retry(
        Schedule.exponential(50).pipe(
          Schedule.intersect(Schedule.recurs(5))
        )
      )
    )) as any)) as any
