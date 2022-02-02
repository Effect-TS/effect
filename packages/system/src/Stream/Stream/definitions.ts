// ets_tracing: off

import * as C from "../../Cause/core.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as Exit from "../../Exit/api.js"
import { pipe } from "../../Function/index.js"
import * as Finalizer from "../../Managed/ReleaseMap/finalizer.js"
import type * as RM from "../../Managed/ReleaseMap/index.js"
import * as makeReleaseMap from "../../Managed/ReleaseMap/makeReleaseMap.js"
import * as releaseAll from "../../Managed/ReleaseMap/releaseAll.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import type * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"

export const StreamURI = "@matechs/core/Eff/StreamURI"
export type StreamURI = typeof StreamURI

/**
 * A `Stream<R, E, O>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `O`, may fail with errors of type `E`
 * and uses an environment of type `R` and can be sync or async `S`.
 * One way to think of `Stream` is as a `Effect` program that could emit multiple values.
 *
 * This data type can emit multiple `A` values through multiple calls to `next`.
 * Similarly, embedded inside every `Stream` is an Effect program: `Effect< R, Option<E>, A.Chunk<O>>`.
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
export class Stream<R, E, A> {
  readonly [T._U]: StreamURI;
  readonly [T._E]: () => E;
  readonly [T._A]: () => A;
  readonly [T._R]: (_: R) => void

  constructor(
    readonly proc: M.Managed<R, never, T.Effect<R, O.Option<E>, A.Chunk<A>>>
  ) {}
}

/**
 * Type aliases
 */
export type UIO<A> = Stream<unknown, never, A>
export type IO<E, A> = Stream<unknown, E, A>
export type RIO<R, A> = Stream<R, never, A>

/**
 * The default chunk size used by the various combinators and constructors of `Stream`.
 */
export const DefaultChunkSize = 4096

/**
 * @internal
 */
export class Chain<R_, E_, O, O2> {
  constructor(
    readonly f0: (a: O) => Stream<R_, E_, O2>,
    readonly outerStream: T.Effect<R_, O.Option<E_>, A.Chunk<O>>,
    readonly currOuterChunk: Ref.Ref<Tp.Tuple<[A.Chunk<O>, number]>>,
    readonly currInnerStream: Ref.Ref<T.Effect<R_, O.Option<E_>, A.Chunk<O2>>>,
    readonly innerFinalizer: Ref.Ref<RM.Finalizer>
  ) {
    this.apply = this.apply.bind(this)
    this.closeInner = this.closeInner.bind(this)
    this.pullNonEmpty = this.pullNonEmpty.bind(this)
    this.pullOuter = this.pullOuter.bind(this)
  }

  closeInner() {
    return pipe(
      this.innerFinalizer,
      Ref.getAndSet(Finalizer.noopFinalizer),
      T.chain((f) => f(Exit.unit))
    )
  }

  pullNonEmpty<R, E, O>(
    pull: T.Effect<R, O.Option<E>, A.Chunk<O>>
  ): T.Effect<R, O.Option<E>, A.Chunk<O>> {
    return pipe(
      pull,
      T.chain((os) => (!A.isEmpty(os) ? T.succeed(os) : this.pullNonEmpty(pull)))
    )
  }

  pullOuter() {
    return pipe(
      this.currOuterChunk,
      Ref.modify(
        ({
          tuple: [chunk, nextIdx]
        }): Tp.Tuple<
          [T.Effect<R_, O.Option<E_>, O>, Tp.Tuple<[A.Chunk<O>, number]>]
        > => {
          if (nextIdx < A.size(chunk)) {
            return Tp.tuple(
              T.succeed(A.unsafeGet_(chunk, nextIdx)),
              Tp.tuple(chunk, nextIdx + 1)
            )
          } else {
            return Tp.tuple(
              pipe(
                this.pullNonEmpty(this.outerStream),
                T.tap((os) => this.currOuterChunk.set(Tp.tuple(os, 1))),
                T.map((os) => A.unsafeGet_(os, 0))
              ),
              Tp.tuple(chunk, nextIdx)
            )
          }
        }
      ),
      T.flatten,
      T.chain((o) =>
        T.uninterruptibleMask(({ restore }) =>
          pipe(
            T.do,
            T.bind("releaseMap", () => makeReleaseMap.makeReleaseMap),
            T.bind("pull", ({ releaseMap }) =>
              restore(
                pipe(
                  this.f0(o).proc.effect,
                  T.provideSome((_: R_) => Tp.tuple(_, releaseMap)),
                  T.map((_) => _.get(1))
                )
              )
            ),
            T.tap(({ pull }) => this.currInnerStream.set(pull)),
            T.tap(({ releaseMap }) =>
              this.innerFinalizer.set((e) =>
                releaseAll.releaseAll(e, T.sequential)(releaseMap)
              )
            ),
            T.asUnit
          )
        )
      )
    )
  }

  apply(): T.Effect<R_, O.Option<E_>, A.Chunk<O2>> {
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
