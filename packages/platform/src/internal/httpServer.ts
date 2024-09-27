import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as App from "../HttpApp.js"
import * as Client from "../HttpClient.js"
import * as ClientRequest from "../HttpClientRequest.js"
import type * as Middleware from "../HttpMiddleware.js"
import type * as Server from "../HttpServer.js"
import type * as ServerRequest from "../HttpServerRequest.js"
import * as internalEtag from "./etag.js"
import * as internalFileSystem from "./fileSystem.js"
import * as internalPlatform from "./httpPlatform.js"
import * as internalPath from "./path.js"

/** @internal */
export const TypeId: Server.TypeId = Symbol.for("@effect/platform/HttpServer") as Server.TypeId

/** @internal */
export const serverTag = Context.GenericTag<Server.HttpServer>("@effect/platform/HttpServer")

const serverProto = {
  [TypeId]: TypeId
}

/** @internal */
export const isServer = (u: unknown): u is Server.HttpServer => typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const make = (
  options: {
    readonly serve: (
      httpApp: App.Default<unknown>,
      middleware?: Middleware.HttpMiddleware
    ) => Effect.Effect<void, never, Scope.Scope>
    readonly address: Server.Address
  }
): Server.HttpServer => Object.assign(Object.create(serverProto), options)

/** @internal */
export const serve = dual<
  {
    (): <E, R>(
      httpApp: App.Default<E, R>
    ) => Layer.Layer<never, never, Server.HttpServer | Exclude<R, ServerRequest.HttpServerRequest | Scope.Scope>>
    <E, R, App extends App.Default<any, any>>(middleware: Middleware.HttpMiddleware.Applied<App, E, R>): (
      httpApp: App.Default<E, R>
    ) => Layer.Layer<
      never,
      never,
      Server.HttpServer | Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest | Scope.Scope>
    >
  },
  {
    <E, R>(
      httpApp: App.Default<E, R>
    ): Layer.Layer<never, never, Server.HttpServer | Exclude<R, ServerRequest.HttpServerRequest | Scope.Scope>>
    <E, R, App extends App.Default<any, any>>(
      httpApp: App.Default<E, R>,
      middleware: Middleware.HttpMiddleware.Applied<App, E, R>
    ): Layer.Layer<
      never,
      never,
      Server.HttpServer | Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest | Scope.Scope>
    >
  }
>(
  (args) => Effect.isEffect(args[0]),
  <E, R, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware?: Middleware.HttpMiddleware.Applied<App, E, R>
  ): Layer.Layer<
    never,
    never,
    Server.HttpServer | Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest | Scope.Scope>
  > =>
    Layer.scopedDiscard(
      Effect.flatMap(
        serverTag,
        (server) => server.serve(httpApp, middleware!)
      )
    ) as any
)

/** @internal */
export const serveEffect = dual<
  {
    (): <E, R>(
      httpApp: App.Default<E, R>
    ) => Effect.Effect<
      void,
      never,
      Server.HttpServer | Scope.Scope | Exclude<R, ServerRequest.HttpServerRequest>
    >
    <E, R, App extends App.Default<any, any>>(middleware: Middleware.HttpMiddleware.Applied<App, E, R>): (
      httpApp: App.Default<E, R>
    ) => Effect.Effect<
      void,
      never,
      Server.HttpServer | Scope.Scope | Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest>
    >
  },
  {
    <E, R>(
      httpApp: App.Default<E, R>
    ): Effect.Effect<void, never, Server.HttpServer | Scope.Scope | Exclude<R, ServerRequest.HttpServerRequest>>
    <E, R, App extends App.Default<any, any>>(
      httpApp: App.Default<E, R>,
      middleware: Middleware.HttpMiddleware.Applied<App, E, R>
    ): Effect.Effect<
      void,
      never,
      Server.HttpServer | Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest> | Scope.Scope
    >
  }
>(
  (args) => Effect.isEffect(args[0]),
  (<E, R, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware: Middleware.HttpMiddleware.Applied<App, E, R>
  ): Effect.Effect<
    void,
    never,
    Server.HttpServer | Exclude<R, ServerRequest.HttpServerRequest> | Scope.Scope
  > =>
    Effect.flatMap(
      serverTag,
      (server) => server.serve(httpApp, middleware)
    )) as any
)

/** @internal */
export const formatAddress = (address: Server.Address): string => {
  switch (address._tag) {
    case "UnixAddress":
      return `unix://${address.path}`
    case "TcpAddress":
      return `http://${address.hostname}:${address.port}`
  }
}

/** @internal */
export const addressWith = <A, E, R>(
  effect: (address: Server.Address) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, Server.HttpServer | R> =>
  Effect.flatMap(
    serverTag,
    (server) => effect(server.address)
  )

/** @internal */
export const addressFormattedWith = <A, E, R>(
  effect: (address: string) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, Server.HttpServer | R> =>
  Effect.flatMap(
    serverTag,
    (server) => effect(formatAddress(server.address))
  )

/** @internal */
export const logAddress: Effect.Effect<void, never, Server.HttpServer> = addressFormattedWith((_) =>
  Effect.log(`Listening on ${_}`)
)

/** @internal */
export const withLogAddress = <A, E, R>(
  layer: Layer.Layer<A, E, R>
): Layer.Layer<A, E, R | Exclude<Server.HttpServer, A>> =>
  Layer.effectDiscard(logAddress).pipe(
    Layer.provideMerge(layer)
  )

/** @internal */
export const makeTestClient = addressWith((address) =>
  Effect.flatMap(Client.HttpClient, (client) => {
    if (address._tag === "UnixAddress") {
      return Effect.die(new Error("HttpServer.layerTestClient: UnixAddress not supported"))
    }
    const host = address.hostname === "0.0.0.0" ? "127.0.0.1" : address.hostname
    const url = `http://${host}:${address.port}`
    return Effect.succeed(Client.mapRequest(client, ClientRequest.prependUrl(url)))
  })
)

/** @internal */
export const layerTestClient = Layer.effect(Client.HttpClient, makeTestClient)

/** @internal */
export const layerContext = Layer.mergeAll(
  internalPlatform.layer,
  internalPath.layer,
  internalEtag.layerWeak
).pipe(
  Layer.provideMerge(internalFileSystem.layerNoop({}))
)
