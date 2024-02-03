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
export const serverTag = Context.GenericTag<Server.Server>("@effect/platform/Http/Server")

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
export const addressWith = <R, E, A>(
  effect: (address: Server.Address) => Effect.Effect<R, E, A>
): Effect.Effect<Server.Server | R, E, A> =>
  Effect.flatMap(
    serverTag,
    (server) => effect(server.address)
  )

/** @internal */
export const addressFormattedWith = <R, E, A>(
  effect: (address: string) => Effect.Effect<R, E, A>
): Effect.Effect<Server.Server | R, E, A> =>
  Effect.flatMap(
    serverTag,
    (server) => effect(formatAddress(server.address))
  )

/** @internal */
export const logAddress: Effect.Effect<Server.Server, never, void> = addressFormattedWith((_) =>
  Effect.log(`Listening on ${_}`)
)

/** @internal */
export const withLogAddress = <R, E, A>(
  layer: Layer.Layer<R, E, A>
): Layer.Layer<R | Exclude<Server.Server, A>, E, A> =>
  Layer.effectDiscard(logAddress).pipe(
    Layer.provideMerge(layer)
  )
