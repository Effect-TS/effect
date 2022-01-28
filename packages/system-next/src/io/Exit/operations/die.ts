import { die as dieCause } from "../../Cause/definition"
import type { Exit } from "../definition"
import { failCause } from "./failCause"

export function die(defect: unknown): Exit<never, never> {
  return failCause(dieCause(defect))
}
