import { pipe } from "fp-ts/lib/pipeable";
import { patch, AspectR } from "../def";
import { effect as T } from "@matechs/effect";

export const withProvider = <RP>(f: <R, A>(_: T.Effect<R & RP, any, A>) => T.Effect<R, any, A>): AspectR<RP> => (Spec) =>
  pipe(
    Spec,
    patch((_) => ({
      ..._,
      _R: undefined as any,
      eff: f(_.eff)
    }))
  );
