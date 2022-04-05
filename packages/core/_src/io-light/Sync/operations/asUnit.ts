/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus fluent ets/Sync asUnit
 */
export function asUnit<R, E, A, B>(self: Sync<R, E, A>): Sync<R, E, void> {
  return self.map(() => undefined);
}
