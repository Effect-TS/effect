import { pipe } from "fp-ts/lib/pipeable";
import { patch, AspectR12 } from "../def";
import { effect as T } from "@matechs/effect";

export const withProvider = <U, P, E>(f: T.Provider<U, P, E>): AspectR12<P, U> => (Spec) =>
  pipe(
    Spec,
    patch((_) => ({
      ..._,
      _R: undefined as any,
      eff: f(_.eff)
    }))
  );
