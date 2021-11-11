import type * as S from "../_internal/core"

export interface $R {
  readonly _tag: unique symbol
}

export interface $E {
  readonly _tag: unique symbol
}

export interface $A {
  readonly _tag: unique symbol
}

export type _R<Env, R> = Env extends $R & infer R1 ? R & R1 : unknown

export type _E<Err, E> = (Err extends $E ? never : Err) | E

export type _A<Elem, A> = Elem extends $A ? ($A extends Elem ? A : Elem) : Elem

export interface Pipeline<
  LowerEnv,
  UpperEnv,
  LowerErr,
  UpperErr,
  LowerElem,
  UpperElem
> {
  <R, E, A>(stream: S.Stream<R, E, _A<UpperElem, A>>): S.Stream<
    _R<LowerEnv, R>,
    _E<LowerErr, E>,
    _A<LowerElem, A>
  >
}

export class Pipeline<
  LowerEnv,
  UpperEnv,
  LowerErr,
  UpperErr,
  LowerElem,
  UpperElem
> extends Function {
  constructor(
    readonly pipeline: (
      stream: S.Stream<UpperEnv, UpperErr, UpperElem>
    ) => S.Stream<LowerEnv, LowerErr, LowerElem>
  ) {
    super()

    const handler = {
      apply(
        target: Pipeline<LowerEnv, UpperEnv, LowerErr, UpperErr, LowerElem, UpperElem>,
        _thisArg: Pipeline<
          LowerEnv,
          UpperEnv,
          LowerErr,
          UpperErr,
          LowerElem,
          UpperElem
        >,
        argumentsList: [S.Stream<any, any, any>]
      ) {
        return target.pipeline(argumentsList[0])
      }
    }

    return new Proxy<
      Pipeline<LowerEnv, UpperEnv, LowerErr, UpperErr, LowerElem, UpperElem>
    >(this, handler)
  }

  ["@@"]<LowerEnv1, LowerErr1, LowerElem1>(
    that: Pipeline<LowerEnv1, LowerEnv, LowerErr1, LowerErr, LowerElem1, LowerElem>
  ) {
    return new Pipeline((stream: S.Stream<UpperEnv, UpperErr, UpperElem>) =>
      that.pipeline(this.pipeline(stream))
    )
  }
}

export function make<LowerEnv, UpperEnv, LowerErr, UpperErr, LowerElem, UpperElem>(
  pipeline: (
    stream: S.Stream<UpperEnv, UpperErr, UpperElem>
  ) => S.Stream<LowerEnv, LowerErr, LowerElem>
): Pipeline<LowerEnv, UpperEnv, LowerErr, UpperErr, LowerElem, UpperElem> {
  return new Pipeline(pipeline)
}
