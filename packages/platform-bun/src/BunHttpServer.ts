/**
 * @since 1.0.0
 */
import type * as Etag from "@effect/platform/Etag"
import type * as HttpClient from "@effect/platform/HttpClient"
import type * as Platform from "@effect/platform/HttpPlatform"
import type * as Server from "@effect/platform/HttpServer"
import type * as HttpServerError from "@effect/platform/HttpServerError"
import type { ServeOptions } from "bun"
import type * as Config from "effect/Config"
import type * as ConfigError from "effect/ConfigError"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as BunContext from "./BunContext.js"
import * as internal from "./internal/httpServer.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  options: Omit<ServeOptions, "fetch" | "error">
) => Effect.Effect<Server.HttpServer, never, Scope.Scope> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layerServer: (options: Omit<ServeOptions, "fetch" | "error">) => Layer.Layer<Server.HttpServer> =
  internal.layerServer

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (
  options: Omit<ServeOptions, "fetch" | "error">
) => Layer.Layer<Server.HttpServer | Platform.HttpPlatform | Etag.Generator | BunContext.BunContext> = internal.layer

/**
 * Layer starting a server on a random port and producing an `HttpClient`
 * with prepended url of the running http server.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerTest: Layer.Layer<
  | HttpClient.HttpClient
  | Server.HttpServer
  | Platform.HttpPlatform
  | Etag.Generator
  | BunContext.BunContext,
  HttpServerError.ServeError
> = internal.layerTest

/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig: (
  options: Config.Config.Wrap<Omit<ServeOptions, "fetch" | "error">>
) => Layer.Layer<
  Server.HttpServer | Platform.HttpPlatform | Etag.Generator | BunContext.BunContext,
  ConfigError.ConfigError
> = internal.layerConfig
