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
    <R, E>(httpApp: App.Default<R, E>): Effect.Effect<
      Exclude<R, ServerRequest.ServerRequest> | Scope.Scope,
      never,
      void
    >
    <R, E, App extends App.Default<any, any>>(
      httpApp: App.Default<R, E>,
      middleware: Middleware.Middleware.Applied<R, E, App>
    ): Effect.Effect<
      Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest> | Scope.Scope,
      never,
      void
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
 * @category models
 */
export type Address = UnixAddress | TcpAddress

/**
 * @since 1.0.0
 * @category models
 */
export interface TcpAddress {
  readonly _tag: "TcpAddress"
  readonly hostname: string
  readonly port: number
}

/**
 * @since 1.0.0
 * @category models
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
      httpApp: App.Default<never, unknown>,
      middleware?: Middleware.Middleware
    ) => Effect.Effect<Scope.Scope, never, void>
    readonly address: Address
  }
) => Server = internal.make

/**
 * @since 1.0.0
 * @category accessors
 */
export const serve: {
  (): <R, E>(httpApp: App.Default<R, E>) => Layer.Layer<Server | Exclude<R, ServerRequest.ServerRequest>, never, never>
  <R, E, App extends App.Default<any, any>>(
    middleware: Middleware.Middleware.Applied<R, E, App>
  ): (
    httpApp: App.Default<R, E>
  ) => Layer.Layer<Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>, never, never>
  <R, E>(httpApp: App.Default<R, E>): Layer.Layer<Server | Exclude<R, ServerRequest.ServerRequest>, never, never>
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<R, E>,
    middleware: Middleware.Middleware.Applied<R, E, App>
  ): Layer.Layer<Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>, never, never>
} = internal.serve

/**
 * @since 1.0.0
 * @category accessors
 */
export const serveEffect: {
  (): <R, E>(
    httpApp: App.Default<R, E>
  ) => Effect.Effect<Scope.Scope | Server | Exclude<R, ServerRequest.ServerRequest>, never, void>
  <R, E, App extends App.Default<any, any>>(
    middleware: Middleware.Middleware.Applied<R, E, App>
  ): (
    httpApp: App.Default<R, E>
  ) => Effect.Effect<
    Scope.Scope | Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>,
    never,
    void
  >
  <R, E>(
    httpApp: App.Default<R, E>
  ): Effect.Effect<Scope.Scope | Server | Exclude<R, ServerRequest.ServerRequest>, never, void>
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<R, E>,
    middleware: Middleware.Middleware.Applied<R, E, App>
  ): Effect.Effect<Scope.Scope | Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>, never, void>
} = internal.serveEffect
