/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Layer from "effect/Layer"
import type { HttpClient } from "./HttpClient.js"
import * as internal from "./internal/fetchHttpClient.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class Fetch extends Context.Tag(internal.fetchTagKey)<Fetch, typeof globalThis.fetch>() {}

/**
 * @since 1.0.0
 * @category tags
 */
export class RequestInit extends Context.Tag(internal.requestInitTagKey)<RequestInit, globalThis.RequestInit>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<HttpClient> = internal.layer
