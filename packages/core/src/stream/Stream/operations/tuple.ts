import type { _A, _E, _R } from "@effect/core/stream/Stream//definition"

/**
 * @tsplus static effect/core/stream/Stream.Ops tuple
 * @category constructors
 * @since 1.0.0
 */
export function tuple<SN extends readonly Stream<any, any, any>[]>(
  ...[s1, s2, ...streams]: SN & {
    readonly 0: Stream<any, any, any>
    readonly 1: Stream<any, any, any>
  }
): Stream<
  [SN[number]] extends [{ [_R]: () => infer R }] ? R : never,
  [SN[number]] extends [{ [_E]: () => infer E }] ? E : never,
  {
    [K in keyof SN]: [SN[number]] extends [{ [_A]: () => infer A }] ? A : never
  }
> {
  const init = s1.zip(s2)

  return streams.reduce(
    (acc, v) => acc.zipWith(v, (a, b) => (a as ReadonlyArray<any>).concat(b)),
    init
  )
}
