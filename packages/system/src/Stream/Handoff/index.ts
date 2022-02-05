// ets_tracing: off

import "../../Operator/index.js"

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { constVoid, pipe } from "../../Function/index.js"
import type { Option } from "../../Option/index.js"
import { none, some } from "../../Option/index.js"
import * as P from "../../Promise/index.js"
import { matchTag } from "../../Utils/index.js"
import * as T from "../_internal/effect.js"
import * as R from "../_internal/ref.js"

type State<A> = Empty | Full<A>

class Empty {
  readonly _tag = "Empty"
  constructor(readonly notifyConsumer: P.Promise<never, void>) {}
}

class Full<A> {
  readonly _tag = "Full"
  constructor(readonly a: A, readonly notifyProducer: P.Promise<never, void>) {}
}

/**
 * A synchronous queue-like abstraction that allows a producer to offer
 * an element and wait for it to be taken, and allows a consumer to wait
 * for an element to be available.
 */
class Handoff<A> {
  readonly _tag = "Handoff"
  constructor(readonly ref: R.Ref<State<A>>) {}
}

export function make<A>(): T.UIO<Handoff<A>> {
  return pipe(
    P.make<never, void>(),
    T.chain((p) => R.makeRef<State<A>>(new Empty(p))),
    T.map((ref) => new Handoff(ref))
  )
}

export function offer_<A>(h: Handoff<A>, a: A): T.UIO<void> {
  return pipe(
    P.make<never, void>(),
    T.chain((p) =>
      pipe(
        h.ref,
        R.modify<T.UIO<void>, State<A>>(
          matchTag({
            Empty: ({ notifyConsumer }) =>
              Tp.tuple(
                pipe(notifyConsumer, P.succeed(constVoid()), T.zipRight(P.await(p))),
                new Full(a, p)
              ),
            Full: (s) =>
              Tp.tuple(
                pipe(
                  P.await(s.notifyProducer),
                  T.chain(() => offer_(h, a))
                ),
                s
              )
          })
        ),
        T.flatten
      )
    )
  )
}

export function offer<A>(a: A) {
  return (h: Handoff<A>) => offer_(h, a)
}

export function take<A>(h: Handoff<A>): T.UIO<A> {
  return pipe(
    P.make<never, void>(),
    T.chain((p) =>
      pipe(
        h.ref,
        R.modify<T.UIO<A>, State<A>>(
          matchTag({
            Empty: (s) =>
              Tp.tuple(
                pipe(
                  s.notifyConsumer,
                  P.await,
                  T.chain(() => take(h))
                ),
                s
              ),
            Full: ({ a, notifyProducer }) =>
              Tp.tuple(
                pipe(notifyProducer, P.succeed(constVoid()), T.as(a)),
                new Empty(p)
              )
          })
        ),
        T.flatten
      )
    )
  )
}

export function poll<A>(h: Handoff<A>): T.UIO<Option<A>> {
  return pipe(
    P.make<never, void>(),
    T.chain((p) =>
      pipe(
        h.ref,
        R.modify<T.UIO<Option<A>>, State<A>>(
          matchTag({
            Empty: (s) => Tp.tuple(T.succeed(none), s),
            Full: ({ a, notifyProducer }) =>
              Tp.tuple(
                pipe(notifyProducer, P.succeed(constVoid()), T.as(some(a))),
                new Empty(p)
              )
          })
        ),
        T.flatten
      )
    )
  )
}
