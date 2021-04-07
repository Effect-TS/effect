import * as Cause from "../../../Cause"
import type * as T from "../../../Effect"
import type * as Exit from "../../../Exit"
import * as P from "./_internal/primitives"
import {
  BracketOut,
  Bridge,
  ConcatAll,
  Done,
  Emit,
  Ensuring,
  Fold,
  Halt,
  PipeTo,
  Provide,
  Read
} from "./_internal/primitives"
import type { AsyncInputProducer } from "./_internal/producer"

export type { Channel } from "./_internal/primitives"

export function pipeToL<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutErr2,
  OutElem2,
  OutDone2
>(
  left: () => P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  right: () => P.Channel<Env, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
): P.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  return new PipeTo(left, right)
}

export function pipeTo_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutErr2,
  OutElem2,
  OutDone2
>(
  left: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  right: P.Channel<Env, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
): P.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  return new PipeTo(
    () => left,
    () => right
  )
}

export function readWithCause<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  inp: (i: InElem) => P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  halt: (
    e: Cause.Cause<InErr>
  ) => P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  done: (d: InDone) => P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Read<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, InErr, InDone>(
    inp,
    new P.ContinuationK(done, halt)
  )
}

export function endL<InErr, InElem, InDone, OutDone>(
  result: () => OutDone
): P.Channel<unknown, InErr, InElem, InDone, never, never, OutDone> {
  return new Done(result)
}

export function end<InErr, InElem, InDone, OutDone>(
  result: OutDone
): P.Channel<unknown, InErr, InElem, InDone, never, never, OutDone> {
  return new Done(() => result)
}

export function haltL<InErr, InElem, InDone, E>(
  result: () => Cause.Cause<E>
): P.Channel<unknown, InErr, InElem, InDone, E, never, never> {
  return new Halt(result)
}

export function halt<InErr, InElem, InDone, E>(
  result: Cause.Cause<E>
): P.Channel<unknown, InErr, InElem, InDone, E, never, never> {
  return new Halt(() => result)
}

export function failL<InErr, InElem, InDone, E>(
  result: () => E
): P.Channel<unknown, InErr, InElem, InDone, E, never, never> {
  return new Halt(() => Cause.fail(result()))
}

export function fail<InErr, InElem, InDone, E>(
  result: E
): P.Channel<unknown, InErr, InElem, InDone, E, never, never> {
  return new Halt(() => Cause.fail(result))
}

export function writeL<InErr, InElem, InDone, OutElem>(
  out: () => OutElem
): P.Channel<unknown, InErr, InElem, InDone, never, OutElem, void> {
  return new Emit(out)
}

export function write<InErr, InElem, InDone, OutElem>(
  out: OutElem
): P.Channel<unknown, InErr, InElem, InDone, never, OutElem, void> {
  return new Emit(() => out)
}

export function ensuringWith_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: (e: Exit.Exit<OutErr, OutDone>) => P.Effect<Env, never, unknown>
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Ensuring(channel, finalizer)
}

export function concatMapWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (o: OutElem) => P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone3> {
  return new ConcatAll(g, h, self, f)
}

export function foldCauseM_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone,
  OutDone2
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onErr: (
    c: Cause.Cause<OutErr>
  ) => P.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>,
  onSucc: (
    o: OutDone
  ) => P.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2>
): P.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone2> {
  return new Fold(self, new P.ContinuationK(onSucc, onErr))
}
export function embedInput_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: P.Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>,
  input: AsyncInputProducer<InErr, InElem, InDone>
): P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Bridge(input, self)
}

export function bracketOutExit_<R, E, Z>(
  self: T.Effect<R, E, Z>,
  release: (z: Z, e: Exit.Exit<unknown, unknown>) => T.RIO<R, unknown>
): P.Channel<R, unknown, unknown, unknown, E, Z, void> {
  return new BracketOut(self, release)
}

export function provideAll_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  env: Env
): P.Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Provide(env, self)
}

const x = write(0)[">>>"](readWithCause((n) => write(n + 1), halt, end))
