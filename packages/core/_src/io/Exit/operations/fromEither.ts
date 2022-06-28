/**
 * @tsplus static effect/core/io/Exit.Ops fromEither
 */
export function fromEither<E, A>(e: Either<E, A>): Exit<E, A> {
  switch (e._tag) {
    case "Left":
      return Exit.fail(e.left)
    case "Right":
      return Exit.succeed(e.right)
  }
}
