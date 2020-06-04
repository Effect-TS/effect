import { patch, AspectE, AspectR12 } from "../../Def"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"

export const withInit = <S, R>(init: T.Effect<S, R, any, void>): AspectE<R> => (Spec) =>
  pipe(
    Spec,
    patch((_) => ({
      ..._,
      _R: undefined as any,
      eff: T.chain_(init, () => _.eff)
    }))
  )

export const withFinalize = <S, R>(finalize: T.Effect<S, R, any, void>): AspectE<R> => (
  Spec
) =>
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
  )

export const withHook = <S, S2, R, R2, A>(
  init: T.Effect<S, R, any, A>,
  finalize: (_: A) => T.Effect<S2, R2, any, void>
): AspectE<R & R2> => (Spec) =>
  pipe(
    Spec,
    patch((_) => ({
      ..._,
      _R: undefined as any,
      eff: T.Do()
        .bind("i", init)
        .bind("e", T.result(_.eff))
        .doL((s) => finalize(s.i))
        .bindL("r", (s) => T.completed(s.e))
        .return((s) => s.r)
    }))
  )

export const withHookP = <S, S2, R, R2, A>(
  init: T.Effect<S, R, any, A>,
  finalize: (_: A) => T.Effect<S2, R2, any, void>
): AspectR12<A, R & R2> => (Spec) =>
  pipe(
    Spec,
    patch((_) => ({
      ..._,
      _R: undefined as any,
      eff: T.Do()
        .bind("i", init)
        .bindL("e", (s) => T.result(T.provide(s.i)(_.eff)))
        .doL((s) => finalize(s.i))
        .bindL("r", (s) => T.completed(s.e))
        .return((s) => s.r)
    }))
  )
