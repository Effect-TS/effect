/**
 * @since 1.0.0
 */
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as Layer from "effect/Layer"
import type { EventLog } from "../EventLog.js"
import * as EventLogEncryption from "../EventLogEncryption.js"
import * as EventLogRemote from "../EventLogRemote.js"

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (
  url: string
): Layer.Layer<never, never, EventLog> =>
  EventLogRemote.layerWebSocket(url).pipe(
    Layer.provide([EventLogEncryption.layerSubtle, NodeSocket.layerWebSocketConstructor])
  )
