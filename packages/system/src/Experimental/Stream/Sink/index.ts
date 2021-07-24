// ets_tracing: off

import "../../../Operator"

import * as A from "../../../Collections/Immutable/Chunk"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import type { Predicate } from "../../../Function"
import { pipe } from "../../../Function"
import * as O from "../../../Option"
import * as Ref from "../../../Ref"
import { AtomicReference } from "../../../Support/AtomicReference"
import * as C from "../Channel"

/**
 * Sink is a data type that represent a channel that reads elements
 * of type `In`, handles input errors of type `InErr`, emits errors
 * of type `OutErr`, emits outputs of type `L` and ends with a value
 * of type `Z`.
 */
export class Sink<R, InErr, In, OutErr, L, Z> {
  constructor(
    readonly channel: C.Channel<R, InErr, A.Chunk<In>, unknown, OutErr, A.Chunk<L>, Z>
  ) {}
}

/**
 * Replaces this sink's result with the provided value.
 */
export function as_<R, InErr, In, OutErr, L, Z, Z1>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  z: Z1
): Sink<R, InErr, In, OutErr, L, Z1> {
  return map_(self, (_) => z)
}

/**
 * Replaces this sink's result with the provided value.
 *
 * @ets_data_first as_
 */
export function as<Z1>(z: Z1) {
  return <R, InErr, In, OutErr, L, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    as_(self, z)
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith_<R, InErr, In, OutErr, L extends In, Z, S>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  z: S,
  p: Predicate<Z>,
  f: (s: S, z: Z) => S
): Sink<R, InErr, In, OutErr, L, S> {
  return new Sink(
    pipe(
      C.fromEffect(T.zip_(Ref.makeRef(A.empty<In>()), Ref.makeRef(false))),
      C.chain(({ tuple: [leftoversRef, upstreamDoneRef] }) => {
        const upstreamMarker: C.Channel<
          unknown,
          InErr,
          A.Chunk<In>,
          unknown,
          InErr,
          A.Chunk<In>,
          any
        > = C.readWith(
          (in_) => C.zipRight_(C.write(in_), upstreamMarker),
          (_) => C.fail(_),
          (x) => C.as_(C.fromEffect(upstreamDoneRef.set(true)), x)
        )

        const loop = (
          currentResult: S
        ): C.Channel<R, InErr, A.Chunk<In>, unknown, OutErr, A.Chunk<L>, S> =>
          C.foldChannel_(
            C.doneCollect(self.channel),
            (_) => C.fail(_),
            ({ tuple: [leftovers, doneValue] }) => {
              if (p(doneValue)) {
                return pipe(
                  C.fromEffect(leftoversRef.set(A.flatten(leftovers))),
                  C.bind("upstreamDone", () => C.fromEffect(upstreamDoneRef.get)),
                  C.let("accumulatedResult", () => f(currentResult, doneValue)),
                  C.bind("result", ({ accumulatedResult, upstreamDone }) =>
                    upstreamDone
                      ? C.as_(C.write(A.flatten(leftovers)), currentResult)
                      : loop(accumulatedResult)
                  ),
                  C.map(({ result }) => result)
                )
              } else {
                return C.as_(C.write(A.flatten(leftovers)), currentResult)
              }
            }
          )

        return upstreamMarker[">>>"](C.bufferChunk(leftoversRef))[">>>"](loop(z))
      })
    )
  )
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 *
 * @ets_data_first collectAllWhileWith_
 */
export function collectAllWhileWith<Z, S>(z: S, p: Predicate<Z>, f: (s: S, z: Z) => S) {
  return <R, InErr, In, OutErr, L extends In>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    collectAllWhileWith_(self, z, p, f)
}

/**
 * Transforms this sink's input elements.
 */
export function contramap_<R, InErr, In, In1, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: In1) => In
): Sink<R, InErr, In1, OutErr, L, Z> {
  return contramapChunks_(self, A.map(f))
}

/**
 * Transforms this sink's input elements.
 *
 * @ets_data_first contramap_
 */
