// ets_tracing: off

import "../../../Operator"

import * as CS from "../../../Cause"
import * as CL from "../../../Clock"
import * as A from "../../../Collections/Immutable/Chunk"
import * as HM from "../../../Collections/Immutable/HashMap"
import * as HS from "../../../Collections/Immutable/HashSet"
import * as L from "../../../Collections/Immutable/List"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import type { Predicate, Refinement } from "../../../Function"
import { pipe } from "../../../Function"
import type * as M from "../../../Managed"
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
 * Transforms both inputs and result of this sink using the provided functions.
 */
export function dimap_<R, InErr, In, In1, OutErr, L, Z, Z1>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: In1) => In,
  g: (z: Z) => Z1
): Sink<R, InErr, In1, OutErr, L, Z1> {
  return map_(contramap_(self, f), g)
}

/**
 * Transforms both inputs and result of this sink using the provided functions.
 *
 * @ets_data_first dimap_
 */
export function dimap<In, In1, Z, Z1>(f: (in_: In1) => In, g: (z: Z) => Z1) {
  return <R, InErr, OutErr, L>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    dimap_(self, f, g)
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 */
export function dimapChunks_<R, InErr, In, In1, OutErr, L, Z, Z1>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: A.Chunk<In1>) => A.Chunk<In>,
  g: (z: Z) => Z1
): Sink<R, InErr, In1, OutErr, L, Z1> {
  return map_(contramapChunks_(self, f), g)
}

/**
 * Transforms both input chunks and result of this sink using the provided functions.
 *
 * @ets_data_first dimapChunks_
 */
export function dimapChunks<In, In1, Z, Z1>(
  f: (in_: A.Chunk<In1>) => A.Chunk<In>,
  g: (z: Z) => Z1
) {
  return <R, InErr, OutErr, L>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    dimapChunks_(self, f, g)
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 */
export function dimapChunksEff_<
  R,
  R1,
  R2,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr,
  OutErr1,
  L,
  Z,
  Z1
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: A.Chunk<In1>) => T.Effect<R1, InErr1, A.Chunk<In>>,
  g: (z: Z) => T.Effect<R2, OutErr1, Z1>
): Sink<R1 & R & R2, InErr & InErr1, In1, OutErr | OutErr1, L, Z1> {
  return mapEff_(contramapChunksEff_(self, f), g)
}

/**
 * Effectfully transforms both input chunks and result of this sink using the provided functions.
 * `f` and `g` must preserve chunking-invariance
 *
 * @ets_data_first dimapChunksEff_
 */
export function dimapChunksEff<
  R1,
  R2,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr1,
  Z,
  Z1
>(
  f: (in_: A.Chunk<In1>) => T.Effect<R1, InErr1, A.Chunk<In>>,
  g: (z: Z) => T.Effect<R2, OutErr1, Z1>
) {
  return <R, OutErr, L>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    dimapChunksEff_(self, f, g)
}

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 */
export function dimapEff_<
  R,
  R1,
  R2,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr,
  OutErr1,
  L,
  Z,
  Z1
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (in_: In1) => T.Effect<R1, InErr1, In>,
  g: (z: Z) => T.Effect<R2, OutErr1, Z1>
): Sink<R1 & R & R2, InErr & InErr1, In1, OutErr | OutErr1, L, Z1> {
  return mapEff_(contramapEff_(self, f), g)
}

/**
 * Effectfully transforms both inputs and result of this sink using the provided functions.
 *
 * @ets_data_first dimapEff_
 */
export function dimapEff<R1, R2, InErr, InErr1 extends InErr, In, In1, OutErr1, Z, Z1>(
  f: (in_: In1) => T.Effect<R1, InErr1, In>,
  g: (z: Z) => T.Effect<R2, OutErr1, Z1>
) {
  return <R, OutErr, L>(self: Sink<R, InErr, In, OutErr, L, Z>) => dimapEff_(self, f, g)
}

