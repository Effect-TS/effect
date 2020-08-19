import * as A from "../../Array"
import * as C from "../../Cause/core"
import * as E from "../../Either"
import * as Exit from "../../Exit/api"
import { pipe, identity, tuple } from "../../Function"
import { makeManagedReleaseMap } from "../../Managed/core"
import { coerceSE } from "../../Managed/deps"
import { noop } from "../../Managed/managed"
import { Finalizer, makeReleaseMap, ReleaseMap } from "../../Managed/releaseMap"
import * as NA from "../../NonEmptyArray"
import * as O from "../../Option"
import * as P from "../../Promise"
import { makeBounded } from "../../Queue"
import * as R from "../../Ref"
import { makeManagedRef } from "../../Ref/makeManagedRef"
import * as Semaphore from "../../Semaphore"
import * as BPull from "../BufferedPull"
import * as Pull from "../Pull"
import * as Sink from "../Sink"
import * as Take from "../Take"
import { Transducer } from "../Transducer"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { zipChunks_ } from "../_internal/utils"

/**
 * A `Stream<S, R, E, O>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `O`, may fail with errors of type `E`
 * and uses an environment of type `R` and can be sync or async `S`.
 * One way to think of `Stream` is as a `Effect` program that could emit multiple values.
 *
 * This data type can emit multiple `A` values through multiple calls to `next`.
 * Similarly, embedded inside every `Stream` is an Effect program: `Effect<S, R, Option<E>, A.Array<O>>`.
 * This program will be repeatedly evaluated as part of the stream execution. For
 * every evaluation, it will emit a chunk of values or end with an optional failure.
 * A failure of type `None` signals the end of the stream.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage buffers
 * between operators. As an optimization, `Stream` does not emit single values, but
 * rather an array of values. This allows the cost of effect evaluation to be
 * amortized.
 *
 * The last important attribute of `Stream` is resource management: it makes
 * heavy use of `Managed` to manage resources that are acquired
 * and released during the stream's lifetime.
 *
 * `Stream` forms a monad on its `O` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `Effect` (with some
 * adjustments for the multiple-valued nature of `Stream`). These aspects allow
 * for rich and expressive composition of streams.
 *
 * The current encoding of `Stream` is *not* safe for recursion. `Stream` programs
 * that are defined in terms of themselves will leak memory.
 *
 * Instead, recursive operators must be defined explicitly. See the definition of
 * `forever` for an example. This limitation will be lifted in the future.
 */
export class Stream<S, R, E, A> {
  readonly [T._U]: StreamURI;
  readonly [T._S]: () => S;
  readonly [T._E]: () => E;
  readonly [T._A]: () => A;
  readonly [T._R]: (_: R) => void

  constructor(
    readonly proc: M.Managed<S, R, never, T.Effect<S, R, O.Option<E>, A.Array<A>>>
  ) {}
}

export const StreamURI = "@matechs/core/Eff/StreamURI"
export type StreamURI = typeof StreamURI

/**
 * Type aliases
 */
export type Sync<A> = Stream<never, unknown, never, A>
export type SyncE<E, A> = Stream<never, unknown, E, A>
export type SyncR<R, A> = Stream<never, R, never, A>
export type SyncRE<R, E, A> = Stream<never, R, E, A>
export type Async<A> = Stream<unknown, unknown, never, A>
export type AsyncR<R, A> = Stream<unknown, R, never, A>
export type AsyncE<E, A> = Stream<unknown, unknown, E, A>
export type AsyncRE<R, E, A> = Stream<unknown, R, E, A>

/**
 * The default chunk size used by the various combinators and constructors of [[Stream]].
 */
export const DefaultChunkSize = 4096

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export const fromEffectOption = <S, R, E, A>(
  fa: T.Effect<S, R, O.Option<E>, A>
): Stream<S, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("doneRef", () => pipe(R.makeRef(false), T.toManaged())),
      M.let("pull", ({ doneRef }) =>
        pipe(
          doneRef,
          R.modify((b) =>
            b
              ? [Pull.end, true]
              : [
                  pipe(
                    fa,
                    T.map((a) => [a])
                  ),
                  true
                ]
          ),
          T.flatten
        )
      ),
      M.map(({ pull }) => pull)
    )
  )

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export const fromEffect = <S, R, E, A>(fa: T.Effect<S, R, E, A>): Stream<S, R, E, A> =>
  pipe(fa, T.mapError(O.some), fromEffectOption)

/**
 * Creates a stream from an array of values
 */
