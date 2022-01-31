// ets_tracing: off

import type * as A from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as Ex from "../../../Exit/index.js"
import { pipe } from "../../../Function/index.js"
import * as O from "../../../Option/index.js"
import * as P from "../../../Promise/index.js"
import * as Q from "../../../Queue/index.js"
import * as T from "../../_internal/effect.js"
import * as M from "../../_internal/managed.js"
import * as Ref from "../../_internal/ref.js"
import * as Pull from "../../Pull/index.js"
import * as Take from "../../Take/index.js"
import type { Stream } from "../definitions.js"

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * to the provided queue.
 */
export function bufferSignal<R, E, O>(
  self: Stream<R, E, O>,
  queue: Q.Queue<Tp.Tuple<[Take.Take<E, O>, P.Promise<never, void>]>>
): M.Managed<R, never, T.Effect<R, O.Option<E>, A.Chunk<O>>> {
  return pipe(
    M.do,
    M.bind("as", () => self.proc),
    M.bind("start", () => T.toManaged(P.make<never, void>())),
    M.tap(({ start }) => T.toManaged(P.succeed_(start, undefined))),
    M.bind("ref", ({ start }) => T.toManaged(Ref.makeRef(start))),
    M.bind("done", () => T.toManaged(Ref.makeRef(false))),
    M.let("upstream", ({ as, ref }) => {
      const offer = (take: Take.Take<E, O>): T.UIO<void> =>
        Ex.fold_(
          take,
          (_) =>
            pipe(
              T.do,
              T.bind("latch", () => ref.get),
              T.tap(({ latch }) => P.await(latch)),
              T.bind("p", () => P.make<never, void>()),
              T.tap(({ p }) => Q.offer_(queue, Tp.tuple(take, p))),
              T.tap(({ p }) => ref.set(p)),
              T.tap(({ p }) => P.await(p)),
              T.asUnit
            ),
          (_) =>
            pipe(
              T.do,
              T.bind("p", () => P.make<never, void>()),
              T.bind("added", ({ p }) => Q.offer_(queue, Tp.tuple(take, p))),
              T.tap(({ added, p }) => T.when_(ref.set(p), () => added)),
              T.asUnit
            )
        )

      return pipe(
        Take.fromPull(as),
        T.tap((take) => offer(take as Ex.Exit<O.Option<E>, A.Chunk<O>>)),
        T.repeatWhile((_) => _ !== Take.end),
        T.asUnit
      )
    }),
    M.tap(({ upstream }) => M.fork(T.toManaged(upstream))),
    M.let("pull", ({ done }) =>
      pipe(
        done.get,
        T.chain((_) => {
          if (_) {
            return Pull.end
          } else {
            return T.chain_(Q.take(queue), ({ tuple: [take, p] }) =>
              T.zipRight_(
                T.zipRight_(
                  P.succeed_(p, undefined),
                  T.when_(done.set(true), () => take === Take.end)
                ),
                Take.done(take)
              )
            )
          }
        })
      )
    ),
    M.map(({ pull }) => pull)
  )
}