export function filterInput_<
  R,
  InErr,
  In,
  In1 extends In,
  In2 extends In1,
  OutErr,
  L,
  Z
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  p: Refinement<In1, In2>
): Sink<R, InErr, In2, OutErr, L, Z>
export function filterInput_<R, InErr, In, In1 extends In, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  p: Predicate<In1>
): Sink<R, InErr, In1, OutErr, L, Z>
export function filterInput_<R, InErr, In, In1 extends In, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  p: Predicate<In1>
): Sink<R, InErr, In1, OutErr, L, Z> {
  return contramapChunks_(self, A.filter(p))
}

/**
 * @ets_data_first filterInput_
 */
export function filterInput<In, In1 extends In, In2 extends In1>(
  p: Refinement<In1, In2>
): <R, InErr, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>
) => Sink<R, InErr, In2, OutErr, L, Z>
export function filterInput<In, In1 extends In>(
  p: Predicate<In1>
): <R, InErr, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>
) => Sink<R, InErr, In1, OutErr, L, Z>
export function filterInput<In, In1 extends In>(
  p: Predicate<In1>
): <R, InErr, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>
) => Sink<R, InErr, In1, OutErr, L, Z> {
  return <R, InErr, OutErr, L, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    filterInput_(self, p)
}

export function filterInputEff_<
  R,
  R1,
  InErr,
  InErr1 extends InErr,
  In,
  In1 extends In,
  OutErr,
  L,
  Z
>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  p: (in_: In1) => T.Effect<R1, InErr1, boolean>
): Sink<R1 & R, InErr & InErr1, In1, OutErr, L, Z> {
  return contramapChunksEff_(self, A.filterM(p))
}

/**
 * @ets_data_first filterInputEff_
 */
export function filterInputEff<R1, InErr, InErr1 extends InErr, In, In1 extends In>(
  p: (in_: In1) => T.Effect<R1, InErr1, boolean>
) {
  return <R, OutErr, L, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    filterInputEff_(self, p)
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
  return foldSink_(self, (_) => fail(_), f)
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

export function foldSink_<
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
 * @ets_data_first foldSink_
 */
export function foldSink<
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
    foldSink_(self, failure, success)
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
 * Transforms the errors emitted by this sink using `f`.
 */
export function mapError_<R, InErr, In, OutErr, OutErr1, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (err: OutErr) => OutErr1
): Sink<R, InErr, In, OutErr1, L, Z> {
  return new Sink(C.mapError_(self.channel, f))
}

/**
 * Transforms the errors emitted by this sink using `f`.
 *
 * @ets_data_first mapError_
 */
export function mapError<OutErr, OutErr1>(f: (err: OutErr) => OutErr1) {
  return <R, InErr, In, L, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    mapError_(self, f)
}

/**
 * Effectfully transforms this sink's result.
 */
export function mapEff_<R, R1, InErr, In, OutErr, OutErr1, L, Z, Z1>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  f: (z: Z) => T.Effect<R1, OutErr1, Z1>
): Sink<R & R1, InErr, In, OutErr | OutErr1, L, Z1> {
  return new Sink(C.mapEff_(self.channel, f))
}

/**
 * Effectfully transforms this sink's result.
 *
 * @ets_data_first mapEff_
 */
export function mapEff<R1, OutErr1, Z, Z1>(f: (z: Z) => T.Effect<R1, OutErr1, Z1>) {
  return <R, InErr, In, OutErr, L>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    mapEff_(self, f)
}

// TODO: race -> Missing raceBoth

// TODO: raceBoth -> Not implemented

/**
 * Returns the sink that executes this one and times its execution.
 */
export function timed<R, InErr, In, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>
): Sink<CL.HasClock & R, InErr, In, OutErr, L, Tp.Tuple<[Z, number]>> {
  return summarized_(self, CL.currentTime, (start, end) => end - start)
}

export function repeat<R, InErr, In, OutErr, L extends In, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>
): Sink<R, InErr, In, OutErr, L, A.Chunk<Z>> {
  return collectAllWhileWith_(
    self,
    A.empty<Z>(),
    (_) => true,
    (s, z) => A.append_(s, z)
  )
}

/**
 * Summarize a sink by running an effect when the sink starts and again when it completes
 */
