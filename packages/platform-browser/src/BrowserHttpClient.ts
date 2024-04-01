/**
 * @since 1.0.0
 */
import type * as Client from "@effect/platform/Http/Client"
import type { Effect } from "effect/Effect"
import type * as FiberRef from "effect/FiberRef"
import type { LazyArg } from "effect/Function"
import type * as Layer from "effect/Layer"
import * as internal from "./internal/http/client.js"

/**
 * @since 1.0.0
 * @category clients
 */
export const xmlHttpRequest: Client.Client.Default = internal.makeXMLHttpRequest

/**
 * @since 1.0.0
 * @category layers
 */
export const layerXMLHttpRequest: Layer.Layer<Client.Client.Default, never, never> = internal.layerXMLHttpRequest

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentXMLHttpRequest: FiberRef.FiberRef<LazyArg<XMLHttpRequest>> = internal.currentXMLHttpRequest

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentXHRResponseType: FiberRef.FiberRef<"text" | "arraybuffer"> = internal.currentXHRResponseType

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withXHRArrayBuffer: <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R> = internal.withXHRArrayBuffer
