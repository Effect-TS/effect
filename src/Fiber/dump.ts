/**
 * tracing: off
 */
import type { Option } from "../Option"
import type { FiberID } from "./id"
import type { Status } from "./status"

export interface FiberDump {
  _tag: "FiberDump"
  fiberId: FiberID
  fiberName: Option<string>
  status: Status
}

export const FiberDump = (
  fiberId: FiberID,
  fiberName: Option<string>,
  status: Status
): FiberDump => ({
  _tag: "FiberDump",
  fiberId,
  fiberName,
  status
})
