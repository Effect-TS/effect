import { suspend as suspendEffect } from "../../Effect/core"
import { Managed } from "../managed"

export function suspend<R, E, A>(f: () => Managed<R, E, A>) {
  return new Managed(suspendEffect(() => f().effect))
}
