import { fail as fail_ } from "../../Effect/fail"
import type { SyncE } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that always fails with the error
 */
export const fail = <E>(e: E): SyncE<E, never> => fromEffect(fail_(e))
