import { fail as fail_ } from "../../Effect/fail"
import type { IO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that always fails with the error
 */
export const fail = <E>(e: E): IO<E, never> => fromEffect(fail_(e))