export function summarized_<R, R1, E1, InErr, In, OutErr, L, Z, B, C>(
  self: Sink<R, InErr, In, OutErr, L, Z>,
  summary: T.Effect<R1, E1, B>,
  f: (b1: B, b2: B) => C
): Sink<R1 & R, InErr, In, E1 | OutErr, L, Tp.Tuple<[Z, C]>> {
  return new Sink(
    pipe(
      C.do,
      C.bind("start", () => C.fromEffect(summary)),
      C.bind("done", () => self.channel),
      C.bind("end", () => C.fromEffect(summary)),
      C.map(({ done, end, start }) => Tp.tuple(done, f(start, end)))
    )
  )
}

/**
 * Summarize a sink by running an effect when the sink starts and again when it completes
 * @ets_data_first summarized_
 */
export function summarized<R1, E1, B, C>(
  summary: T.Effect<R1, E1, B>,
  f: (b1: B, b2: B) => C
) {
  return <R, InErr, In, OutErr, L, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    summarized_(self, summary, f)
}

export function orElse_<
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
): Sink<R & R1, InErr & InErr1, In1, OutErr | OutErr1, L, Z | Z1> {
  return new Sink(C.orElse_(self.channel, that.channel))
}

/**
 * @ets_data_first orElse_
 */
export function orElse<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z1>(
  that: Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    orElse_(self, that)
}

export function zip_<
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
): Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Tp.Tuple<[Z, Z1]>> {
  return zipWith_(self, that, (a, b) => Tp.tuple(a, b))
}

/**
 * @ets_data_first zip_
 */
export function zip<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z1>(
  that: Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    zip_(self, that)
}

/**
 * Like `zip`, but keeps only the result from the `that` sink.
 */
export function zipLeft_<
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
): Sink<R & R1, InErr & InErr1, In & In1, OutErr | OutErr1, L1, Z> {
  return zipWith_(self, that, (z, _) => z)
}

/**
 * Like `zip`, but keeps only the result from `that sink.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<R1, InErr1, In, In1 extends In, OutErr1, L, L1 extends L, Z1>(
  that: Sink<R1, InErr1, In1, OutErr1, L1, Z1>
) {
  return <R, InErr, OutErr, Z>(self: Sink<R, InErr, In, OutErr, L, Z>) =>
    zipLeft_(self, that)
}

// TODO: zipPar -> Missing zipWithPar
// TODO: zipParLeft -> Missing zipWithPar
// TODO: zipParRight -> Missing zipWithPar
// TODO: zipWithPar -> Not implemented

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

export function exposeLeftover<R, InErr, In, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>
): Sink<R, InErr, In, OutErr, unknown, Tp.Tuple<[Z, A.Chunk<L>]>> {
  return new Sink(
    C.map_(C.doneCollect(self.channel), ({ tuple: [chunks, z] }) =>
      Tp.tuple(z, A.flatten(chunks))
    )
  )
}

export function dropLeftover<R, InErr, In, OutErr, L, Z>(
  self: Sink<R, InErr, In, OutErr, L, Z>
): Sink<R, InErr, In, OutErr, unknown, Z> {
  return new Sink(C.drain(self.channel))
}

// TODO: untilOutputEff_ -> Not implemented

export function accessSink<R, InErr, In, OutErr, L, Z>(
  f: (r: R) => Sink<R, InErr, In, OutErr, L, Z>
): Sink<R, InErr, In, OutErr, L, Z> {
  return new Sink(C.unwrap(T.access((_: R) => f(_).channel)))
}

/**
 * A sink that collects all of its inputs into a chunk.
 */