export function contramap<In, In1>(f: (in_: In1) => In) {
  return <R, InErr, OutErr, L, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    contramap_(self, f)
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks_<R, InErr, In, In1, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (c: A.Chunk<In1>) => A.Chunk<In>
): Sink<R, InErr, In1, OutErr, L, Z> {
  const loop: C.Channel<
    R,
    InErr,
    A.Chunk<In1>,
    unknown,
    InErr,
    A.Chunk<In>,
    any
  > = C.readWith(
    (chunk) => C.zipRight_(C.write(f(chunk)), loop),
    (_) => C.fail(_),
    (_) => C.succeed(_)
  )

  return new Sink(loop[">>>"](self.channel))
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 *
 * @ets_data_first contramapChunks_
 */
export function contramapChunks<In, In1>(f: (c: A.Chunk<In1>) => A.Chunk<In>) {
  return <R, InErr, OutErr, L, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    contramapChunks_(self, f)
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksEff_<
  R,
  R1,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr,
  L,
  Z
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (c: A.Chunk<In1>) => T.Effect<R1, InErr1, A.Chunk<In>>
): Sink<R1 & R, InErr & InErr1, In1, OutErr, L, Z> {
  const loop: C.Channel<
    R1,
    InErr & InErr1,
    A.Chunk<In1>,
    unknown,
    InErr1,
    A.Chunk<In>,
    any
  > = C.readWith(
    (chunk) => C.zipRight_(C.chain_(C.fromEffect(f(chunk)), C.write), loop),
    (_) => C.fail(_),
    (_) => C.succeed(_)
  )

  return new Sink(loop[">>>"](self.channel))
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 *
 * @ets_data_first contramapChunksEff_
 */
export function contramapChunksEff<R1, In, InErr, InErr1 extends InErr, In1>(
  f: (c: A.Chunk<In1>) => T.Effect<R1, InErr1, A.Chunk<In>>
) {
  return <R, OutErr, L, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    contramapChunksEff_(self, f)
}

function collectLoop<Err, A>(
  state: A.Chunk<A>
): C.Channel<unknown, Err, A.Chunk<A>, unknown, Err, A.Chunk<never>, A.Chunk<A>> {
  return C.readWithCause(
    (i) => collectLoop(A.concat_(state, i)),
    C.failCause,
    (_) => C.end(state)
  )
}

/**
 * Effectfully transforms this sink's input elements.
 */
export function contramapEff_<
  R,
  R1,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr,
  L,
  Z
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: In1) => T.Effect<R1, InErr1, In>
): Sink<R1 & R, InErr & InErr1, In1, OutErr, L, Z> {
  return contramapChunksEff_(self, A.mapM(f))
}

/**
 * Effectfully transforms this sink's input elements.
 *
 * @ets_data_first contramapEff_
 */
export function contramapEff<R1, InErr, InErr1 extends InErr, In, In1>(
  f: (in_: In1) => T.Effect<R1, InErr1, In>
) {
  return <R, OutErr, L, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    contramapEff_(self, f)
}

/**
 * A sink that collects all of its inputs into a chunk.
 */
export function collectAll<Err, A>() {
  return new Sink(collectLoop<Err, A>(A.empty()))
}

/**
 * A sink that ignores all of its inputs.
 */
export function drain<Err, A>() {
  const drain: C.Channel<
    unknown,
    Err,
    A.Chunk<A>,
    unknown,
    Err,
    A.Chunk<never>,
    void
  > = C.readWithCause(
    (_) => drain,
    C.failCause,
    (_) => C.unit
  )

  return new Sink(drain)
}

/**
 * A sink that executes the provided effectful function for every element fed to it
 * until `f` evaluates to `false`.
 */
export function forEachWhile<R, ErrIn, ErrOut, In>(
  f: (_in: In) => T.Effect<R, ErrOut, boolean>
): Sink<R, ErrIn, In, ErrIn | ErrOut, In, void> {
  const go = (
    chunk: A.Chunk<In>,
    idx: number,
    len: number,
    cont: C.Channel<R, ErrIn, A.Chunk<In>, unknown, ErrIn | ErrOut, A.Chunk<In>, void>
  ): C.Channel<R, ErrIn, A.Chunk<In>, unknown, ErrIn | ErrOut, A.Chunk<In>, void> => {
    if (idx === len) {
      return cont
    } else {
      return pipe(
        C.fromEffect(f(A.unsafeGet_(chunk, idx))),
        C.chain((b) => {
          if (b) {
            return go(chunk, idx + 1, len, cont)
          } else {
            return C.write(A.drop_(chunk, idx))
          }
        }),
        C.catchAll((e) => C.zipRight_(C.write(A.drop_(chunk, idx)), C.fail(e)))
      )
    }
  }

  const process: C.Channel<
    R,
    ErrIn,
    A.Chunk<In>,
    unknown,
    ErrIn | ErrOut,
    A.Chunk<In>,
    void
  > = C.readWithCause(
    (_in) => go(_in, 0, A.size(_in), process),
    (halt) => C.failCause(halt),
    (_) => C.end(undefined)
  )

  return new Sink(process)
}

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function forEach<R, ErrIn, ErrOut, In, B>(
  f: (_in: In) => T.Effect<R, ErrOut, B>
): Sink<R, ErrIn, In, ErrIn | ErrOut, In, void> {
  return forEachWhile((_) => T.as_(f(_), true))
}

