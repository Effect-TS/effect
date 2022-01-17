import type { Either } from "../../Either"
import type { Exit } from "../definition"
import { fail } from "./fail"
import { succeed } from "./succeed"

export function fromEither<E, A>(e: Either<E, A>): Exit<E, A> {
  switch (e._tag) {
    case "Left":
      return fail(e.left)
    case "Right":
      return succeed(e.right)
  }
}
