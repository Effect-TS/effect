import type { Either } from "../../../data/Either"
import { Exit } from "../definition"

/**
 * @tsplus static ets/ExitOps fromEither
 */
export function fromEither<E, A>(e: Either<E, A>): Exit<E, A> {
  switch (e._tag) {
    case "Left":
      return Exit.fail(e.left)
    case "Right":
      return Exit.succeed(e.right)
  }
}