/**
 * A sink that folds its inputs with the provided function, termination predicate and initial state.
 */
export function reduce<S, In, Err>(z: S, cont: Predicate<S>, f: (s: S, _in: In) => S) {
  const reduceChunkSplit =
    (z: S, chunk: A.Chunk<In>) => (cont: Predicate<S>) => (f: (s: S, _in: In) => S) => {
      const reduce = (
        s: S,
        chunk: A.Chunk<In>,
        idx: number,
        len: number
      ): Tp.Tuple<[S, A.Chunk<In>]> => {
        if (idx === len) {
          return Tp.tuple(s, A.empty<In>())
        } else {
          const s1 = f(s, A.unsafeGet_(chunk, idx))

          if (cont(s1)) {
            return reduce(s1, chunk, idx + 1, len)
          } else {
            return Tp.tuple(s1, A.drop_(chunk, idx + 1))
          }
        }
      }

      return reduce(z, chunk, 0, A.size(chunk))
    }

  const reader = (
    s: S
  ): C.Channel<unknown, Err, A.Chunk<In>, unknown, Err, A.Chunk<In>, S> => {
    if (!cont(s)) {
      return C.end(s)
    } else {
      return C.readWith(
        (_in) => {
          const {
            tuple: [nextS, leftovers]
          } = reduceChunkSplit(s, _in)(cont)(f)

          if (!A.isEmpty(leftovers)) {
            return C.as_(C.write(leftovers), nextS)
          } else {
            return reader(nextS)
          }
        },
        (err) => C.fail(err),
        (_) => C.end(s)
      )
    }
  }

  return new Sink(reader(z))
}

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 */
export function reduceEff<S, Env, In, InErr, OutErr>(
  z: S,
  cont: Predicate<S>,
  f: (s: S, _in: In) => T.Effect<Env, OutErr, S>
): Sink<Env, InErr, In, InErr | OutErr, In, S> {
  const reduceChunkSplit =
    (z: S, chunk: A.Chunk<In>) =>
    (cont: Predicate<S>) =>
    (f: (s: S, _in: In) => T.Effect<Env, OutErr, S>) => {
      const reduce = (
        s: S,
        chunk: A.Chunk<In>,
        idx: number,
        len: number
      ): T.Effect<Env, OutErr, Tp.Tuple<[S, O.Option<A.Chunk<In>>]>> => {
        if (idx === len) {
          return T.succeed(Tp.tuple(s, O.none))
        } else {
          return T.chain_(f(s, A.unsafeGet_(chunk, idx)), (s1) => {
            if (cont(s1)) {
              return reduce(s1, chunk, idx + 1, len)
            } else {
              return T.succeed(Tp.tuple(s1, O.some(A.drop_(chunk, idx + 1))))
            }
          })
        }
      }

      return reduce(z, chunk, 0, A.size(chunk))
    }

  const reader = (
    s: S
  ): C.Channel<Env, InErr, A.Chunk<In>, unknown, InErr | OutErr, A.Chunk<In>, S> => {
    if (!cont(s)) {
      return C.end(s)
    } else {
      return C.readWith(
        (_in) => {
          return pipe(
            C.fromEffect(reduceChunkSplit(s, _in)(cont)(f)),
            C.chain(({ tuple: [nextS, leftovers] }) => {
              return O.fold_(
                leftovers,
                () => reader(nextS),
                (l) => C.as_(C.write(l), nextS)
              )
            })
          )
        },
        (err) => C.fail(err),
        (_) => C.end(s)
      )
    }
  }

  return new Sink(reader(z))
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function forEachChunk<R, ErrIn, ErrOut, In, Z>(
  f: (c: A.Chunk<In>) => T.Effect<R, ErrOut, Z>
): Sink<R, ErrIn, In, ErrIn | ErrOut, unknown, void> {
  return forEachChunkWhile<R, ErrIn, ErrOut, In>((_) => T.as_(f(_), true))
}

/**
 * A sink that executes the provided effectful function for every chunk fed to it
 * until `f` evaluates to `false`.
 */
export function forEachChunkWhile<R, ErrIn, ErrOut, In>(
  f: (_in: A.Chunk<In>) => T.Effect<R, ErrOut, boolean>
): Sink<R, ErrIn, In, ErrIn | ErrOut, unknown, void> {
  const reader: C.Channel<
    R,
    ErrIn,
    A.Chunk<In>,
    unknown,
    ErrIn | ErrOut,
    never,
    void
  > = C.readWith(
    (_in) =>
      C.chain_(C.fromEffect(f(_in)), (continue_) =>
        continue_ ? reader : C.end(undefined)
      ),
    (err) => C.fail(err),
    (_) => C.unit
  )

  return new Sink(reader)
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 */
export function chain_<
  R,
  R1,
  InErr,
  InErr1,
  In,
  In1 extends In,
  OutErr,
  OutErr1,
  L,
  L1 extends L,
  Z,
  Z1
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z1> {
  return foldEff_(self, (_) => fail(_), f)
}

/**
 * Runs this sink until it yields a result, then uses that result to create another
 * sink from the provided function which will continue to run until it yields a result.
 *
 * This function essentially runs sinks in sequence.
 *
 * @ets_data_first chain_
 */
export function chain<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z, Z1>(
  f: (z: Z) => Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr>(self: Sink<R, InErr, In, OutErr, L, Z>) => chain_(self, f)
}

export function foldEff_<
  R,
  R1,
  R2,
  InErr,
  InErr1,
  InErr2,
  In,
  In1 extends In,
  In2 extends In,
  OutErr,
  OutErr2,
  OutErr3,
  L,
  L1 extends L,
  L2 extends L,
  Z,
  Z1,
  Z2
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  failure: (err: OutErr) => Sink<R1, InErr1, In1, OutErr2, L1, Z1>,
  success: (z: Z) => Sink<R2, InErr2, In2, OutErr3, L2, Z2>
): Sink<
  R & R1 & R2,
  InErr & InErr1 & InErr2,
  In1 & In2,
  OutErr2 | OutErr3,
  L1 | L2,
  Z1 | Z2
> {
  return new Sink(
    C.foldChannel_(
      C.doneCollect(self.channel),
      (_) => failure(_).channel,
      ({ tuple: [leftovers, z] }) =>
        C.suspend(() => {
          const leftoversRef = new AtomicReference(
            A.filter_(leftovers, (a): a is A.Chunk<L1 | L2> => !A.isEmpty(a))
          )
          const refReader = C.chain_(
            C.succeedWith(() => leftoversRef.getAndSet(A.empty())),
            (chunk) => C.writeChunk(chunk as unknown as A.Chunk<A.Chunk<In1 & In2>>)
          )
          const passthrough = C.identity<InErr2, A.Chunk<In1 & In2>, unknown>()
          const continationSink = C.zipRight_(refReader, passthrough)[">>>"](
            success(z).channel
          )

          return C.chain_(
            C.doneCollect(continationSink),
            ({ tuple: [newLeftovers, z1] }) =>
              C.zipRight_(
                C.chain_(
                  C.succeedWith(() => leftoversRef.get),
                  (_) => C.writeChunk(_)
                ),
                C.as_(C.writeChunk(newLeftovers), z1)
              )
          )
        })
    )
  )
}

/**
 *
 * @ets_data_first foldEff_
 */
export function foldEff<
  R1,
  R2,
  InErr1,
  InErr2,
  In,
  In1 extends In,
  In2 extends In,
  OutErr,
  OutErr2,
  OutErr3,
  L,
  L1 extends L,
  L2 extends L,
  Z,
  Z1,
  Z2
>(
  failure: (err: OutErr) => Sink<R1, InErr1, In1, OutErr2, L1, Z1>,
  success: (z: Z) => Sink<R2, InErr2, In2, OutErr3, L2, Z2>
) {
  return <R, InErr>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    foldEff_(self, failure, success)
}

/**
 * A sink that always fails with the specified error.
 */
export function fail<E>(e: E): Sink<unknown, unknown, unknown, E, never, never> {
  return new Sink(C.fail(e))
}

export function exposeLeftover<R, InErr, In, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>
): Sink<R, InErr, In, OutErr, unknown, Tp.Tuple<[Z, A.Chunk<L>]>> {
  return new Sink(
    C.map_(C.doneCollect(self.channel), ({ tuple: [chunks, z] }) =>
      Tp.tuple(z, A.flatten(chunks))
    )
  )
}

