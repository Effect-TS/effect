import * as E from "../../Either"

import { Exit } from "./exit"
import { fail } from "./fail"
import { succeed } from "./succeed"

/**
 * Embeds Either's Error & Success in an Exit
 */
export const fromEither = <E, A>(e: E.Either<E, A>): Exit<E, A> =>
  e._tag === "Left" ? fail(e.left) : succeed(e.right)
