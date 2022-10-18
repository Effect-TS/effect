import { getCallTrace } from "@effect/core/io/Effect/definition/primitives"

/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */

/**
 * @effect traced
 * @tsplus static effect/core/io/Effect.Ops gen
 */
export const gen = <
  Eff extends Effect.Base<any, any, any>,
  AEff
>(
  f: (adapter: <A>(tag: Tag<A>) => Effect<A, never, A>) => Generator<Eff, AEff, any>
): Effect<
  [Eff] extends [Effect.Base<infer R, any, any>] ? R : never,
  [Eff] extends [Effect.Base<any, infer E, any>] ? E : never,
  AEff
> => {
  const trace = getCallTrace()
  return Effect.suspendSucceed(() => {
    const iterator = f(Effect.service)
    const state = iterator.next()

    const run = (
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Effect<any, any, AEff> =>
      (state.done ?
        Effect.succeed(state.value) :
        (state.value as unknown as Effect<any, any, any>).flatMap((val: any) =>
          run(iterator.next(val))
        ))
        ._call(
          trace
        )

    return run(state)
  })._call(trace)
}
