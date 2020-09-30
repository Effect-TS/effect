import * as T from "../../Effect"
import { constVoid, pipe } from "../../Function"
import type { Option } from "../../Option"
import { none, some } from "../../Option"
import * as P from "../../Promise"
import * as R from "../../Ref"
import { matchTag } from "../../Utils"

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

export function offer<A>(a: A) {
  return (h: Handoff<A>): T.UIO<void> =>
    pipe(
      P.make<never, void>(),
      T.chain((p) =>
        pipe(
          h.ref,
          R.modify<T.UIO<void>, State<A>>(
            matchTag({
              Empty: ({ notifyConsumer }) =>
                [
                  pipe(notifyConsumer, P.succeed(constVoid()), T.andThen(P.await(p))),
                  new Full(a, p)
                ] as const,
              Full: (s) =>
                [
                  pipe(
                    P.await(s.notifyProducer),
                    T.chain(() => offer(a)(h))
                  ),
                  s
                ] as const
            })
          ),
          T.flatten
        )
      )
    )
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
              [
                pipe(
                  s.notifyConsumer,
                  P.await,
                  T.chain(() => take(h))
                ),
                s
              ] as const,
            Full: ({ a, notifyProducer }) =>
              [
                pipe(notifyProducer, P.succeed(constVoid()), T.as(a)),
                new Empty(p)
              ] as const
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
            Empty: (s) => [T.succeed(none), s] as const,
            Full: ({ a, notifyProducer }) =>
              [
                pipe(notifyProducer, P.succeed(constVoid()), T.as(some(a))),
                new Empty(p)
              ] as const
          })
        ),
        T.flatten
      )
    )
  )
}
