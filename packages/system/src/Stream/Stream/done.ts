import { done as _ } from "../../Effect"
import type { Exit } from "../../Exit"
import type { IO } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that ends with the `Exit` value `exit`.
 */
export const done = <E, A>(exit: Exit<E, A>): IO<E, A> => fromEffect(_(exit))
