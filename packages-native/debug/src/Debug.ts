/**
 * Public Debug service exports.
 *
 * @category Debug
 * @since 0.0.0
 */
import type * as Socket from "@effect/platform/Socket"
import type * as Layer from "effect/Layer"
import type { Service, Transport } from "./DebugModel.js"
import { layer } from "./internal/Cdp.js"

/**
 * Re-export Debug service types and errors.
 *
 * @category Debug
 * @since 0.0.0
 */
export * from "./DebugModel.js"

/**
 * Live CDP layer implementation.
 * Provides both the Debug service and CurrentTransport context.
 *
 * @category Layer
 * @since 0.0.0
 */
export const layerCdp: Layer.Layer<Service | Transport, never, Socket.WebSocketConstructor> = layer
