/**
 * @since 1.0.0
 */
import type * as Etag from "@effect/platform/Etag"
import type * as Platform from "@effect/platform/HttpPlatform"
import type * as Server from "@effect/platform/HttpServer"
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
 * @since 1.0.0
 * @category layers
 */
export const layerConfig: (
  options: Config.Config.Wrap<Omit<ServeOptions, "fetch" | "error">>
) => Layer.Layer<
  Server.HttpServer | Platform.HttpPlatform | Etag.Generator | BunContext.BunContext,
  ConfigError.ConfigError
> = internal.layerConfig
