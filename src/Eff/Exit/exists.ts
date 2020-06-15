import { pipe } from "../../Function"

import { Exit } from "./exit"
import { fold } from "./fold"

/**
 * Returns f(a) if the exit is successful
 */
export const exists = <A>(f: (a: A) => boolean) => <E>(exit: Exit<E, A>): boolean =>
  pipe(
    exit,
    fold(() => false, f)
  )