/**
 * Creates a single-value sink produced from an effect
 */
export function fromEffect<R, E, Z>(
  b: T.Effect<R, E, Z>
): Sink<R, unknown, unknown, E, unknown, Z> {
  return new Sink(C.fromEffect(b))
}

/**
 * Like `zip`, but keeps only the result from this sink.
 */
export function zipRight_<
  R,
  R1,
  InErr,
  InErr1,
  In,
  In1 extends In,
  OutErr,
  OutErr1,
  L,
  L1 extends L,
  Z,
  Z1
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  that: Sink<R1, InErr1, In1, OutErr1, L1, Z1>
): Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z1> {
  return zipWith_(self, that, (_, z1) => z1)
}

/**
 * Like `zip`, but keeps only the result from this sink.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z1>(
  that: Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    zipRight_(self, that)
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, finally combining the two results with `f`.
 */
export function zipWith_<
  R,
  R1,
  InErr,
  InErr1,
  In,
  In1 extends In,
  OutErr,
  OutErr1,
  L,
  L1 extends L,
  Z,
  Z1,
  Z2
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  that: Sink<R1, InErr1, In1, OutErr1, L1, Z1>,
  f: (z: Z, z1: Z1) => Z2
): Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z2> {
  return chain_(self, (z) => map_(that, (_) => f(z, _)))
}