export function collectAll<Err, A>() {
  return new Sink(collectLoop<Err, A>(A.empty()))
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
 * A sink that collects all of its inputs into a map. The keys are extracted from inputs
 * using the keying function `key`; if multiple inputs use the same key, they are merged
 * using the `f` function.
 */
export function collectAllToMap<Err, In, K>(
  key: (in_: In) => K,
  f: (in1: In, in2: In) => In
): Sink<unknown, Err, In, Err, unknown, HM.HashMap<K, In>> {
  return foldLeftChunks<Err, In, HM.HashMap<K, In>>(HM.make(), (acc, as) =>
    A.reduce_(as, acc, (acc, a) => {
      const k = key(a)

      if (HM.has_(acc, k)) {
        return HM.update_(acc, k, (v) => f(v, a))
      } else {
        return HM.set_(acc, k, a)
      }
    })
  )
}

/**
 * A sink that collects first `n` keys into a map. The keys are calculated
 * from inputs using the keying function `key`; if multiple inputs use the
 * the same key, they are merged using the `f` function.
 */
export function collectAllToMapN<Err, In, K>(
  n: number,
  key: (in_: In) => K,
  f: (in1: In, in2: In) => In
): Sink<unknown, Err, In, Err, In, HM.HashMap<K, In>> {
  return foldWeighted<Err, In, HM.HashMap<K, In>>(
    HM.make(),
    (acc, in_) => (HM.has_(acc, key(in_)) ? 0 : 1),
    n,
    (acc, in_) => {
      const k = key(in_)

      if (HM.has_(acc, k)) {
        return HM.update_(acc, k, (v) => f(v, in_))
      } else {
        return HM.set_(acc, k, in_)
      }
    }
  )
}

/**
 * A sink that collects all of its inputs into a set.
 */
export function collectAllToSet<Err, In>(): Sink<
  unknown,
  Err,
  In,
  Err,
  unknown,
  HS.HashSet<In>
> {
  return foldLeftChunks<Err, In, HS.HashSet<In>>(HS.make(), (acc, as) =>
    A.reduce_(as, acc, (s, a) => HS.add_(s, a))
  )
}

/**
 * A sink that collects first `n` distinct inputs into a set.
 */
export function collectAllToSetN<Err, In>(
  n: number
): Sink<unknown, Err, In, Err, In, HS.HashSet<In>> {
  return foldWeighted<Err, In, HS.HashSet<In>>(
    HS.make(),
    (acc, in_) => (HS.has_(acc, in_) ? 0 : 1),
    n,
    (s, a) => HS.add_(s, a)
  )
}

/**
 * Accumulates incoming elements into a chunk as long as they verify predicate `p`.
 */
export function collectAllWhile<Err, In>(
  p: Predicate<In>
): Sink<unknown, Err, In, Err, In, A.Chunk<In>> {
  return pipe(
    fold<Err, In, Tp.Tuple<[L.List<In>, boolean]>>(
      Tp.tuple(L.empty(), true),
      Tp.get(1),
      ({ tuple: [as, _] }, a) => {
        if (p(a)) {
          return Tp.tuple(L.prepend_(as, a), true)
        } else {
          return Tp.tuple(as, false)
        }
      }
    ),
    map(({ tuple: [is, _] }) => A.from(L.reverse(is)))
  )
}

/**
 * Accumulates incoming elements into a chunk as long as they verify effectful predicate `p`.
 */
export function collectAllWhileEff<Env, Err, In>(
  p: (in_: In) => T.Effect<Env, Err, boolean>
): Sink<Env, Err, In, Err, In, A.Chunk<In>> {
  return pipe(
    foldEff<Env, Err, In, Tp.Tuple<[L.List<In>, boolean]>>(
      Tp.tuple(L.empty(), true),
      Tp.get(1),
      ({ tuple: [as, _] }, a) =>
        T.map_(p(a), (_) => {
          if (_) {
            return Tp.tuple(L.prepend_(as, a), true)
          } else {
            return Tp.tuple(as, false)
          }
        })
    ),
    map(({ tuple: [is, _] }) => A.from(L.reverse(is)))
  )
}

/**
 * A sink that counts the number of elements fed to it.
 */
export function count<Err>() {
  return foldLeft<Err, unknown, number>(0, (s, _) => s + 1)
}

/**
 * Creates a sink halting with the specified `Throwable`.
 */
export function die<E>(e: E): Sink<unknown, unknown, unknown, never, unknown, never> {
  return failCause(CS.die(e))
}

/**
 * Creates a sink halting with the specified message, wrapped in a
 * `RuntimeException`.
 */
export function dieMessage(
  message: string
): Sink<unknown, unknown, unknown, never, unknown, never> {
  return failCause(CS.die(new CS.RuntimeError(message)))
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
 * Returns a lazily constructed sink that may require effects for its creation.
 */
export function suspend<R, InErr, In, OutErr, L, Z>(
  f: () => Sink<R, InErr, In, OutErr, L, Z>
): Sink<R, InErr, In, OutErr, L, Z> {
  return new Sink(C.suspend(() => f().channel))
}

/**
 * Returns a sink that executes a total effect and ends with its result.
 */
export function succeedWith<A>(
  effect: () => A
): Sink<unknown, unknown, unknown, never, unknown, A> {
  return new Sink(C.succeedWith(effect))
}

/**
 * A sink that always fails with the specified error.
 */
export function fail<E>(e: E): Sink<unknown, unknown, unknown, E, never, never> {
  return new Sink(C.fail(e))
}

/**
 * Creates a sink halting with a specified cause.
 */
export function failCause<E>(
  e: CS.Cause<E>
): Sink<unknown, unknown, unknown, E, unknown, never> {
  return new Sink(C.failCause(e))
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

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function foldChunks<Err, In, S>(
  z: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: A.Chunk<In>) => S
): Sink<unknown, Err, In, Err, unknown, S> {
  const reader = (s: S): C.Channel<unknown, Err, A.Chunk<In>, unknown, Err, never, S> =>
    C.readWith(
      (in_) => {
        const nextS = f(s, in_)

        return contFn(nextS) ? reader(nextS) : C.end(nextS)
      },
      (err) => C.fail(err),
      (_) => C.end(s)
    )

  return new Sink(contFn(z) ? reader(z) : C.end(z))
}

/**
 * A sink that effectfully folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export function foldChunksEff<Env, Err, In, S>(
  z: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: A.Chunk<In>) => T.Effect<Env, Err, S>
): Sink<Env, Err, In, Err, unknown, S> {
  const reader = (s: S): C.Channel<Env, Err, A.Chunk<In>, unknown, Err, never, S> =>
    C.readWith(
      (in_) =>
        C.chain_(C.fromEffect(f(s, in_)), (nextS) => {
          if (contFn(nextS)) {
            return reader(nextS)
          } else {
            return C.end(nextS)
          }
        }),
      (err) => C.fail(err),
      (_) => C.end(s)
    )

  return new Sink(contFn(z) ? reader(z) : C.end(z))
}

/**
 * A sink that folds its inputs with the provided function and initial state.
 */
export function foldLeft<Err, In, S>(
  z: S,
  f: (s: S, in_: In) => S
): Sink<unknown, Err, In, Err, unknown, S> {
  return dropLeftover(fold<Err, In, S>(z, (_) => true, f))
}

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function foldLeftChunks<Err, In, S>(
  z: S,
  f: (s: S, chunk: A.Chunk<In>) => S
): Sink<unknown, Err, In, Err, unknown, S> {
  return foldChunks<Err, In, S>(z, (_) => true, f)
}

/**
 * A sink that effectfully folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export function foldLeftChunksEff<R, Err, In, S>(
  z: S,
  f: (s: S, chunk: A.Chunk<In>) => T.Effect<R, Err, S>
): Sink<R, Err, In, Err, unknown, S> {
  return dropLeftover(foldChunksEff<R, Err, In, S>(z, (_) => true, f))
}

/**
 * A sink that effectfully folds its inputs with the provided function and initial state.
 */
export function foldLeftEff<R, Err, In, S>(
  z: S,
  f: (s: S, in_: In) => T.Effect<R, Err, S>
): Sink<R, Err, In, Err, In, S> {
  return foldEff<R, Err, In, S>(z, (_) => true, f)
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
 * Creates a sink that effectfully folds elements of type `In` into a structure
 * of type `S` until `max` elements have been folded.
 *
 * Like `foldWeightedM`, but with a constant cost function of 1.
 */
export function foldUntilEff<Env, In, Err, S>(
  z: S,
  max: number,
  f: (s: S, in_: In) => T.Effect<Env, Err, S>
): Sink<Env, Err, In, Err, In, S> {
  return pipe(
    foldEff<Env, Err, In, Tp.Tuple<[S, number]>>(
      Tp.tuple(z, 0),
      ({ tuple: [_, a] }) => a < max,
      ({ tuple: [o, count] }, i) => T.map_(f(o, i), (_) => Tp.tuple(_, count + 1))
    ),
    map(Tp.get(0))
  )
}

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * @note Elements that have an individual cost larger than `max` will
 * force the sink to cross the `max` cost. See `foldWeightedDecompose`
 * for a variant that can handle these cases.
 */
export function foldWeighted<Err, In, S>(
  z: S,
  costFn: (s: S, in_: In) => number,
  max: number,
  f: (s: S, in_: In) => S
): Sink<unknown, Err, In, Err, In, S> {
  return foldWeightedDecompose<Err, In, S>(z, costFn, max, (_) => A.single(_), f)
}

/**
 * Creates a sink that folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`)
 * have been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `S` aggregate to cross `max` into smaller elements.
 * Be vigilant with this function, it has to generate "simpler" values
 * or the fold may never end. A value is considered indivisible if
 * `decompose` yields the empty chunk or a single-valued chunk. In
 * these cases, there is no other choice than to yield a value that
 * will cross the threshold.
 *
 * The `foldWeightedDecomposeM` allows the decompose function
 * to return an `Effect` value, and consequently it allows the sink
 * to fail.
 */
export function foldWeightedDecompose<Err, In, S>(
  z: S,
  costFn: (s: S, in_: In) => number,
  max: number,
  decompose: (in_: In) => A.Chunk<In>,
  f: (s: S, in_: In) => S
): Sink<unknown, Err, In, Err, In, S> {
  const go = (
    s: S,
    cost: number,
    dirty: boolean
  ): C.Channel<unknown, Err, A.Chunk<In>, unknown, Err, A.Chunk<In>, S> =>
    C.readWith(
      (in_) => {
        const fold = (
          in_: A.Chunk<In>,
          s: S,
          dirty: boolean,
          cost: number,
          idx: number
        ): Tp.Tuple<[S, number, boolean, A.Chunk<In>]> => {
          if (idx === A.size(in_)) {
            return Tp.tuple(s, cost, dirty, A.empty())
          } else {
            const elem = A.unsafeGet_(in_, idx)
            const total = cost + costFn(s, elem)

            if (total <= max) {
              return fold(in_, f(s, elem), true, total, idx + 1)
            } else {
              const decomposed = decompose(elem)

              if (A.size(decomposed) <= 1 && !dirty) {
                return Tp.tuple(f(s, elem), total, true, A.drop_(in_, idx + 1))
              } else if (A.size(in_) <= 1 && dirty) {
                return Tp.tuple(s, cost, dirty, A.drop_(in_, idx))
              } else {
                return fold(
                  A.concat_(decomposed, A.drop_(in_, idx + 1)),
                  s,
                  dirty,
                  cost,
                  0
                )
              }
            }
          }
        }

        const {
          tuple: [nextS, nextCost, nextDirty, leftovers]
        } = fold(in_, s, dirty, cost, 0)

        if (!A.isEmpty(leftovers)) {
          return C.zipRight_(C.write(leftovers), C.end(nextS))
        } else if (cost > max) {
          return C.end(nextS)
        } else {
          return go(nextS, nextCost, nextDirty)
        }
      },
      (err) => C.fail(err),
      (_) => C.end(s)
    )

  return new Sink(go(z, 0, false))
}

/**
 * Creates a sink that effectfully folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`) have
 * been folded.
 *
 * The `decompose` function will be used for decomposing elements that
 * cause an `S` aggregate to cross `max` into smaller elements. Be vigilant with
 * this function, it has to generate "simpler" values or the fold may never end.
 * A value is considered indivisible if `decompose` yields the empty chunk or a
 * single-valued chunk. In these cases, there is no other choice than to yield
 * a value that will cross the threshold.
 *
 * See `foldWeightedDecompose` for an example.
 */
export function foldWeightedDecomposeEff<Env, Env1, Env2, Err, Err1, Err2, In, S>(
  z: S,
  costFn: (s: S, in_: In) => T.Effect<Env, Err, number>,
  max: number,
  decompose: (in_: In) => T.Effect<Env1, Err1, A.Chunk<In>>,
  f: (s: S, in_: In) => T.Effect<Env2, Err2, S>
): Sink<Env & Env1 & Env2, Err, In, Err | Err1 | Err2, In, S> {
  const go = (
    s: S,
    cost: number,
    dirty: boolean
  ): C.Channel<
    Env & Env1 & Env2,
    Err,
    A.Chunk<In>,
    unknown,
    Err | Err1 | Err2,
    A.Chunk<In>,
    S
  > =>
    C.readWith(
      (in_) => {
        const fold = (
          in_: A.Chunk<In>,
          s: S,
          dirty: boolean,
          cost: number,
          idx: number
        ): T.Effect<
          Env & Env1 & Env2,
          Err | Err1 | Err2,
          Tp.Tuple<[S, number, boolean, A.Chunk<In>]>
        > => {
          if (idx === A.size(in_)) {
            return T.succeed(Tp.tuple(s, cost, dirty, A.empty()))
          } else {
            const elem = A.unsafeGet_(in_, idx)

            return pipe(
              costFn(s, elem),
              T.map((_) => cost + _),
              T.chain((total) => {
                if (total <= max) {
                  return T.chain_(f(s, elem), (_) => fold(in_, _, true, total, idx + 1))
                } else {
                  return T.chain_(decompose(elem), (decomposed) => {
                    if (A.size(decomposed) <= 1 && !dirty) {
                      return T.map_(f(s, elem), (_) =>
                        Tp.tuple(_, total, true, A.drop_(in_, idx + 1))
                      )
                    } else if (A.size(decomposed) <= 1 && dirty) {
                      return T.succeed(Tp.tuple(s, cost, dirty, A.drop_(in_, idx)))
                    } else {
                      return fold(
                        A.concat_(decomposed, A.drop_(in_, idx + 1)),
                        s,
                        dirty,
                        cost,
                        0
                      )
                    }
                  })
                }
              })
            )
          }
        }

        return pipe(
          C.fromEffect(fold(in_, s, dirty, cost, 0)),
          C.chain(({ tuple: [nextS, nextCost, nextDirty, leftovers] }) => {
            if (!A.isEmpty(leftovers)) {
              return C.zipRight_(C.write(leftovers), C.end(nextS))
            } else if (cost > max) {
              return C.end(nextS)
            } else {
              return go(nextS, nextCost, nextDirty)
            }
          })
        )
      },
      (err) => C.fail(err),
      (_) => C.end(s)
    )

  return new Sink(go(z, 0, false))
}

/**
 * Creates a sink that effectfully folds elements of type `In` into a structure
 * of type `S`, until `max` worth of elements (determined by the `costFn`) have
 * been folded.
 *
 * @note Elements that have an individual cost larger than `max` will
 * force the sink to cross the `max` cost. See `foldWeightedDecomposeM`
 * for a variant that can handle these cases.
 */
export function foldWeightedEff<Env, Err, In, S>(
  z: S,
  costFn: (s: S, in_: In) => T.Effect<Env, Err, number>,
  max: number,
  f: (s: S, in_: In) => T.Effect<Env, Err, S>
): Sink<Env, Err, In, Err, In, S> {
  return foldWeightedDecomposeEff(z, costFn, max, (i) => T.succeed(A.single(i)), f)
}

/**
 * A sink that effectfully folds its inputs with the provided function, termination predicate and initial state.
 */
export function foldEff<Env, Err, In, S>(
  z: S,
  contFn: (s: S) => boolean,
  f: (s: S, in_: In) => T.Effect<Env, Err, S>
): Sink<Env, Err, In, Err, In, S> {
  const foldChunkSplitM = (
    z: S,
    chunk: A.Chunk<In>,
    contFn: Predicate<S>,
    f: (s: S, in_: In) => T.Effect<Env, Err, S>
  ) => {
    const fold = (
      s: S,
      chunk: A.Chunk<In>,
      idx: number,
      len: number
    ): T.Effect<Env, Err, Tp.Tuple<[S, O.Option<A.Chunk<In>>]>> => {
      if (idx === len) {
        return T.succeed(Tp.tuple(s, O.none))
      } else {
        return T.chain_(f(s, A.unsafeGet_(chunk, idx)), (s1) => {
          if (contFn(s1)) {
            return fold(s1, chunk, idx + 1, len)
          } else {
            return T.succeed(Tp.tuple(s1, O.some(A.drop_(chunk, idx + 1))))
          }
        })
      }
    }

    return fold(z, chunk, 0, A.size(chunk))
  }

  const reader = (
    s: S
  ): C.Channel<Env, Err, A.Chunk<In>, unknown, Err, A.Chunk<In>, S> =>
    C.readWith(
      (in_: A.Chunk<In>) =>
        C.chain_(
          C.fromEffect(foldChunkSplitM(s, in_, contFn, f)),
          ({ tuple: [nextS, leftovers] }) =>
            O.fold_(
              leftovers,
              () => reader(nextS),
              (l) => C.as_(C.write(l), nextS)
            )
        ),
      (err: Err) => C.fail(err),
      (_) => C.end(s)
    )

  return new Sink(contFn(z) ? reader(z) : C.end(z))
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
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function forEachChunk<R, ErrIn, ErrOut, In, Z>(
  f: (c: A.Chunk<In>) => T.Effect<R, ErrOut, Z>
): Sink<R, ErrIn, In, ErrIn | ErrOut, unknown, void> {
  return forEachChunkWhile<R, ErrIn, ErrOut, In>((_) => T.as_(f(_), true))
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
 * Creates a single-value sink produced from an effect
 */
export function fromEffect<R, E, Z>(
  b: T.Effect<R, E, Z>
): Sink<R, unknown, unknown, E, unknown, Z> {
  return new Sink(C.fromEffect(b))
}

/**
 * Creates a sink containing the first value.
 */
export function head<Err, In>(): Sink<unknown, Err, In, Err, In, O.Option<In>> {
  return fold<Err, In, O.Option<In>>(O.none, O.isNone, (s, in_) =>
    O.fold_(
      s,
      () => O.some(in_),
      (_) => s
    )
  )
}

/**
 * Creates a sink containing the last value.
 */
export function last<Err, In>(): Sink<unknown, Err, In, Err, unknown, O.Option<In>> {
  return foldLeft<Err, In, O.Option<In>>(O.none, (_, in_) => O.some(in_))
}

export function leftover<L>(
  c: A.Chunk<L>
): Sink<unknown, unknown, unknown, never, L, void> {
  return new Sink(C.write(c))
}

export function mkString<Err>(): Sink<unknown, Err, unknown, Err, unknown, string> {
  return suspend(() => {
    const strings: string[] = []

    return pipe(
      foldLeftChunks<Err, unknown, void>(undefined, (_, els) =>
        A.forEach_(els, (el) => {
          strings.push(String(el))
        })
      ),
      map((_) => strings.join(""))
    )
  })
}

export function managed_<R, InErr, In, OutErr, A, L, Z>(
  resource: M.Managed<R, OutErr, A>,
  fn: (a: A) => Sink<R, InErr, In, OutErr, L, Z>
): Sink<R, InErr, In, OutErr, L, Z> {
  return new Sink(C.managed_(resource, (_) => fn(_).channel))
}

/**
 *
 * @ets_data_first managed_
 */
export function managed<R, InErr, In, OutErr, A, L, Z>(
  fn: (a: A) => Sink<R, InErr, In, OutErr, L, Z>
) {
  return (resource: M.Managed<R, OutErr, A>) => managed_(resource, fn)
}

/**
 * A sink that immediately ends with the specified value.
 */
export function succeed<Z>(z: Z): Sink<unknown, unknown, unknown, never, unknown, Z> {
  return new Sink(C.succeed(z))
}

/**
 * A sink that sums incoming numeric values.
 */
export function sum<Err>(): Sink<unknown, Err, number, Err, unknown, number> {
  return foldLeft<Err, number, number>(0, (a, b) => a + b)
}

/*
 * A sink that takes the specified number of values.
 */
export function take<Err, In>(n: number): Sink<unknown, Err, In, Err, In, A.Chunk<In>> {
  return pipe(
    foldChunks<Err, In, A.Chunk<In>>(
      A.empty(),
      (_) => A.size(_) < n,
      (a, b) => A.concat_(a, b)
    ),
    chain((acc) => {
      const {
        tuple: [taken, leftover]
      } = A.splitAt_(acc, n)

      return new Sink(C.zipRight_(C.write(leftover), C.end(taken)))
    })
  )
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
