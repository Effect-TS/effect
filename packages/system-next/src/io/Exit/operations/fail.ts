// TODO: implementation
import * as C from "../../Cause"
import type { Exit } from "../definition"
import { failCause } from "./failCause"

export function fail<E>(error: E): Exit<E, never> {
  return failCause(C.fail(error))
}
