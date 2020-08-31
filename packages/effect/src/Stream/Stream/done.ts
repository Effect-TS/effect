import { done as _ } from "../../Effect"
import type { Exit } from "../../Exit"
import type { SyncE } from "./definitions"
import { fromEffect } from "./fromEffect"

/**
 * The stream that ends with the {@link Exit} value `exit`.
 */
export const done = <E, A>(exit: Exit<E, A>): SyncE<E, A> => fromEffect(_(exit))