export const fromArray = <O>(c: A.Array<O>): Sync<O> =>
  new Stream(
    pipe(
      R.makeRef(false),
      T.map((doneRef) =>
        pipe(
          doneRef,
          R.modify((done): [T.SyncE<O.Option<never>, A.Array<O>>, boolean] =>
            done || c.length === 0 ? [Pull.end, true] : [T.succeedNow(c), true]
          ),
          T.flatten
        )
      ),
      T.toManaged()
    )
  )

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const runManaged = <S1, R1, E1, O, B>(
  sink: Sink.Sink<S1, R1, E1, O, any, B>
) => <S, R, E>(self: Stream<S, R, E, O>): M.Managed<S1 | S, R & R1, E1 | E, B> =>
  pipe(
    M.zip_(self.proc, sink.push),
    M.mapM(([pull, push]) => {
      const go: T.Effect<S1 | S, R1 & R, E1 | E, B> = T.foldCauseM_(
        pull,
        (c): T.Effect<S1, R1, E1 | E, B> =>
          pipe(
            C.sequenceCauseOption(c),
            O.fold(
              () =>
                T.foldCauseM_(
                  push(O.none),
                  (c) =>
                    pipe(
                      c,
                      C.map(([_]) => _),
                      C.sequenceCauseEither,
                      E.fold(T.halt, T.succeedNow)
                    ),
                  () => T.die("empty stream / empty sinks")
                ),
              T.halt
            )
          ),
        (os) =>
          T.foldCauseM_(
            push(O.some(os)),
            (c): T.Effect<never, unknown, E1, B> =>
              pipe(
                c,
                C.map(([_]) => _),
                C.sequenceCauseEither,
                E.fold(T.halt, T.succeedNow)
              ),
            () => go
          )
      )
      return go
    })
  )

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export const foreachManaged = <A, S1, R1, E1>(
  f: (i: A) => T.Effect<S1, R1, E1, any>
) => <S, R, E>(self: Stream<S, R, E, A>): M.Managed<S1 | S, R & R1, E1 | E, void> =>
  pipe(self, runManaged(Sink.foreach(f)))

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export const foreach = <A, S1, R1, E1>(f: (i: A) => T.Effect<S1, R1, E1, any>) => <
  S,
  R,
  E
>(
  self: Stream<S, R, E, A>
): T.Effect<S1 | S, R & R1, E1 | E, void> => pipe(self, run(Sink.foreach(f)))

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const run = <S1, R1, E1, O, B>(sink: Sink.Sink<S1, R1, E1, O, any, B>) => <
  S,
  R,
  E
>(
  self: Stream<S, R, E, O>
): T.Effect<S1 | S, R & R1, E1 | E, B> => pipe(self, runManaged(sink), M.useNow)

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runDrain = <S, R, E, O>(
  self: Stream<S, R, E, O>
): T.Effect<S, R, E, void> =>
  pipe(
    self,
    foreach((_) => T.unit)
  )

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runCollect = <S, R, E, O>(
  self: Stream<S, R, E, O>
): T.Effect<S, R, E, A.Array<O>> => pipe(self, run(Sink.collectAll<O>()))

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export const mapM = <O, S1, R1, E1, O1>(f: (o: O) => T.Effect<S1, R1, E1, O1>) => <
  S,
  R,
  E
>(
  self: Stream<S, R, E, O>
): Stream<S | S1, R & R1, E | E1, O1> =>
  new Stream<S | S1, R & R1, E | E1, O1>(
    pipe(
      self.proc,
      M.mapM(BPull.make),
      M.map((pull) =>
        pipe(
          pull,
          BPull.pullElements,
          T.chain((o) =>
            pipe(
              f(o),
              T.bimap(O.some, (o1) => [o1] as [O1])
            )
          )
        )
      )
    )
  )

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export const mapMPar = (n: number) => <O, S1, R1, E1, O1>(
  f: (o: O) => T.Effect<S1, R1, E1, O1>
) => <S, R, E>(self: Stream<S, R, E, O>): Stream<unknown, R & R1, E | E1, O1> =>
  new Stream(
    pipe(
      M.of,
      M.bind("out", () =>
        T.toManaged()(makeBounded<T.Effect<unknown, R1, O.Option<E1 | E>, O1>>(n))
      ),
      M.bind("errorSignal", () => T.toManaged()(P.make<E1, never>())),
      M.bind("permits", () => T.toManaged()(Semaphore.makeSemaphore(n))),
      M.tap(({ errorSignal, out, permits }) =>
        pipe(
          self,
          foreachManaged((a) =>
            pipe(
              T.of,
              T.bind("p", () => P.make<E1, O1>()),
              T.bind("latch", () => P.make<never, void>()),
              T.tap(({ p }) => out.offer(pipe(p, P.wait, T.mapError(O.some)))),
              T.tap(({ latch, p }) =>
                pipe(
                  latch,
                  // Make sure we start evaluation before moving on to the next element
                  P.succeed<void>(undefined),
                  T.chain(() =>
                    pipe(
                      errorSignal,
                      P.wait,
                      // Interrupt evaluation if another task fails
                      T.raceFirst(f(a)),
                      // Notify other tasks of a failure
                      T.tapCause((e) => pipe(errorSignal, P.halt(e))),
                      // Transfer the result to the consuming stream
                      T.toPromise(p)
                    )
                  ),
                  Semaphore.withPermit(permits),
                  T.fork
                )
              ),
              T.tap(({ latch }) => P.wait(latch)),
              T.asUnit
            )
          ),
          M.foldCauseM(
            (c) => T.toManaged()(out.offer(Pull.halt(c))),
            () =>
              pipe(
                Semaphore.withPermits(n)(permits)(T.unit),
                T.chain(() => out.offer(Pull.end)),
                T.toManaged()
              )
          ),
          M.fork
        )
      ),
      M.map(({ out }) =>
        pipe(
          out.take,
          T.flatten,
          T.map((o) => [o])
        )
      )
    )
  )

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export const chain = <O, O2, S1, R1, E1>(f0: (a: O) => Stream<S1, R1, E1, O2>) => <
  S,
  R,
  E
