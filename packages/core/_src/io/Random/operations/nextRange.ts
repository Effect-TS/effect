/**
 * @tsplus static ets/Random/Ops nextRange
 */
export function nextRange(low: number, high: number): RIO<HasRandom, number> {
  return Effect.serviceWithEffect(HasRandom)((_) => _.nextRange(low, high));
}
