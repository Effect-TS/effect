/**
 * @since 1.0.0
 */
import type * as Client from "@effect/platform/Http/Client"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as Http from "node:http"
import type * as Https from "node:https"
import * as internal from "./internal/http/client.js"

/**
 * @since 1.0.0
 * @category agent
 */
export const HttpAgentTypeId: unique symbol = internal.HttpAgentTypeId

/**
 * @since 1.0.0
 * @category agent
 */
export type HttpAgentTypeId = typeof HttpAgentTypeId

/**
 * @since 1.0.0
 * @category agent
 */
export interface HttpAgent {
  readonly [HttpAgentTypeId]: typeof HttpAgentTypeId
  readonly http: Http.Agent
  readonly https: Https.Agent
}

/**
 * @since 1.0.0
 * @category agent
 */
export const HttpAgent: Context.Tag<HttpAgent, HttpAgent> = internal.HttpAgent

/**
 * @since 1.0.0
 * @category agent
 */
export const makeAgent: (options?: Https.AgentOptions) => Effect.Effect<HttpAgent, never, Scope.Scope> =
  internal.makeAgent

/**
 * @since 1.0.0
 * @category agent
 */
export const agentLayer: Layer.Layer<HttpAgent> = internal.agentLayer

/**
 * @since 1.0.0
 * @category agent
 */
export const makeAgentLayer: (options?: Https.AgentOptions) => Layer.Layer<HttpAgent> =
  internal.makeAgentLayer

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<Client.Client.Default, never, HttpAgent> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Client.Client.Default> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithoutAgent: Layer.Layer<Client.Client.Default, never, HttpAgent> = internal.layerWithoutAgent
