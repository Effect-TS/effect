/**
 * @since 1.0.0
 */
import type * as Handler from "@effect/platform/Handler"
import * as Body from "@effect/platform/Http/Body"
import * as Client from "@effect/platform/Http/Client"
import * as ClientRequest from "@effect/platform/Http/ClientRequest"
import type * as RpcReq from "@effect/rpc/Request"
import * as Resolver from "@effect/rpc/Resolver"
import * as ResolverNoStream from "@effect/rpc/ResolverNoStream"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import type * as RequestResolver from "effect/RequestResolver"
import * as Schedule from "effect/Schedule"

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = <R extends Handler.Group.Any>(
  client: Client.Client.Default
): RequestResolver.RequestResolver<
  RpcReq.Request<Handler.Group.Request<R>>,
  Serializable.SerializableWithResult.Context<Handler.Group.Request<R>>
> =>
  ResolverNoStream.make((requests) =>
    client(ClientRequest.post("", {
      body: Body.unsafeJson(requests)
    })).pipe(
      Effect.flatMap((_) => _.json),
      Effect.scoped
    )
  )<R>()

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeClient = <R extends Handler.Group.Any>(
  baseUrl: string
): Serializable.SerializableWithResult.Context<Handler.Group.Request<R>> extends never ? Resolver.Client<
    RequestResolver.RequestResolver<
      RpcReq.Request<Handler.Group.Request<R>>
    >
  >
  : "HttpResolver.makeClientEffect: request context is not `never`" =>
  Resolver.toClient(make<R>(
    Client.fetchOk.pipe(
      Client.mapRequest(ClientRequest.prependUrl(baseUrl)),
      Client.retry(
        Schedule.exponential(50).pipe(
          Schedule.intersect(Schedule.recurs(5))
        )
      )
    )
  ) as any) as any
