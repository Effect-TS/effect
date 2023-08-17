import * as Context from "@effect/data/Context"
import { dual } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import type * as Scope from "@effect/io/Scope"
import type * as App from "@effect/platform/Http/App"
import type * as Middleware from "@effect/platform/Http/Middleware"
import type * as Server from "@effect/platform/Http/Server"
import type * as Error from "@effect/platform/Http/ServerError"
import type * as ServerRequest from "@effect/platform/Http/ServerRequest"

/** @internal */
export const TypeId: Server.TypeId = Symbol.for("@effect/platform/Http/Server") as Server.TypeId

/** @internal */
export const serverTag = Context.Tag<Server.Server>("@effect/platform/Http/Server")

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
    ) => Effect.Effect<Scope.Scope, Error.ServeError, never>
    readonly address: Server.Address
  }
): Server.Server => Object.assign(Object.create(serverProto), options)

/** @internal */
export const serve = dual<
  {
    (): <R, E>(
      httpApp: App.Default<R, E>
    ) => Effect.Effect<
      Server.Server | Scope.Scope | Exclude<R, ServerRequest.ServerRequest>,
      Error.ServeError,
      never
    >
    <R, E, App extends App.Default<any, any>>(middleware: Middleware.Middleware.Applied<R, E, App>): (
      httpApp: App.Default<R, E>
    ) => Effect.Effect<
      Server.Server | Scope.Scope | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>,
      Error.ServeError,
      never
    >
  },
  {
    <R, E>(
      httpApp: App.Default<R, E>
    ): Effect.Effect<Server.Server | Scope.Scope | Exclude<R, ServerRequest.ServerRequest>, Error.ServeError, never>
    <R, E, App extends App.Default<any, any>>(
      httpApp: App.Default<R, E>,
      middleware: Middleware.Middleware.Applied<R, E, App>
    ): Effect.Effect<
      Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest> | Scope.Scope,
      Error.ServeError,
      never
    >
  }
>(
  (args) => Effect.isEffect(args[0]),
  (<R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<R, E>,
    middleware: Middleware.Middleware.Applied<R, E, App>
  ): Effect.Effect<
    Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest> | Scope.Scope,
    Error.ServeError,
    never
  > =>
    Effect.flatMap(
      serverTag,
      (server) => server.serve(httpApp, middleware)
    )) as any
)
