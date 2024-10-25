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
      httpApp: App.Default<unknown>,
      middleware?: Middleware.Middleware
    ) => Effect.Effect<void, never, Scope.Scope>
    readonly address: Server.Address
  }
): Server.Server => Object.assign(Object.create(serverProto), options)

/** @internal */
export const serve = dual<
  {
    (): <E, R>(
      httpApp: App.Default<E, R>
    ) => Layer.Layer<never, never, Server.Server | Exclude<R, ServerRequest.ServerRequest | Scope.Scope>>
    <E, R, App extends App.Default<any, any>>(middleware: Middleware.Middleware.Applied<App, E, R>): (
      httpApp: App.Default<E, R>
    ) => Layer.Layer<
      never,
      never,
      Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest | Scope.Scope>
    >
  },
  {
    <E, R>(
      httpApp: App.Default<E, R>
    ): Layer.Layer<never, never, Server.Server | Exclude<R, ServerRequest.ServerRequest | Scope.Scope>>
    <E, R, App extends App.Default<any, any>>(
      httpApp: App.Default<E, R>,
      middleware: Middleware.Middleware.Applied<App, E, R>
    ): Layer.Layer<
      never,
      never,
      Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest | Scope.Scope>
    >
  }
>(
  (args) => Effect.isEffect(args[0]),
  <E, R, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware?: Middleware.Middleware.Applied<App, E, R>
  ): Layer.Layer<
    never,
    never,
    Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest | Scope.Scope>
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
      Server.Server | Scope.Scope | Exclude<R, ServerRequest.ServerRequest>
    >
    <E, R, App extends App.Default<any, any>>(middleware: Middleware.Middleware.Applied<App, E, R>): (
      httpApp: App.Default<E, R>
    ) => Effect.Effect<
      void,
      never,
      Server.Server | Scope.Scope | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest>
    >
  },
  {
    <E, R>(
      httpApp: App.Default<E, R>
    ): Effect.Effect<void, never, Server.Server | Scope.Scope | Exclude<R, ServerRequest.ServerRequest>>
    <E, R, App extends App.Default<any, any>>(
      httpApp: App.Default<E, R>,
      middleware: Middleware.Middleware.Applied<App, E, R>
    ): Effect.Effect<
      void,
      never,
      Server.Server | Exclude<Effect.Effect.Context<App>, ServerRequest.ServerRequest> | Scope.Scope
    >
  }
>(
  (args) => Effect.isEffect(args[0]),
  (<E, R, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware: Middleware.Middleware.Applied<App, E, R>
  ): Effect.Effect<
    void,
    never,
    Server.Server | Exclude<R, ServerRequest.ServerRequest> | Scope.Scope
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
): Effect.Effect<A, E, Server.Server | R> =>
  Effect.flatMap(
    serverTag,
    (server) => effect(server.address)
  )

/** @internal */
export const addressFormattedWith = <A, E, R>(
  effect: (address: string) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, Server.Server | R> =>
  Effect.flatMap(
    serverTag,
    (server) => effect(formatAddress(server.address))
  )

/** @internal */
export const logAddress: Effect.Effect<void, never, Server.Server> = addressFormattedWith((_) =>
  Effect.log(`Listening on ${_}`)
)

/** @internal */
export const withLogAddress = <A, E, R>(
  layer: Layer.Layer<A, E, R>
): Layer.Layer<A, E, R | Exclude<Server.Server, A>> =>
  Layer.effectDiscard(logAddress).pipe(
    Layer.provideMerge(layer)
  )