/**
 * Feeds inputs to this sink until it yields a result, then switches over to the
 * provided sink until it yields a result, finally combining the two results with `f`.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<
  R1,
  InErr1,
  In,
  In1 extends In,
  OutErr1,
  L,
  L1 extends L,
  Z,
  Z1,
  Z2
>(that: Sink<R1, InErr1, In1, OutErr1, L1, Z1>, f: (z: Z, z1: Z1) => Z2) {
  return <R, InErr, OutErr>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    zipWith_(self, that, f)
}

/**
 * Transforms this sink's result.
 */
export function map_<R, InErr, In, OutErr, L, Z, Z1>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => Z1
): Sink<R, InErr, In, OutErr, L, Z1> {
  return new Sink(C.map_(self.channel, f))
}

/**
 * Transforms this sink's result.
 *
 * @ets_data_first map_
 */
export function map<Z, Z1>(f: (z: Z) => Z1) {
  return <R, InErr, In, OutErr, L>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    map_(self, f)
}

/**
 * A sink that collects first `n` elements into a chunk. Note that the chunk
 * is preallocated and must fit in memory.
 */
export function collectAllN<Err, In>(
  n: number
): Sink<unknown, Err, In, Err, In, A.Chunk<In>> {
  return pipe(
    fromEffect(T.succeedWith(() => A.builder<In>())),
    chain((cb) =>
      foldUntil<Err, In, A.ChunkBuilder<In>>(cb, n, (s, in_) => s.append(in_))
    ),
    map((_) => _.build())
  )
}

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S` until `max` elements have been folded.
 *
 * Like `foldWeighted`, but with a constant cost function of 1.
 */
export function foldUntil<Err, In, S>(
  z: S,
  max: number,
  f: (s: S, in_: In) => S
): Sink<unknown, Err, In, Err, In, S> {
  return map_(
    fold<Err, In, Tp.Tuple<[S, number]>>(
      Tp.tuple(z, 0),
      (_) => Tp.get_(_, 1) < max,
      ({ tuple: [o, count] }, i) => Tp.tuple(f(o, i), count + 1)
    ),
    Tp.get(0)
  )
}

/**
 * A sink that folds its inputs with the provided function, termination predicate and initial state.
 */
export function fold<Err, In, S>(
  z: S,
  contFn: Predicate<S>,
  f: (s: S, in_: In) => S
): Sink<unknown, Err, In, Err, In, S> {
  const foldChunkSplit = (
    z: S,
    chunk: A.Chunk<In>,
    contFn: Predicate<S>,
    f: (s: S, in_: In) => S
  ) => {
    const fold = (
      s: S,
      chunk: A.Chunk<In>,
      idx: number,
      len: number
    ): Tp.Tuple<[S, A.Chunk<In>]> => {
      if (idx === len) {
        return Tp.tuple(s, A.empty<In>())
      } else {
        const s1 = f(s, A.unsafeGet_(chunk, idx))

        if (contFn(s1)) {
          return fold(s1, chunk, idx + 1, len)
        } else {
          return Tp.tuple(s1, A.drop_(chunk, idx + 1))
        }
      }
    }

    return fold(z, chunk, 0, A.size(chunk))
  }

  const reader = (
    s: S
  ): C.Channel<unknown, Err, A.Chunk<In>, unknown, Err, A.Chunk<In>, S> => {
    if (!contFn(s)) {
      return C.end(s)
    }

    return C.readWith(
      (in_) => {
        const {
          tuple: [nextS, leftovers]
        } = foldChunkSplit(s, in_, contFn, f)

        if (!A.isEmpty(leftovers)) {
          return C.as_(C.write(leftovers), nextS)
        } else {
          return reader(nextS)
        }
      },
      (err) => C.fail(err),
      (_) => C.end(s)
    )
  }

  return new Sink(reader(z))
}
