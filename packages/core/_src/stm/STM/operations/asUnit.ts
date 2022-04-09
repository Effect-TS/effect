/**
 * Ignores the result of the transactional effect replacing it with `undefined`.
 *
 * @tsplus fluent ets/STM asUnit
 */
export function asUnit<R, E, X>(self: STM<R, E, X>): STM<R, E, void> {
  return self > STM.unit;
}
