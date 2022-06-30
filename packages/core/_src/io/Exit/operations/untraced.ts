/**
 * Returns an untraced `Exit` value.
 *
 * @tsplus getter effect/core/io/Exit untraced
 */
export function untraced<E, A>(self: Exit<E, A>): Exit<E, A> {
  return self.mapErrorCause((cause) => cause.untraced)
}
