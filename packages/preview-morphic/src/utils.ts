import {} from "@matechs/preview/Effect"
import {
  AlgebraURIS,
  InterpretedF,
  InterpretedKF,
  InterpreterHKT,
  InterpreterKind,
  InterpreterURIS
} from "./registry"
import { FromEffectF, FromEffectK } from "./stack/effect"
import { FromXPureF, FromXPureK } from "./stack/pure"

import { AsyncStackURI } from "."

import { identity } from "@matechs/preview/Function"
import { ApplicativeF, ApplicativeK } from "@matechs/preview/_abstract/Applicative"
import { FailF, FailK } from "@matechs/preview/_abstract/FX/Fail"
import { RunF, RunK } from "@matechs/preview/_abstract/FX/Run"
import { HKTTL, KindTL, URIS } from "@matechs/preview/_abstract/HKT"
import { MonadF, MonadK } from "@matechs/preview/_abstract/Monad"

export type MoKind<F extends URIS, E, A> = KindTL<
  F,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  E,
  A
>

export type MoHKT<F, E, A> = HKTTL<
  F,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  E,
  A
>

export type Program<P extends AlgebraURIS, O, E> = {
  P: P
  <IF, F extends URIS>(I: InterpretedF<P, IF, F>): InterpreterHKT<IF, F, O, E>
}

export type ProgramAsync<P extends AlgebraURIS, O, E> = {
  P: P
  <IF>(I: InterpretedF<P, IF, AsyncStackURI>): InterpreterHKT<IF, AsyncStackURI, O, E>
}

export function makeProgram<P extends AlgebraURIS>(): <O, E>(
  program: <IF, F extends URIS>(
    I: InterpretedF<P, IF, F>
  ) => InterpreterHKT<IF, F, O, E>
) => Program<P, O, E> {
  return (f) => f as any
}
export function makeProgramAsync<P extends AlgebraURIS>(): <O, E>(
  program: <IF>(
    I: InterpretedF<P, IF, AsyncStackURI>
  ) => InterpreterHKT<IF, AsyncStackURI, O, E>
) => ProgramAsync<P, O, E> {
  return (f) => f as any
}

export function makeInterpreter<
  P extends AlgebraURIS,
  IF extends InterpreterURIS,
  F
>(): (_: InterpretedKF<P, IF, F>) => InterpretedKF<P, IF, F> {
  return identity
}

export function finalize<
  P extends AlgebraURIS,
  IF extends InterpreterURIS,
  F extends AsyncStackURI
>(): (
  _: InterpretedKF<P, IF, F>
) => <O, E>(program: ProgramAsync<P, O, E>) => InterpreterKind<IF, F, O, E>
export function finalize<
  P extends AlgebraURIS,
  IF extends InterpreterURIS,
  F extends URIS
>(): (
  _: InterpretedKF<P, IF, F>
) => <O, E>(program: Program<P, O, E>) => InterpreterKind<IF, F, O, E>
export function finalize<P extends AlgebraURIS, IF, F extends URIS>(): (
  _: InterpretedF<P, IF, F>
) => <O, E>(program: Program<P, O, E>) => InterpreterHKT<IF, F, O, E> {
  return (_) => (program) => program(_)
}

export type BaseStackF<F> = MonadF<F> &
  FailF<F> &
  RunF<F> &
  ApplicativeF<F> &
  FromXPureF<F>

export type BaseStackK<F extends URIS> = MonadK<F> &
  FailK<F> &
  RunK<F> &
  ApplicativeK<F> &
  FromXPureK<F>

export interface SyncStackF<F> extends BaseStackF<F> {
  _stack: "SyncStack"
}

export interface SyncStackK<F extends URIS> extends BaseStackK<F> {
  _stack: "SyncStack"
}

export interface AsyncStackF<F> extends BaseStackF<F>, FromEffectF<F> {
  _stack: "AsyncStack"
}

export interface AsyncStackK<F extends URIS> extends BaseStackK<F>, FromEffectK<F> {
  _stack: "AsyncStack"
}

export type AnyStackF<F> = SyncStackF<F> | AsyncStackF<F>
export type AnyStackK<F extends URIS> = SyncStackK<F> | AsyncStackK<F>

export function foldStack<F extends URIS>(
  F: AnyStackK<F>
): <A, B>(f: (_: AsyncStackK<F>) => A, g: (_: SyncStackK<F>) => B) => A | B
export function foldStack<F>(
  F: AnyStackF<F>
): <A, B>(f: (_: AsyncStackF<F>) => A, g: (_: SyncStackF<F>) => B) => A | B
export function foldStack<F>(
  F: AnyStackF<F>
): <A, B>(f: (_: AsyncStackF<F>) => A, g: (_: SyncStackF<F>) => B) => A | B {
  return (f, g) => (F._stack === "AsyncStack" ? f(F) : g(F))
}
