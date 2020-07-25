import { never as effectNever } from "../Effect/never"

import { Schedule } from "./schedule"

/**
 * A schedule that waits forever when updating or initializing.
 */
export const never = new Schedule(
  effectNever,
  () => effectNever,
  (_, n) => n
)
