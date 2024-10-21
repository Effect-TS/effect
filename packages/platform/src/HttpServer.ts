/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type { Generator } from "./Etag.js"
import type { FileSystem } from "./FileSystem.js"
import type * as App from "./HttpApp.js"
import type * as Client from "./HttpClient.js"
import type * as Middleware from "./HttpMiddleware.js"
import type { HttpPlatform } from "./HttpPlatform.js"
import type * as ServerRequest from "./HttpServerRequest.js"
import * as internal from "./internal/httpServer.js"
import type { Path } from "./Path.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpServer {
  readonly [TypeId]: TypeId
  readonly serve: {
    <E, R>(httpApp: App.Default<E, R>): Effect.Effect<
      void,
      never,
      Exclude<R, ServerRequest.HttpServerRequest> | Scope.Scope
    >
    <E, R, App extends App.Default<any, any>>(
      httpApp: App.Default<E, R>,
      middleware: Middleware.HttpMiddleware.Applied<App, E, R>
    ): Effect.Effect<
      void,
      never,
      Exclude<R, ServerRequest.HttpServerRequest> | Scope.Scope
    >
  }
  readonly address: Address
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ServeOptions {
  readonly respond: boolean
}

/**
 * @since 1.0.0
 * @category address
 */
export type Address = UnixAddress | TcpAddress

/**
 * @since 1.0.0
 * @category address
 */
export interface TcpAddress {
  readonly _tag: "TcpAddress"
  readonly hostname: string
  readonly port: number
}

/**
 * @since 1.0.0
 * @category address
 */
export interface UnixAddress {
  readonly _tag: "UnixAddress"
  readonly path: string
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const HttpServer: Context.Tag<HttpServer, HttpServer> = internal.serverTag

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  options: {
    readonly serve: (
      httpApp: App.Default<unknown>,
      middleware?: Middleware.HttpMiddleware
    ) => Effect.Effect<void, never, Scope.Scope>
    readonly address: Address
  }
) => HttpServer = internal.make

/**
 * @since 1.0.0
 * @category accessors
 */
export const serve: {
  (): <E, R>(
    httpApp: App.Default<E, R>
  ) => Layer.Layer<never, never, HttpServer | Exclude<R, ServerRequest.HttpServerRequest | Scope.Scope>>
  <E, R, App extends App.Default<any, any>>(
    middleware: Middleware.HttpMiddleware.Applied<App, E, R>
  ): (
    httpApp: App.Default<E, R>
  ) => Layer.Layer<
    never,
    never,
    HttpServer | Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest | Scope.Scope>
  >
  <E, R>(
    httpApp: App.Default<E, R>
  ): Layer.Layer<never, never, HttpServer | Exclude<R, ServerRequest.HttpServerRequest | Scope.Scope>>
  <E, R, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware: Middleware.HttpMiddleware.Applied<App, E, R>
  ): Layer.Layer<
    never,
    never,
    HttpServer | Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest | Scope.Scope>
  >
} = internal.serve

/**
 * @since 1.0.0
 * @category accessors
 */
export const serveEffect: {
  (): <E, R>(
    httpApp: App.Default<E, R>
  ) => Effect.Effect<void, never, Scope.Scope | HttpServer | Exclude<R, ServerRequest.HttpServerRequest>>
  <E, R, App extends App.Default<any, any>>(
    middleware: Middleware.HttpMiddleware.Applied<App, E, R>
  ): (
    httpApp: App.Default<E, R>
  ) => Effect.Effect<
    void,
    never,
    Scope.Scope | HttpServer | Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest>
  >
  <E, R>(
    httpApp: App.Default<E, R>
  ): Effect.Effect<void, never, Scope.Scope | HttpServer | Exclude<R, ServerRequest.HttpServerRequest>>
  <E, R, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware: Middleware.HttpMiddleware.Applied<App, E, R>
  ): Effect.Effect<
    void,
    never,
    Scope.Scope | HttpServer | Exclude<Effect.Effect.Context<App>, ServerRequest.HttpServerRequest>
  >
} = internal.serveEffect

/**
 * @since 1.0.0
 * @category address
 */
export const formatAddress: (address: Address) => string = internal.formatAddress

/**
 * @since 1.0.0
 * @category address
 */
export const addressWith: <A, E, R>(
  effect: (address: Address) => Effect.Effect<A, E, R>
) => Effect.Effect<A, E, HttpServer | R> = internal.addressWith

/**
 * @since 1.0.0
 * @category address
 */
export const addressFormattedWith: <A, E, R>(
  effect: (address: string) => Effect.Effect<A, E, R>
) => Effect.Effect<A, E, HttpServer | R> = internal.addressFormattedWith

/**
 * @since 1.0.0
 * @category address
 */
export const logAddress: Effect.Effect<void, never, HttpServer> = internal.logAddress

/**
 * @since 1.0.0
 * @category address
 */
export const withLogAddress: <A, E, R>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R | Exclude<HttpServer, A>> =
  internal.withLogAddress

/**
 * Layer producing an `HttpClient` with prepended url of the running http server.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerTestClient: Layer.Layer<Client.HttpClient, never, Client.HttpClient | HttpServer> =
  internal.layerTestClient

/**
 * A Layer providing the `HttpPlatform`, `FileSystem`, `Etag.Generator`, and `Path`
 * services.
 *
 * The `FileSystem` service is a no-op implementation, so this layer is only
 * useful for platforms that have no file system.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerContext: Layer.Layer<
  | HttpPlatform
  | FileSystem
  | Generator
  | Path
> = internal.layerContext
