import { IsoErr } from "./fx/IsoErr"
import { FromEffectF, FromEffectK } from "./fx/effect"
import { FromXPureF, FromXPureK } from "./fx/pure"
import {
  AlgebraURIS,
  InterpretedF,
  InterpretedKF,
  InterpreterHKT,
  InterpreterKind,
  InterpreterURIS
} from "./registry"
import { AsyncStackURI } from "./stack"

import { identity } from "@matechs/preview/Function"
import { ApplicativeF, ApplicativeK } from "@matechs/preview/_abstract/Applicative"
import {
  EnvironmentalF,
  EnvironmentalK
} from "@matechs/preview/_abstract/FX/Environmental"
import { FailF, FailK } from "@matechs/preview/_abstract/FX/Fail"
import { RunF, RunK } from "@matechs/preview/_abstract/FX/Run"
import { HKTFull, KindFull, URIS } from "@matechs/preview/_abstract/HKT"
import { MonadF, MonadK } from "@matechs/preview/_abstract/Monad"

export type MoKind<F extends URIS, R, E, A> = KindFull<
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
  R,
  E,
  A
>

export type MoHKT<F, R, E, A> = HKTFull<
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
  R,
  E,
  A
>

export type Program<P extends AlgebraURIS, O, E, RDec, REnc> = {
  P: P
  <IF, F extends URIS>(I: InterpretedF<P, IF, F, RDec, REnc>): InterpreterHKT<
    IF,
    F,
    RDec,
    REnc,
    O,
    E
  >
}

export type ProgramAsync<P extends AlgebraURIS, O, E, RDec, REnc> = {
  P: P
  <IF>(I: InterpretedF<P, IF, AsyncStackURI, RDec, REnc>): InterpreterHKT<
    IF,
    AsyncStackURI,
    RDec,
    REnc,
    O,
    E
  >
}

export function makeProgram<P extends AlgebraURIS>(): <RDec, R2Dec, REnc, R2Enc, O, E>(
  program: <IF, F extends URIS>(
    I: InterpretedF<P, IF, F, RDec, REnc>
  ) => InterpreterHKT<IF, F, R2Dec, R2Enc, O, E>
) => Program<P, O, E, RDec & R2Dec, REnc & R2Enc> {
  return (f) => f as any
}

export function makeProgramAsync<P extends AlgebraURIS>(): <
  RDec,
  R2Dec,
  REnc,
  R2Enc,
  O,
  E
>(
  program: <IF>(
    I: InterpretedF<P, IF, AsyncStackURI, RDec, REnc>
  ) => InterpreterHKT<IF, AsyncStackURI, R2Dec, R2Enc, O, E>
) => ProgramAsync<P, O, E, RDec & R2Dec, REnc & R2Enc> {
  return (f) => f as any
}

export function makeInterpreter<
  P extends AlgebraURIS,
  IF extends InterpreterURIS,
  F
>(): <RDec, REnc>(
  _: InterpretedKF<P, IF, F, RDec, REnc>
) => InterpretedKF<P, IF, F, RDec, REnc> {
  return identity
}

export function finalize<
  P extends AlgebraURIS,
  IF extends InterpreterURIS,
  F extends AsyncStackURI
>(): <RDec, REnc>(
  _: InterpretedKF<P, IF, F, RDec, REnc>
) => <R2Dec, R2Enc, O, E>(
  program: ProgramAsync<P, O, E, R2Dec, R2Enc>
) => InterpreterKind<IF, F, RDec & R2Dec, REnc & R2Enc, O, E>
export function finalize<
  P extends AlgebraURIS,
  IF extends InterpreterURIS,
  F extends URIS
>(): <RDec, REnc>(
  _: InterpretedKF<P, IF, F, RDec, REnc>
) => <R2Dec, R2Enc, O, E>(
  program: Program<P, O, E, R2Dec, R2Enc>
) => InterpreterKind<IF, F, RDec & R2Dec, REnc & R2Enc, O, E>
export function finalize<P extends AlgebraURIS, IF, F extends URIS>(): <RDec, REnc>(
  _: InterpretedF<P, IF, F, RDec, REnc>
) => <R2Dec, R2Enc, O, E>(
  program: Program<P, O, E, R2Dec, R2Enc>
) => InterpreterHKT<IF, F, RDec & R2Dec, REnc & R2Enc, O, E> {
  return (_) => (program) => program(_ as any) as any
}

export type BaseStackF<F> = MonadF<F> &
  FailF<F> &
  RunF<F> &
  ApplicativeF<F> &
  FromXPureF<F> &
  EnvironmentalF<F> &
  IsoErr<F>

export type BaseStackK<F extends URIS> = MonadK<F> &
  FailK<F> &
  RunK<F> &
  ApplicativeK<F> &
  FromXPureK<F> &
  EnvironmentalK<F> &
  IsoErr<F>

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
