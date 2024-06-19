/**
 * @since 1.0.0
 */
import type * as Etag from "@effect/platform/Etag"
import type * as App from "@effect/platform/HttpApp"
import type * as Middleware from "@effect/platform/HttpMiddleware"
import type * as Platform from "@effect/platform/HttpPlatform"
import type * as Server from "@effect/platform/HttpServer"
import type { ServeError } from "@effect/platform/HttpServerError"
import type * as ServerRequest from "@effect/platform/HttpServerRequest"
import type * as Config from "effect/Config"
import type * as ConfigError from "effect/ConfigError"
import type * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as Http from "node:http"
import type * as Net from "node:net"
import * as internal from "./internal/httpServer.js"
import type * as NodeContext from "./NodeContext.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  evaluate: LazyArg<Http.Server<typeof Http.IncomingMessage, typeof Http.ServerResponse>>,
  options: Net.ListenOptions
) => Effect.Effect<
  Server.HttpServer,
  ServeError,
  Scope.Scope
> = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeHandler: {
  <R, E>(
    httpApp: App.Default<E, R>
  ): Effect.Effect<
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse<Http.IncomingMessage>) => void,
    never,
    Exclude<R, Scope.Scope | ServerRequest.HttpServerRequest>
  >
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<E, R>,
    middleware: Middleware.HttpMiddleware.Applied<App, E, R>
  ): Effect.Effect<
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse<Http.IncomingMessage>) => void,
    never,
    Exclude<Effect.Effect.Context<App>, Scope.Scope | ServerRequest.HttpServerRequest>
  >
} = internal.makeHandler

/**
 * @since 1.0.0
 * @category layers
 */
export const layerServer: (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) => Layer.Layer<Server.HttpServer, ServeError> = internal.layerServer

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (
  evaluate: LazyArg<Http.Server<typeof Http.IncomingMessage, typeof Http.ServerResponse>>,
  options: Net.ListenOptions
) => Layer.Layer<Platform.HttpPlatform | Etag.Generator | NodeContext.NodeContext | Server.HttpServer, ServeError> =
  internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig: (
  evaluate: LazyArg<Http.Server<typeof Http.IncomingMessage, typeof Http.ServerResponse>>,
  options: Config.Config.Wrap<Net.ListenOptions>
) => Layer.Layer<
  Platform.HttpPlatform | Etag.Generator | NodeContext.NodeContext | Server.HttpServer,
  ConfigError.ConfigError | ServeError
> = internal.layerConfig
