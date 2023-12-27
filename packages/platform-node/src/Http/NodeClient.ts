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
import * as internal from "../internal/http/nodeClient.js"

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
export const makeAgent: (options?: Https.AgentOptions) => Effect.Effect<Scope.Scope, never, HttpAgent> =
  internal.makeAgent

/**
 * @since 1.0.0
 * @category agent
 */
export const agentLayer: Layer.Layer<never, never, HttpAgent> = internal.agentLayer

/**
 * @since 1.0.0
 * @category agent
 */
export const makeAgentLayer: (options?: Https.AgentOptions) => Layer.Layer<never, never, HttpAgent> =
  internal.makeAgentLayer

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<HttpAgent, never, Client.Client.Default> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<never, never, Client.Client.Default> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithoutAgent: Layer.Layer<HttpAgent, never, Client.Client.Default> = internal.layerWithoutAgent
