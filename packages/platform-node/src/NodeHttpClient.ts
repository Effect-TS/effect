/**
 * @since 1.0.0
 */
import type * as Client from "@effect/platform/HttpClient"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as FiberRef from "effect/FiberRef"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as Http from "node:http"
import type * as Https from "node:https"
import type * as Undici from "undici"
import * as internal from "./internal/httpClient.js"
import * as internalUndici from "./internal/httpClientUndici.js"

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
export const makeAgentLayer: (options?: Https.AgentOptions) => Layer.Layer<HttpAgent> = internal.makeAgentLayer

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<Client.HttpClient.Default, never, HttpAgent> = internal.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Client.HttpClient.Default> = internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithoutAgent: Layer.Layer<Client.HttpClient.Default, never, HttpAgent> = internal.layerWithoutAgent

/**
 * @since 1.0.0
 * @category undici
 */
export interface Dispatcher {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category undici
 */
export const Dispatcher: Context.Tag<Dispatcher, Undici.Dispatcher> = internalUndici.Dispatcher

/**
 * @since 1.0.0
 * @category undici
 */
export const makeDispatcher: Effect.Effect<Undici.Dispatcher, never, Scope.Scope> = internalUndici.makeDispatcher

/**
 * @since 1.0.0
 * @category undici
 */
export const dispatcherLayer: Layer.Layer<Dispatcher> = internalUndici.dispatcherLayer

/**
 * @since 1.0.0
 * @category undici
 */
export const dispatcherLayerGlobal: Layer.Layer<Dispatcher> = internalUndici.dispatcherLayerGlobal

/**
 * @since 1.0.0
 * @category undici
 */
export const currentUndiciOptions: FiberRef.FiberRef<Partial<Undici.Dispatcher.RequestOptions>> =
  internalUndici.currentUndiciOptions

/**
 * @since 1.0.0
 * @category undici
 */
export const withUndiciOptions: {
  (
    options: Partial<Undici.Dispatcher.RequestOptions>
  ): <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <R, E, A>(effect: Effect.Effect<A, E, R>, options: Partial<Undici.Dispatcher.RequestOptions>): Effect.Effect<A, E, R>
} = internalUndici.withUndiciOptions

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeUndici: (dispatcher: Undici.Dispatcher) => Client.HttpClient.Default = internalUndici.make

/**
 * @since 1.0.0
 * @category layers
 */
export const layerUndici: Layer.Layer<Client.HttpClient.Default> = internalUndici.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerUndiciWithoutDispatcher: Layer.Layer<Client.HttpClient.Default, never, Dispatcher> =
  internalUndici.layerWithoutDispatcher
