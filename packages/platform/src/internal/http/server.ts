import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as App from "../../Http/App.js"
import type * as Middleware from "../../Http/Middleware.js"
import type * as Server from "../../Http/Server.js"
import type * as ServerRequest from "../../Http/ServerRequest.js"

/** @internal */
export const TypeId: Server.TypeId = Symbol.for("@effect/platform/Http/Server") as Server.TypeId

/** @internal */
export const serverTag = Context.Tag<Server.Server>(TypeId)

const serverProto = {
  [TypeId]: TypeId
}

/** @internal */
export const isServer = (u: unknown): u is Server.Server => typeof u === "object" && u !== null && TypeId in u

/** @internal */
export const make = (
  options: {
    readonly serve: (
      httpApp: App.Default<never, unknown>,
      middleware?: Middleware.Middleware
    ) => Effect.Effect<Scope.Scope, never, void>
    readonly address: Server.Address
  }
): Server.Server => Object.assign(Object.create(serverProto), options)

/** @internal */
export const serve = dual<
  {
    (): <R, E>(
      httpApp: App.Default<R, E>
    ) => Layer.Layer<
      Server.Server | Exclude<R, ServerRequest.ServerRequest | Scope.Scope>,
      never,
      never
    >
    <R, E, App extends App.Default<any, any>>(middleware: Middleware.Middleware.Applied<R, E, App>): (
      httpApp: App.Default<R, E>
    ) => Layer.Layer<
      Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest | Scope.Scope>,
      never,
      never
    >
  },
  {
    <R, E>(
      httpApp: App.Default<R, E>
    ): Layer.Layer<Server.Server | Exclude<R, ServerRequest.ServerRequest | Scope.Scope>, never, never>
    <R, E, App extends App.Default<any, any>>(
      httpApp: App.Default<R, E>,
      middleware: Middleware.Middleware.Applied<R, E, App>
    ): Layer.Layer<
      Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest | Scope.Scope>,
      never,
      never
    >
  }
>(
  (args) => Effect.isEffect(args[0]),
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<R, E>,
    middleware?: Middleware.Middleware.Applied<R, E, App>
  ): Layer.Layer<
    Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest | Scope.Scope>,
    never,
    never
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
    (): <R, E>(
      httpApp: App.Default<R, E>
    ) => Effect.Effect<
      Server.Server | Scope.Scope | Exclude<R, ServerRequest.ServerRequest>,
      never,
      void
    >
    <R, E, App extends App.Default<any, any>>(middleware: Middleware.Middleware.Applied<R, E, App>): (
      httpApp: App.Default<R, E>
    ) => Effect.Effect<
      Server.Server | Scope.Scope | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>,
      never,
      void
    >
  },
  {
    <R, E>(
      httpApp: App.Default<R, E>
    ): Effect.Effect<Server.Server | Scope.Scope | Exclude<R, ServerRequest.ServerRequest>, never, void>
    <R, E, App extends App.Default<any, any>>(
      httpApp: App.Default<R, E>,
      middleware: Middleware.Middleware.Applied<R, E, App>
    ): Effect.Effect<
      Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest> | Scope.Scope,
      never,
      void
    >
  }
>(
  (args) => Effect.isEffect(args[0]),
  (<R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<R, E>,
    middleware: Middleware.Middleware.Applied<R, E, App>
  ): Effect.Effect<
    Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest> | Scope.Scope,
    never,
    void
  > =>
    Effect.flatMap(
      serverTag,
      (server) => server.serve(httpApp, middleware)
    )) as any
)
