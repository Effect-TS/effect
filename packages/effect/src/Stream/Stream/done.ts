import { done as _ } from "../../Effect"
import type { Exit } from "../../Exit"
import type { SyncE } from "./definitions"
import { fromEffect } from "./fromEffect"

export const done = <E, A>(exit: Exit<E, A>): SyncE<E, A> => fromEffect(_(exit))
