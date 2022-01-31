import { Cause } from "../../Cause"
import type { Exit } from "../definition"
import { failCause } from "./failCause"

export function die(defect: unknown): Exit<never, never> {
  return failCause(Cause.die(defect))
}
