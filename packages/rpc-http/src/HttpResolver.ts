/**
 * @since 1.0.0
 */
import * as Body from "@effect/platform/Http/Body"
import * as Client from "@effect/platform/Http/Client"
import * as ClientRequest from "@effect/platform/Http/ClientRequest"
import * as Resolver from "@effect/rpc/Resolver"
import type * as Router from "@effect/rpc/Router"
import type * as Rpc from "@effect/rpc/Rpc"
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
export const makeEffect = <R extends Router.Router<any, any>>(
  client: Client.Client.Default
): RequestResolver.RequestResolver<
  Rpc.Request<Router.Router.Request<R>>,
  Serializable.SerializableWithResult.Context<Router.Router.Request<R>>
> =>
  Resolver.makeEffect((requests) =>
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
export const makeClient = <R extends Router.Router<any, any>>(
  baseUrl: string
): Serializable.SerializableWithResult.Context<Router.Router.Request<R>> extends never ?
  "HttpResolver.makeClient: request context is not `never`"
  : Resolver.Client<
    RequestResolver.RequestResolver<
      Rpc.Request<Router.Router.Request<R>>
    >
  > =>
  Resolver.toClient(make<R>(
    Client.fetchOk().pipe(
      Client.mapRequest(ClientRequest.prependUrl(baseUrl)),
      Client.retry(
        Schedule.exponential(50).pipe(
          Schedule.intersect(Schedule.recurs(5))
        )
      )
    )
  ) as any) as any

/**
 * @category constructors
 * @since 1.0.0
 */
export const makeClientEffect = <R extends Router.Router<any, any>>(
  baseUrl: string
): Serializable.SerializableWithResult.Context<Router.Router.Request<R>> extends never ?
  "HttpResolver.makeClientEffect: request context is not `never`"
  : Resolver.Client<
    RequestResolver.RequestResolver<
      Rpc.Request<Router.Router.Request<R>>
    >
  > =>
  Resolver.toClient(makeEffect<R>(
    Client.fetchOk().pipe(
      Client.mapRequest(ClientRequest.prependUrl(baseUrl)),
      Client.retry(
        Schedule.exponential(50).pipe(
          Schedule.intersect(Schedule.recurs(5))
        )
      )
    )
  ) as any) as any
