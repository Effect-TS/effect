/**
 * @tsplus static ets/Random/Ops nextIntBetween
 */
export function nextIntBetween(low: number, high: number): RIO<HasRandom, number> {
  return Effect.serviceWithEffect(HasRandom)((_) => _.nextIntBetween(low, high));
}
