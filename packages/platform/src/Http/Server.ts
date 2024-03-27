/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as internal from "../internal/http/server.js"
import type * as App from "./App.js"
import type * as Middleware from "./Middleware.js"
import type * as ServerRequest from "./ServerRequest.js"

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
export interface Server {
  readonly [TypeId]: TypeId
  readonly serve: {
    <R, E>(httpApp: App.Default<E, R>): Effect.Effect<
      void,
      never,
      Exclude<R, ServerRequest.ServerRequest> | Scope.Scope
    >
    <R, E, App extends App.Default<any, any>>(
      httpApp: App.Default<E, R>,
      middleware: Middleware.Middleware.Applied<App, E, R>
    ): Effect.Effect<
      void,
      never,
      Exclude<R, ServerRequest.ServerRequest> | Scope.Scope
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
export const Server: Context.Tag<Server, Server> = internal.serverTag

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  options: {
    readonly serve: (
      httpApp: App.Default<unknown>,
      middleware?: Middleware.Middleware
    ) => Effect.Effect<void, never, Scope.Scope>
    readonly address: Address
  }
) => Server = internal.make

/**
 * @since 1.0.0
 * @category accessors
 */
export const serve: {
  (): <R, E>(
    httpApp: App.Default<E, R>
  ) => Layer.Layer<never, never, Server | Exclude<R, ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, App extends App.Default<any, any>>(
    middleware: Middleware.Middleware.Applied<App, E, R>
  ): (
    httpApp: App.Default<E, R>
  ) => Layer.Layer<
    never,
    never,
    Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest | Scope.Scope>
  >
  <R, E>(
    httpApp: App.Default<E, R>
  ): Layer.Layer<never, never, Server | Exclude<R, ServerRequest.ServerRequest | Scope.Scope>>
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware: Middleware.Middleware.Applied<App, E, R>
  ): Layer.Layer<never, never, Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest | Scope.Scope>>
} = internal.serve

/**
 * @since 1.0.0
 * @category accessors
 */
export const serveEffect: {
  (): <R, E>(
    httpApp: App.Default<E, R>
  ) => Effect.Effect<void, never, Scope.Scope | Server | Exclude<R, ServerRequest.ServerRequest>>
  <R, E, App extends App.Default<any, any>>(
    middleware: Middleware.Middleware.Applied<App, E, R>
  ): (
    httpApp: App.Default<E, R>
  ) => Effect.Effect<
    void,
    never,
    Scope.Scope | Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>
  >
  <R, E>(
    httpApp: App.Default<E, R>
  ): Effect.Effect<void, never, Scope.Scope | Server | Exclude<R, ServerRequest.ServerRequest>>
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware: Middleware.Middleware.Applied<App, E, R>
  ): Effect.Effect<void, never, Scope.Scope | Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>>
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
export const addressWith: <R, E, A>(
  effect: (address: Address) => Effect.Effect<A, E, R>
) => Effect.Effect<A, E, Server | R> = internal.addressWith

/**
 * @since 1.0.0
 * @category address
 */
export const addressFormattedWith: <R, E, A>(
  effect: (address: string) => Effect.Effect<A, E, R>
) => Effect.Effect<A, E, Server | R> = internal.addressFormattedWith

/**
 * @since 1.0.0
 * @category address
 */
export const logAddress: Effect.Effect<void, never, Server> = internal.logAddress

/**
 * @since 1.0.0
 * @category address
 */
export const withLogAddress: <R, E, A>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R | Exclude<Server, A>> =
  internal.withLogAddress
