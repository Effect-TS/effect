import { freeEnv as F, effect as T } from "@matechs/effect";
import { FunctionN } from "fp-ts/lib/function";

export type EnvOf<F> = F extends FunctionN<infer _ARG, T.Effect<infer R, infer _E, infer _A>>
  ? R
  : F extends T.Effect<infer R, infer _E, infer _A>
  ? R
  : never;

export type OnlyNew<M extends F.ModuleShape<M>, I extends Implementation<M>> = {
  [k in keyof I & keyof M]: {
    [h in keyof I[k] & keyof M[k]]: I[k][h] extends FunctionN<
      infer ARG,
      T.Effect<infer R & EnvOf<M[k][h]>, infer E, infer A>
    >
      ? FunctionN<ARG, T.Effect<R, E, A>>
      : I[k][h] extends T.Effect<infer R & EnvOf<M[k][h]>, infer E, infer A>
      ? T.Effect<R, E, A>
      : never;
  };
};

export type ImplementationEnv<I> = F.UnionToIntersection<
  {
    [k in keyof I]: {
      [h in keyof I[k]]: I[k][h] extends FunctionN<any, infer K>
        ? K extends T.Effect<infer R, any, any>
          ? unknown extends R
            ? never
            : R
          : never
        : I[k][h] extends T.Effect<infer R, any, any>
        ? unknown extends R
          ? never
          : R
        : never;
    }[keyof I[k]];
  }[keyof I]
>;

export type Implementation<M> = {
  [k in keyof M]: {
    [h in keyof M[k]]?: M[k][h] extends FunctionN<infer ARG, T.Effect<infer _R, infer E, infer A>>
      ? FunctionN<ARG, T.Effect<any, E, A>>
      : M[k][h] extends T.Effect<infer _R, infer E, infer A>
      ? T.Effect<any, E, A>
      : never;
  };
};

export function implementMock<S extends F.ModuleSpec<any>>(
  s: S
): <I extends Implementation<F.TypeOf<S>>>(
  i: I
) => T.Provider<ImplementationEnv<OnlyNew<F.TypeOf<S>, I>>, F.TypeOf<S>, never> {
  return (i) => F.implement(s)(i as any) as any;
}
