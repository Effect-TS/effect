import type { _E, _In, _L, _R, _Z } from "@effect/core/stream/Sink/definition/symbols"

/**
 * @tsplus static effect/core/stream/Sink.Ops tuple
 */
export function tuple<SN extends readonly Sink<any, any, any, any, any>[]>(
  ...[s1, s2, ...sinks]: SN & {
    readonly 0: Sink<any, any, any, any, any>
    readonly 1: Sink<any, any, any, any, any>
  }
): Sink<
  [SN[number]] extends [{ [k in typeof _R]: () => infer R }] ? R : never,
  [SN[number]] extends [{ [k in typeof _E]: () => infer E }] ? E : never,
  [SN[number]] extends [{ [k in typeof _In]: (_: infer In) => void }] ? In : never,
  [SN[number]] extends [{ [k in typeof _L]: () => infer L }] ? L : never,
  {
    [K in keyof SN]: [SN[K]] extends [{ [k in typeof _Z]: () => infer Z }] ? Z : never
  }
> {
  const init = (s1 as Sink<any, any, any, any, any>).zipWith(
    s2 as Sink<any, any, any, any, any>,
    (a, b) => [a, b] as const
  )
  return sinks.reduce(
    (acc, v) => acc.zipWith(v, (a, b) => (a as readonly [any]).concat(b)),
    init
  )
}
