/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */
import { _A, _E, _R } from "@effect-ts/core/stm/STM/definition/base";

export class GenSTM<R, E, A> {
  readonly [_R]!: (_R: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;

  constructor(readonly stm: STM<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenSTM<R, E, A>, A, any> {
    return yield this;
  }
}

const adapter = (_: any, __?: any) => {
  return new GenSTM(_);
};

/**
 * Do simulation using Generators
 *
 * @tsplus static ets/STM/Ops gen
 */
export function gen<Eff extends GenSTM<any, any, any>, AEff>(
  f: (i: { <R, E, A>(_: STM<R, E, A>): GenSTM<R, E, A>; }) => Generator<Eff, AEff, any>
): STM<
  [Eff] extends [{ [_R]: (_: infer R) => void; }] ? R : never,
  [Eff] extends [{ [_E]: () => infer E; }] ? E : never,
  AEff
> {
  return STM.suspend(() => {
    const iterator = f(adapter as any);
    const state = iterator.next();

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): STM<any, any, AEff> {
      if (state.done) {
        return STM.succeedNow(state.value);
      }
      return state.value["stm"].flatMap((val) => {
        const next = iterator.next(val);
        return run(next);
      });
    }

    return run(state);
  });
}
