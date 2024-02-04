/**
 * @since 1.0.0
 */
import type * as Etag from "@effect/platform/Http/Etag"
import type * as Platform from "@effect/platform/Http/Platform"
import type * as Server from "@effect/platform/Http/Server"
import type { ServeOptions } from "bun"
import type * as Config from "effect/Config"
import type * as ConfigError from "effect/ConfigError"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as BunContext from "../BunContext.js"
import * as internal from "../internal/http/server.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  options: Omit<ServeOptions, "fetch" | "error">
) => Effect.Effect<Server.Server, never, Scope.Scope> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layerServer: (options: Omit<ServeOptions, "fetch" | "error">) => Layer.Layer<never, never, Server.Server> =
  internal.layerServer

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (
  options: Omit<ServeOptions, "fetch" | "error">
) => Layer.Layer<never, never, Server.Server | Platform.Platform | Etag.Generator | BunContext.BunContext> =
  internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig: (
  options: Config.Config.Wrap<Omit<ServeOptions, "fetch" | "error">>
) => Layer.Layer<
  never,
  ConfigError.ConfigError,
  Server.Server | Platform.Platform | Etag.Generator | BunContext.BunContext
> = internal.layerConfig
