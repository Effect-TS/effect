import { pipe } from "fp-ts/lib/pipeable";
import { patch, AspectE } from "../def";
import { effect as T } from "@matechs/effect";
import { flow } from "fp-ts/lib/function";

export const withInit = <R>(init: T.Effect<R, any, void>): AspectE<R> => (Spec) =>
  pipe(
    Spec,
    patch((_) => ({
      ..._,
      _R: undefined as any,
      eff: T.effect.chain(init, () => _.eff)
    }))
  );

export const withFinalize = <R>(finalize: T.Effect<R, any, void>): AspectE<R> => (Spec) =>
  pipe(
    Spec,
    patch((_) => ({
      ..._,
      _R: undefined as any,
      eff: pipe(
        T.result(_.eff),
        T.chainTap(() => finalize),
        T.chain(T.completed)
      )
    }))
  );

export const withHook = <R, R2>(init: T.Effect<R, any, void>, finalize: T.Effect<R2, any, void>): AspectE<R & R2> =>
  flow(withInit(init), withFinalize(finalize));
