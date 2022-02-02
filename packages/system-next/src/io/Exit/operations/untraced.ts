import type { Exit } from "../definition"

/**
 * Returns an untraced `Exit` value.
 *
 * @tsplus fluent ets/Exit untraced
 */
export function untraced<E, A>(self: Exit<E, A>): Exit<E, A> {
  return self.mapErrorCause((_) => _.untraced())
}
