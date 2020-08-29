import * as T from "../_internal/effect"
import type * as M from "../_internal/managed"
import type * as A from "../../Array"
import * as C from "../../Cause/core"
import * as Exit from "../../Exit/api"
import { pipe } from "../../Function"
import type { Finalizer, ReleaseMap } from "../../Managed"
import { makeReleaseMap, noop } from "../../Managed"
import { coerceSE } from "../../Managed/deps"
import * as O from "../../Option"
import * as R from "../../Ref"
import * as Pull from "../Pull"

export const StreamURI = "@matechs/core/Eff/StreamURI"
export type StreamURI = typeof StreamURI

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
 * @internal
 */
export class Chain<S_, R_, E_, O, O2> {
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
