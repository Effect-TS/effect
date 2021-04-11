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

/**
 * Pipe the output of a channel into the input of another
 */
export function pipeTo_<
  Env,
  Env2,
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
  right: P.Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
): P.Channel<Env & Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  return new PipeTo<
    Env & Env2,
    InErr,
    InElem,
    InDone,
    OutErr2,
    OutElem2,
    OutDone2,
    OutErr,
    OutElem,
    OutDone
  >(
    () => left,
    () => right
  )
}

/**
 * Pipe the output of a channel into the input of another
 *
 * @dataFirst pipeTo_
 */
export function pipeTo<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(
  right: P.Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
): <Env, InErr, InElem, InDone>(
  left: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => P.Channel<Env & Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  return (left) => pipeTo_(left, right)
}

export function readWithCause<
  Env,
  Env1,
  Env2,
  InErr,
  InErr1,
  InErr2,
  InErr3,
  InElem,
  InElem1,
  InElem2,
  InElem3,
  InDone,
  InDone1,
  InDone2,
  InDone3,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  inp: (
    i: InElem
  ) => P.Channel<Env, InErr1, InElem1, InDone1, OutErr, OutElem, OutDone>,
  halt: (
    e: Cause.Cause<InErr>
  ) => P.Channel<Env1, InErr1, InElem2, InDone2, OutErr1, OutElem1, OutDone1>,
  done: (
    d: InDone
  ) => P.Channel<Env2, InErr3, InElem3, InDone3, OutErr2, OutElem2, OutDone2>
): P.Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2 & InErr3,
  InElem & InElem1 & InElem2 & InElem3,
  InDone & InDone1 & InDone2 & InDone3,
  OutErr | OutErr1 | OutErr2,
  OutElem | OutElem1 | OutElem2,
  OutDone | OutDone1 | OutDone2
> {
  return new Read<
    Env & Env1 & Env2,
    InErr & InErr1 & InErr2 & InErr3,
    InElem & InElem1 & InElem2 & InElem3,
    InDone & InDone1 & InDone2 & InDone3,
    OutErr | OutErr1 | OutErr2,
    OutElem | OutElem1 | OutElem2,
    OutDone | OutDone1 | OutDone2,
    InErr & InErr1 & InErr2 & InErr3,
    InDone & InDone1 & InDone2 & InDone3
  >(
    inp,
    new P.ContinuationK<
      Env & Env1 & Env2,
      InErr & InErr1 & InErr2 & InErr3,
      InElem & InElem1 & InElem2 & InElem3,
      InDone & InDone1 & InDone2 & InDone3,
      InErr & InErr1 & InErr2 & InErr3,
      OutErr | OutErr1 | OutErr2,
      OutElem | OutElem1 | OutElem2,
      InDone & InDone1 & InDone2 & InDone3,
      OutDone | OutDone1 | OutDone2
    >(done, halt)
  )
}

export function endL<OutDone>(
  result: () => OutDone
): P.Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Done(result)
}

export function end<OutDone>(
  result: OutDone
): P.Channel<unknown, unknown, unknown, unknown, never, never, OutDone> {
  return new Done(() => result)
}

export function haltL<E>(
  result: () => Cause.Cause<E>
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(result)
}

export function halt<E>(
  result: Cause.Cause<E>
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => result)
}

export function failL<E>(
  result: () => E
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => Cause.fail(result()))
}

export function fail<E>(
  result: E
): P.Channel<unknown, unknown, unknown, unknown, E, never, never> {
  return new Halt(() => Cause.fail(result))
}

export function writeL<OutElem>(
  out: () => OutElem
): P.Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(out)
}

export function write<OutElem>(
  out: OutElem
): P.Channel<unknown, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(() => out)
}

export function ensuringWith_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: (e: Exit.Exit<OutErr, OutDone>) => T.Effect<Env, never, unknown>
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

/**
 * Provides the channel with its required environment, which eliminates
 * its dependency on `Env`.
 */
export function provideAll_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  env: Env
): P.Channel<unknown, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Provide(env, self)
}

/**
 * Returns a new channel, which sequentially combines this channel, together with the provided
 * factory function, which creates a second channel based on the terminal value of this channel.
 * The result is a channel that will first perform the functions of this channel, before
 * performing the functions of the created channel (including yielding its terminal value).
 */
export function chain_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (
    d: OutDone
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
): P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return new P.Fold<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone2,
    OutErr | OutErr1,
    OutDone
  >(self, new P.ContinuationK(f, halt))
}

/**
 * Returns a new channel, which sequentially combines this channel, together with the provided
 * factory function, which creates a second channel based on the terminal value of this channel.
 * The result is a channel that will first perform the functions of this channel, before
 * performing the functions of the created channel (including yielding its terminal value).
 */
export function chain<
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  f: (
    d: OutDone
  ) => P.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
): <Env, InErr, InElem, InDone, OutErr, OutElem>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => P.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return (self) => chain_(self, f)
}

/**
 * Returns a new channel which reads all the elements from upstream's output channel
 * and ignores them, then terminates with the upstream result value.
 */
export function drain<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: P.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): P.Channel<Env, InErr, InElem, InDone, OutErr, never, OutDone> {
  const drainer: P.Channel<
    Env,
    OutErr,
    OutElem,
    OutDone,
    OutErr,
    never,
    OutDone
  > = readWithCause(
    (_: OutElem) => drainer,
    (e: Cause.Cause<OutErr>) => halt(e),
    (d: OutDone) => end(d)
  )
  return self[">>>"](drainer)
}
