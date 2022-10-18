/**
 * Do simulation using Generators
 *
 * @tsplus static effect/core/stm/STM.Ops gen
 */
export function gen<
  Eff extends STM.Base<any, any, any>,
  AEff
>(
  f: () => Generator<Eff, AEff, any>
): STM<
  [Eff] extends [STM.Base<infer R, any, any>] ? R : never,
  [Eff] extends [STM.Base<any, infer E, any>] ? E : never,
  AEff
> {
  return STM.suspend(() => {
    const iterator = f()
    const state = iterator.next()

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): STM<any, any, AEff> {
      if (state.done) {
        return STM.succeed(state.value)
      }
      return (state.value as unknown as STM<any, any, any>).flatMap((val) => {
        const next = iterator.next(val)
        return run(next)
      })
    }

    return run(state)
  })
}
