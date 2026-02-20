/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Layer from "effect/Layer"
import type { HttpClient } from "./HttpClient.js"
import { layer, layerWithFetch } from "./internal/fetchHttpClient.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class Fetch extends Context.Tag("@effect/platform/FetchHttpClient/Fetch")<Fetch, typeof globalThis.fetch>() {}

/**
 * @since 1.0.0
 * @category tags
 */
export class RequestInit extends Context.Tag("@effect/platform/FetchHttpClient/FetchOptions")<RequestInit, globalThis.RequestInit>() {}

/**
 * @since 1.0.0
 * @category layers
 * Default FetchHttpClient Layer using global fetch.
 *
 * @example
 * import { FetchHttpClient } from "@effect/platform/FetchHttpClient"
 *
 * const defaultLayer = FetchHttpClient.layer
 */
export { layer, layerWithFetch }
