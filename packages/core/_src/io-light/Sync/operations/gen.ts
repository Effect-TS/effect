/**
 * inspired by https://github.com/tusharmath/qio/pull/22 (revised)
 */

import { isEither, isOption, isService } from "@effect-ts/core/data/Utils";
import { _GenA, _GenE, _GenR } from "@effect-ts/core/io/Effect/operations/gen";

export class GenSync<R, E, A> {
  readonly [_GenR]!: (_R: R) => void;
  readonly [_GenE]!: () => E;
  readonly [_GenA]!: () => A;

  constructor(readonly sync: Sync<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenSync<R, E, A>, A, any> {
    return yield this;
  }
}

const adapter = (_: any, __?: any) => {
  if (isService(_)) {
    return new GenSync(Sync.service(_));
  }
  if (isEither(_)) {
    return new GenSync(_._tag === "Left" ? Sync.fail(_.left) : Sync.succeed(_.right));
  }
  if (isOption(_)) {
    return new GenSync(
      _._tag === "None"
        ? Sync.fail(() => (__ ? __() : new NoSuchElement()))
        : Sync.succeed(_.value)
    );
  }
  return new GenSync(_);
};

export function gen<Eff extends GenSync<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Service<A>): GenSync<Has<A>, never, A>;
    <E, A>(_: Option<A>, onNone: () => E): GenSync<unknown, E, A>;
    <A>(_: Option<A>): GenSync<unknown, NoSuchElement, A>;
    <E, A>(_: Either<E, A>): GenSync<unknown, E, A>;
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>;
  }) => Generator<Eff, AEff, any>
): Sync<
  [Eff] extends [{ [_GenR]: (_: infer R) => void; }] ? R : never,
  [Eff] extends [{ [_GenE]: () => infer E; }] ? E : never,
  AEff
> {
  return Sync.suspend(() => {
    const iterator = f(adapter as any);
    const state = iterator.next();

    function run(
      state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>
    ): Sync<any, any, AEff> {
      if (state.done) {
        return Sync.succeed(state.value);
      }
      return state.value["sync"].flatMap((val) => {
        const next = iterator.next(val);
        return run(next);
      });
    }

    return run(state);
  });
}
