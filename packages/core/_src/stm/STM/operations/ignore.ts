/**
 * Returns a new effect that ignores the success or failure of this effect.
 *
 * @tsplus getter effect/core/stm/STM ignore
 */
export function ignore<R, E, A>(self: STM<R, E, A>): STM<R, never, void> {
  return self.fold(() => undefined, () => undefined)
}