>(
  self: Stream<S, R, E, O>
): Stream<S | S1, R & R1, E | E1, O2> => {
  type S_ = S | S1
  type R_ = R & R1
  type E_ = E | E1

  return new Stream<S_, R_, E_, O2>(
    pipe(
      M.of,
      M.bind("outerStream", () => self.proc),
      M.bind("currOuterChunk", () =>
        T.toManaged()(
          R.makeRef<[A.Array<O>, number]>([[], 0])
        )
      ),
      M.bind("currInnerStream", () =>
        T.toManaged()(R.makeRef<T.Effect<S_, R_, O.Option<E_>, A.Array<O2>>>(Pull.end))
      ),
      M.bind(
        "innerFinalizer",
        () => M.finalizerRef(noop) as M.Managed<S_, R_, never, R.Ref<Finalizer>>
      ),
      M.map(({ currInnerStream, currOuterChunk, innerFinalizer, outerStream }) =>
        new Chain(
          f0,
          outerStream,
          currOuterChunk,
          currInnerStream,
          innerFinalizer
        ).apply()
      )
    )
  )
}

class Chain<S_, R_, E_, O, O2> {
  constructor(
    readonly f0: (a: O) => Stream<S_, R_, E_, O2>,
    readonly outerStream: T.Effect<S_, R_, O.Option<E_>, A.Array<O>>,
    readonly currOuterChunk: R.Ref<[A.Array<O>, number]>,
    readonly currInnerStream: R.Ref<T.Effect<S_, R_, O.Option<E_>, A.Array<O2>>>,
    readonly innerFinalizer: R.Ref<Finalizer>
  ) {
    this.apply = this.apply.bind(this)
    this.closeInner = this.closeInner.bind(this)
    this.pullNonEmpty = this.pullNonEmpty.bind(this)
    this.pullOuter = this.pullOuter.bind(this)
  }

  closeInner() {
    return pipe(
      this.innerFinalizer,
      R.getAndSet(noop),
      T.chain((f) => f(Exit.unit)),
      coerceSE<S_, O.Option<E_>>()
    )
  }

  pullNonEmpty<S, R, E, O>(
    pull: T.Effect<S, R, O.Option<E>, A.Array<O>>
  ): T.Effect<S, R, O.Option<E>, A.Array<O>> {
    return pipe(
      pull,
      T.chain((os) => (os.length > 0 ? T.succeedNow(os) : this.pullNonEmpty(pull)))
    )
  }

  pullOuter() {
    return pipe(
      this.currOuterChunk,
      R.modify(([chunk, nextIdx]): [
        T.Effect<S_, R_, O.Option<E_>, O>,
        [A.Array<O>, number]
      ] => {
        if (nextIdx < chunk.length) {
          return [T.succeedNow(chunk[nextIdx]), [chunk, nextIdx + 1]]
        } else {
          return [
            pipe(
              this.pullNonEmpty(this.outerStream),
              T.tap((os) => this.currOuterChunk.set([os, 1])),
              T.map((os) => os[0])
            ),
            [chunk, nextIdx]
          ]
        }
      }),
      T.flatten,
      T.chain((o) =>
        T.uninterruptibleMask(({ restore }) =>
          pipe(
            T.of,
            T.bind("releaseMap", () => makeReleaseMap),
            T.bind("pull", ({ releaseMap }) =>
              restore(
                pipe(
                  this.f0(o).proc.effect,
                  T.provideSome((_: R_) => [_, releaseMap] as [R_, ReleaseMap]),
                  T.map(([_, x]) => x)
                )
              )
            ),
            T.tap(({ pull }) => this.currInnerStream.set(pull)),
            T.tap(({ releaseMap }) =>
              this.innerFinalizer.set((e) => releaseMap.releaseAll(e, T.sequential))
            ),
            T.asUnit,
            coerceSE<S_, O.Option<E_>>()
          )
        )
      )
    )
  }

