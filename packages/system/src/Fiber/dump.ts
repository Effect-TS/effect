// ets_tracing: off

import type { Option } from "../Option/index.js"
import type { FiberID } from "./id.js"
import type { Status } from "./status.js"

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
