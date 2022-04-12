/**
 * @tsplus static ets/Random/Ops nextRange
 */
export function nextRange(low: number, high: number): UIO<number> {
  return Effect.randomWith((random) => random.nextRange(low, high));
}
