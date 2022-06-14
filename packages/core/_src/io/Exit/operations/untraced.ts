/**
 * Returns an untraced `Exit` value.
 *
 * @tsplus getter ets/Exit untraced
 */
export function untraced<E, A>(self: Exit<E, A>): Exit<E, A> {
  return self.mapErrorCause((cause) => cause.untraced)
}
