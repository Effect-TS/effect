/**
 * @since 1.0.0
 */
import * as Body from "@effect/platform/HttpBody"
import * as Client from "@effect/platform/HttpClient"
import * as ClientRequest from "@effect/platform/HttpClientRequest"
import type * as Rpc from "@effect/rpc/Rpc"
import * as Resolver from "@effect/rpc/RpcResolver"
import * as ResolverNoStream from "@effect/rpc/RpcResolverNoStream"
import type * as Router from "@effect/rpc/RpcRouter"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import type * as RequestResolver from "effect/RequestResolver"
import * as Schedule from "effect/Schedule"

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
  ResolverNoStream.make((requests) =>
    client.post("", {
      body: Body.unsafeJson(requests)
    }).pipe(
      Effect.flatMap((_) => _.json),
      Effect.scoped
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