  apply(): T.Effect<S_, R_, O.Option<E_>, A.Array<O2>> {
    return pipe(
      this.currInnerStream.get,
      T.flatten,
      T.catchAllCause((c) =>
        pipe(
          c,
          C.sequenceCauseOption,
          O.fold(
            // The additional switch is needed to eagerly run the finalizer
            // *before* pulling another element from the outer stream.
            () =>
              pipe(
                this.closeInner(),
                T.chain(() => this.pullOuter()),
                T.chain(() =>
                  new Chain(
                    this.f0,
                    this.outerStream,
                    this.currOuterChunk,
                    this.currInnerStream,
                    this.innerFinalizer
                  ).apply()
                )
              ),
            Pull.halt
          )
        )
      )
    )
  }
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export const catchAllCause = <E, S1, R1, E2, O1>(
  f: (e: C.Cause<E>) => Stream<S1, R1, E2, O1>
) => <S, R, O>(self: Stream<S, R, E, O>): Stream<S1 | S, R & R1, E2, O1 | O> => {
  type NotStarted = { _tag: "NotStarted" }
  type Self<E0> = { _tag: "Self"; pull: Pull.Pull<S, R, E0, O> }
  type Other = { _tag: "Other"; pull: Pull.Pull<S1, R1, E2, O1> }
  type State<E0> = NotStarted | Self<E0> | Other

  return new Stream<S | S1, R & R1, E2, O | O1>(
    pipe(
      M.of,
      M.bind(
        "finalizerRef",
        () => M.finalizerRef(noop) as M.Managed<S, R, never, R.Ref<Finalizer>>
      ),
      M.bind("ref", () =>
        pipe(
          R.makeRef<State<E>>({ _tag: "NotStarted" }),
          T.toManaged()
        )
      ),
      M.let("pull", ({ finalizerRef, ref }) => {
        const closeCurrent = (cause: C.Cause<any>) =>
          pipe(
            finalizerRef,
            R.getAndSet(noop),
            T.chain((f) => f(Exit.halt(cause))),
            T.uninterruptible,
            coerceSE<S | S1, O.Option<E2>>()
          )

        const open = <S, R, E0, O>(stream: Stream<S, R, E0, O>) => (
          asState: (_: Pull.Pull<S, R, E0, O>) => State<E>
        ) =>
          T.uninterruptibleMask(({ restore }) =>
            pipe(
              makeReleaseMap,
              T.chain((releaseMap) =>
                pipe(
                  finalizerRef.set((exit) => releaseMap.releaseAll(exit, T.sequential)),
                  T.chain(() =>
                    pipe(
                      restore(coerceSE<S, O.Option<E0>>()(stream.proc.effect)),
                      T.provideSome((_: R) => [_, releaseMap] as [R, ReleaseMap]),
                      T.map(([_, __]) => __),
                      T.tap((pull) => ref.set(asState(pull)))
                    )
                  )
                )
              )
            )
          )

        const failover = (cause: C.Cause<O.Option<E>>) =>
          pipe(
            cause,
            C.sequenceCauseOption,
            O.fold(
              () => T.fail(O.none),
              (cause) =>
                pipe(
                  closeCurrent(cause),
                  T.chain(() => open(f(cause))((pull) => ({ _tag: "Other", pull }))),
                  T.flatten
                )
            )
          )

        return pipe(
          ref.get,
          T.chain((s) => {
            switch (s._tag) {
              case "NotStarted": {
                return pipe(
                  open(self)((pull) => ({ _tag: "Self", pull })),
                  T.flatten,
                  T.catchAllCause(failover)
                )
              }
              case "Self": {
                return pipe(s.pull, T.catchAllCause(failover))
              }
              case "Other": {
                return s.pull
              }
            }
          })
        )
      }),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `A` into elements of type `B`.
 */
export const aggregate = <S1, R1, E1, O, P>(
  transducer: Transducer<S1, R1, E1, O, P>
) => <S, R, E>(self: Stream<S, R, E, O>) =>
  new Stream<S | S1, R & R1, E | E1, P>(
    pipe(
      M.of,
      M.bind("pull", () => self.proc),
      M.bind("push", () => transducer.push),
      M.bind("done", () => makeManagedRef(false)),
      M.let("run", ({ done, pull, push }) =>
        pipe(
          done.get,
          T.chain((b) =>
            b
              ? Pull.end
              : pipe(
                  pull,
                  T.foldM(
                    O.fold(
                      () =>
                        pipe(
                          done.set(true),
                          T.chain(() => pipe(push(O.none), T.asSomeError))
                        ),
                      (e) => Pull.fail<E | E1>(e)
                    ),
                    (os) => pipe(push(O.some(os)), T.asSomeError)
                  )
                )
          )
        )
      ),
      M.map(({ run }) => run)
    )
  )

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export const effectAsyncMaybe = <R, E, A>(
  register: (
    cb: (next: T.Effect<unknown, R, O.Option<E>, A.Array<A>>) => Promise<boolean>
  ) => O.Option<Stream<unknown, R, E, A>>,
  outputBuffer = 16
): Stream<unknown, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("output", () =>
        pipe(makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())
      ),
      M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
      M.bind("maybeStream", ({ output, runtime }) =>
        M.effectTotal(() =>
          register((k) =>
            pipe(Take.fromPull(k), T.chain(output.offer), runtime.runPromise)
          )
        )
      ),
      M.bind("pull", ({ maybeStream, output }) =>
        O.fold_(
          maybeStream,
          () =>
            pipe(
              M.of,
              M.bind("done", () => R.makeManagedRef(false)),
              M.map(({ done }) =>
                pipe(
                  done.get,
                  T.chain((b) =>
                    b
                      ? Pull.end
                      : pipe(
                          output.take,
                          T.chain(Take.done),
                          T.onError(() =>
                            pipe(
                              done.set(true),
                              T.chain(() => output.shutdown)
                            )
                          )
                        )
                  )
                )
              )
            ),
          (s) =>
            pipe(
              output.shutdown,
              T.toManaged(),
              M.chain(() => s.proc)
            )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export const effectAsync = <R, E, A>(
  register: (
    cb: (next: T.Effect<unknown, R, O.Option<E>, A.Array<A>>) => Promise<boolean>
  ) => void,
  outputBuffer = 16
): Stream<unknown, R, E, A> =>
  effectAsyncMaybe((cb) => {
    register(cb)
    return O.none
  }, outputBuffer)

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export const effectAsyncInterruptEither = <R, E, A>(
  register: (
    cb: (next: T.Effect<unknown, R, O.Option<E>, A.Array<A>>) => Promise<boolean>
  ) => E.Either<T.Canceler<R>, Stream<unknown, R, E, A>>,
  outputBuffer = 16
): Stream<unknown, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("output", () =>
        pipe(makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())
      ),
      M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
      M.bind("eitherStream", ({ output, runtime }) =>
        M.effectTotal(() =>
          register((k) =>
            pipe(Take.fromPull(k), T.chain(output.offer), runtime.runPromise)
          )
        )
      ),
      M.bind("pull", ({ eitherStream, output }) =>
        E.fold_(
          eitherStream,
          (canceler) =>
            pipe(
              M.of,
              M.bind("done", () => R.makeManagedRef(false)),
              M.map(({ done }) =>
                pipe(
                  done.get,
                  T.chain((b) =>
                    b
                      ? Pull.end
                      : pipe(
                          output.take,
                          T.chain(Take.done),
                          T.onError(() =>
                            pipe(
                              done.set(true),
                              T.chain(() => output.shutdown)
                            )
                          )
                        )
                  )
                )
              ),
              M.ensuring(canceler)
            ),
          (s) =>
            pipe(
              output.shutdown,
              T.toManaged(),
              M.chain(() => s.proc)
            )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export const effectAsyncInterrupt = <R, E, A>(
  register: (
    cb: (next: T.Effect<unknown, R, O.Option<E>, A.Array<A>>) => Promise<boolean>
  ) => T.Canceler<R>,
  outputBuffer = 16
): Stream<unknown, R, E, A> =>
  effectAsyncInterruptEither((cb) => E.left(register(cb)), outputBuffer)

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export const repeatEffectChunkOption = <S, R, E, A>(
  fa: T.Effect<S, R, O.Option<E>, A.Array<A>>
): Stream<S, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("done", () => R.makeManagedRef(false)),
      M.let("pull", ({ done }) =>
        pipe(
          done.get,
          T.chain((b) =>
            b
              ? Pull.end
              : pipe(
                  fa,
                  T.tapError(
                    O.fold(
                      () => done.set(true),
                      () => T.unit
                    )
                  )
                )
          )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )

/**
 * Creates a single-valued stream from a managed resource
 */
export const managed = <S, R, E, A>(self: M.Managed<S, R, E, A>): Stream<S, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("doneRef", () => R.makeManagedRef(false)),
      M.bind("finalizer", () => makeManagedReleaseMap(T.sequential)),
      M.let("pull", ({ doneRef, finalizer }) =>
        T.uninterruptibleMask(({ restore }) =>
          pipe(
            doneRef.get,
            T.chain((done) =>
              done
                ? Pull.end
                : pipe(
                    T.of,
                    T.bind("a", () =>
                      pipe(
                        self.effect,
                        coerceSE<S, E>(),
                        T.map(([_, __]) => __),
                        T.provideSome((r: R) => [r, finalizer] as [R, ReleaseMap]),
                        restore,
                        T.onError(() => doneRef.set(true))
                      )
                    ),
                    T.tap(() => doneRef.set(true)),
                    T.map(({ a }) => [a]),
                    T.mapError(O.some)
                  )
            )
          )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )

/**
 * Creates a stream from an asynchronous callback that can be called multiple times
 * The registration of the callback itself returns an effect. The optionality of the
 * error type `E` can be used to signal the end of the stream, by setting it to `None`.
 */
export const effectAsyncM = <R, E, A, R1 = R, E1 = E>(
  register: (
    cb: (next: T.Effect<unknown, R, O.Option<E>, A.Array<A>>) => Promise<boolean>
  ) => T.Effect<unknown, R1, E1, unknown>,
  outputBuffer = 16
): Stream<unknown, R & R1, E | E1, A> =>
  pipe(
    M.of,
    M.bind("output", () =>
      pipe(makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())
    ),
    M.bind("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
    M.tap(({ output, runtime }) =>
      T.toManaged()(
        register((k) =>
          pipe(Take.fromPull(k), T.chain(output.offer), runtime.runPromise)
        )
      )
    ),
    M.bind("done", () => R.makeManagedRef(false)),
    M.let("pull", ({ done, output }) =>
      pipe(
        done.get,
        T.chain((b) =>
          b
            ? Pull.end
            : pipe(
                output.take,
                T.chain(Take.done),
                T.onError(() =>
                  pipe(
                    done.set(true),
                    T.chain(() => output.shutdown)
                  )
                )
              )
        )
      )
    ),
    M.map(({ pull }) => pull),
    managed,
    chain(repeatEffectChunkOption)
  )

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export const mapChunksM = <O, S2, R2, E2, O2>(
  f: (_: A.Array<O>) => T.Effect<S2, R2, E2, A.Array<O2>>
) => <S, R, E>(self: Stream<S, R, E, O>): Stream<S2 | S, R & R2, E2 | E, O2> =>
  new Stream(
    pipe(
      self.proc,
      M.map((e) =>
        pipe(
          e,
          T.chain((x) => pipe(f(x), T.mapError<E2, O.Option<E | E2>>(O.some)))
        )
      )
    )
  )

/**
 * Transforms the chunks emitted by this stream.
 */
export const mapChunks = <O, O2>(f: (_: A.Array<O>) => A.Array<O2>) => <S, R, E>(
  self: Stream<S, R, E, O>
): Stream<S, R, E, O2> =>
  pipe(
    self,
    mapChunksM((o) => T.succeedNow(f(o)))
  )

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export const mapConcatChunk = <O, O2>(f: (_: O) => A.Array<O2>) => <S, R, E>(
  self: Stream<S, R, E, O>
): Stream<S, R, E, O2> =>
  pipe(
    self,
    mapChunks((o) => A.chain_(o, f))
  )

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export const mapConcatChunkM = <S2, R2, E2, O, O2>(
  f: (_: O) => T.Effect<S2, R2, E2, A.Array<O2>>
) => <S, R, E>(self: Stream<S, R, E, O>) =>
  pipe(self, mapM(f), mapConcatChunk(identity))

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export const mapConcat = <O, O2>(f: (_: O) => Iterable<O2>) => <S, R, E>(
  self: Stream<S, R, E, O>
): Stream<S, R, E, O2> =>
  pipe(
    self,
    mapChunks((o) => A.chain_(o, (o) => Array.from(f(o))))
  )

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export const mapConcatM = <S2, R2, E2, O, O2>(
  f: (_: O) => T.Effect<S2, R2, E2, Iterable<O2>>
) => <S, R, E>(self: Stream<S, R, E, O>): Stream<S2 | S, R & R2, E2 | E, O2> =>
  pipe(
    self,
    mapConcatChunkM((o) =>
      pipe(
        f(o),
        T.map((o) => Array.from(o))
      )
    )
  )

/**
 * Transforms the chunks emitted by this stream.
 */
export const map = <O, O2>(f: (_: O) => O2) => <S, R, E>(
  self: Stream<S, R, E, O>
): Stream<S, R, E, O2> =>
  pipe(
    self,
    mapChunks((o) => o.map(f))
  )

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export const mapAccumM = <Z>(z: Z) => <O, S1, R1, E1, O1>(
  f: (z: Z, o: O) => T.Effect<S1, R1, E1, [Z, O1]>
) => <S, R, E>(self: Stream<S, R, E, O>) =>
  new Stream<S | S1, R & R1, E | E1, O1>(
    pipe(
      M.of,
      M.bind("state", () => R.makeManagedRef(z)),
      M.bind("pull", () => pipe(self.proc, M.mapM(BPull.make))),
      M.map(({ pull, state }) =>
        pipe(
          pull,
          BPull.pullElements,
          T.chain((o) =>
            pipe(
              T.of,
              T.bind("s", () => state.get),
              T.bind("t", ({ s }) => f(s, o)),
              T.tap(({ t }) => state.set(t[0])),
              T.map(({ t }) => [t[1]]),
              T.mapError(O.some)
            )
          )
        )
      )
    )
  )

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export const mapAccum = <Z>(z: Z) => <O, O1>(f: (z: Z, o: O) => [Z, O1]) => <S, R, E>(
  self: Stream<S, R, E, O>
) =>
  pipe(
    self,
    mapAccumM(z)((z, o) => T.succeedNow(f(z, o)))
  )

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export const mapError = <E, E2>(f: (e: E) => E2) => <S, R, O>(
  self: Stream<S, R, E, O>
): Stream<S, R, E2, O> => new Stream(pipe(self.proc, M.map(T.mapError(O.map(f)))))

/**
 * Transforms the full causes of failures emitted by this stream.
 */

export const mapErrorCause = <E, E2>(f: (e: C.Cause<E>) => C.Cause<E2>) => <S, R, O>(
  self: Stream<S, R, E, O>
): Stream<S, R, E2, O> =>
  new Stream(
    pipe(
      self.proc,
      M.map(
        T.mapErrorCause((x) =>
          pipe(
            C.sequenceCauseOption(x),
            O.fold(
              () => C.Fail(O.none),
              (c) => pipe(f(c), C.map(O.some))
            )
          )
        )
      )
    )
  )

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semanthics, see `zipWithSeq` for
 * a sequential alternative
 */
export function zipWith<O, O2, O3, S1, R1, E1>(
  that: Stream<S1, R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: "seq"
): <S, R, E>(self: Stream<S, R, E, O>) => Stream<S | S1, R & R1, E1 | E, O3>
export function zipWith<O, O2, O3, S1, R1, E1>(
  that: Stream<S1, R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps?: "par" | "seq"
): <S, R, E>(self: Stream<S, R, E, O>) => Stream<unknown, R & R1, E1 | E, O3>
export function zipWith<O, O2, O3, S1, R1, E1>(
  that: Stream<S1, R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: "par" | "seq" = "par"
): <S, R, E>(self: Stream<S, R, E, O>) => Stream<unknown, R & R1, E1 | E, O3> {
  type End = { _tag: "End" }
  type RightDone<W2> = { _tag: "RightDone"; excessR: NA.NonEmptyArray<W2> }
  type LeftDone<W1> = { _tag: "LeftDone"; excessL: NA.NonEmptyArray<W1> }
  type Running<W1, W2> = { _tag: "Running"; excess: E.Either<A.Array<W1>, A.Array<W2>> }
  type State<W1, W2> = End | Running<W1, W2> | LeftDone<W1> | RightDone<W2>

  const handleSuccess = (
    leftUpd: O.Option<A.Array<O>>,
    rightUpd: O.Option<A.Array<O2>>,
    excess: E.Either<A.Array<O>, A.Array<O2>>
  ): Exit.Exit<O.Option<never>, readonly [A.Array<O3>, State<O, O2>]> => {
    const [leftExcess, rightExcess] = pipe(
      excess,
      E.fold(
        (l) => tuple<[A.Array<O>, A.Array<O2>]>(l, []),
        (r) => tuple<[A.Array<O>, A.Array<O2>]>([], r)
      )
    )

    const [left, right] = [
      pipe(
        leftUpd,
        O.fold(
          () => leftExcess,
          (upd) => [...leftExcess, ...upd] as A.Array<O>
        )
      ),
      pipe(
        rightUpd,
        O.fold(
          () => rightExcess,
          (upd) => [...rightExcess, ...upd] as A.Array<O2>
        )
      )
    ]

    const [emit, newExcess] = zipChunks_(left, right, f)

    if (O.isSome(leftUpd) && O.isSome(rightUpd)) {
      return Exit.succeed(
        tuple<[A.Array<O3>, State<O, O2>]>(emit, { _tag: "Running", excess: newExcess })
      )
    } else if (O.isNone(leftUpd) && O.isNone(rightUpd)) {
      return Exit.fail(O.none)
    } else {
      return Exit.succeed(
        tuple(
          emit,
          pipe(
            newExcess,
            E.fold(
              (l): State<O, O2> =>
                A.isNonEmpty(l) ? { _tag: "LeftDone", excessL: l } : { _tag: "End" },
              (r): State<O, O2> =>
                A.isNonEmpty(r) ? { _tag: "RightDone", excessR: r } : { _tag: "End" }
            )
          )
        )
      )
    }
  }

  return combineChunks(that)<State<O, O2>>({
    _tag: "Running",
    excess: E.left([])
  })((st, p1, p2) => {
    switch (st._tag) {
      case "End": {
        return T.succeedNow(Exit.fail(O.none))
      }
      case "Running": {
        return pipe(
          p1,
          T.optional,
          ps === "par"
            ? T.zipWithPar(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess))
            : T.zipWith(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
          T.catchAllCause((e) => T.succeedNow(Exit.halt(pipe(e, C.map(O.some)))))
        )
      }
      case "LeftDone": {
        return pipe(
          p2,
          T.optional,
          T.map((r) => handleSuccess(O.none, r, E.left(st.excessL))),
          T.catchAllCause((e) => T.succeedNow(Exit.halt(pipe(e, C.map(O.some)))))
        )
      }
      case "RightDone": {
        return pipe(
          p1,
          T.optional,
          T.map((l) => handleSuccess(l, O.none, E.right(st.excessR))),
          T.catchAllCause((e) => T.succeedNow(Exit.halt(pipe(e, C.map(O.some)))))
        )
      }
    }
  })
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * Pull will be executed sequentially
 */
export const zipWithSeq = <O, O2, O3, S1, R1, E1>(
  that: Stream<S1, R1, E1, O2>,
  f: (a: O, a1: O2) => O3
) => <S, R, E>(self: Stream<S, R, E, O>): Stream<S | S1, R & R1, E1 | E, O3> =>
  pipe(self, zipWith(that, f, "seq"))

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export const unfoldChunkM = <Z>(z: Z) => <S, R, E, A>(
  f: (z: Z) => T.Effect<S, R, E, O.Option<readonly [A.Array<A>, Z]>>
): Stream<S, R, E, A> =>
  new Stream(
    pipe(
      M.of,
      M.bind("done", () => R.makeManagedRef(false)),
      M.bind("ref", () => R.makeManagedRef(z)),
      M.let("pull", ({ done, ref }) =>
        pipe(
          done.get,
          T.chain((isDone) =>
            isDone
              ? Pull.end
              : pipe(
                  ref.get,
                  T.chain(f),
                  T.foldM(
                    Pull.fail,
                    O.fold(
                      () =>
                        pipe(
                          done.set(true),
                          T.chain(() => Pull.end)
                        ),
                      ([a, z]) =>
                        pipe(
                          ref.set(z),
                          T.map(() => a)
                        )
                    )
                  )
                )
          )
        )
      ),
      M.map(({ pull }) => pull)
    )
  )

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export const combineChunks = <S1, R1, E1, O2>(that: Stream<S1, R1, E1, O2>) => <Z>(
  z: Z
) => <S, S2, R, E, O, O3>(
  f: (
    z: Z,
    s: T.Effect<S, R, O.Option<E>, A.Array<O>>,
    t: T.Effect<S1, R1, O.Option<E1>, A.Array<O2>>
  ) => T.Effect<
    S2,
    R & R1,
    never,
    Exit.Exit<O.Option<E | E1>, readonly [A.Array<O3>, Z]>
  >
) => (self: Stream<S, R, E, O>): Stream<S1 | S | S2, R & R1, E1 | E, O3> =>
  new Stream(
    pipe(
      M.of,
      M.bind("left", () => self.proc),
      M.bind("right", () => that.proc),
      M.bind(
        "pull",
        ({ left, right }) =>
          unfoldChunkM(z)((z) =>
            pipe(
              f(z, left, right),
              T.chain((ex) => T.optional(T.done(ex)))
            )
          ).proc
      ),
      M.map(({ pull }) => pull)
    )
  )
