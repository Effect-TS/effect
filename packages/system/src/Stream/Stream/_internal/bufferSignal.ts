import type * as A from "../../../Array"
import * as T from "../../../Effect"
import * as Ex from "../../../Exit"
import { pipe } from "../../../Function"
import * as M from "../../../Managed"
import * as O from "../../../Option"
import * as P from "../../../Promise"
import type * as Q from "../../../Queue"
import * as Ref from "../../../Ref"
import * as Pull from "../../Pull"
import * as Take from "../../Take"
import type { Stream } from "../definitions"

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * to the provided queue.
 */
export function bufferSignal<R, E, E1, O, O1>(
  self: Stream<R, E, O>,
  queue: Q.Queue<readonly [Take.Take<E1, O1>, P.Promise<never, void>]>
): M.Managed<R, never, T.Effect<R, O.Option<E1>, A.Array<O1>>> {
  return pipe(
    M.do,
    M.bind("as", () => self.proc),
    M.bind("start", () => T.toManaged_(P.make<never, void>())),
    M.tap(({ start }) => T.toManaged_(P.succeed_(start, undefined))),
    M.bind("ref", ({ start }) => T.toManaged_(Ref.makeRef(start))),
    M.bind("done", () => T.toManaged_(Ref.makeRef(false))),
    M.let("upstream", ({ as, ref }) => {
      const offer = (take: Take.Take<E1, O1>): T.UIO<void> =>
        Ex.fold_(
          take,
          (_) =>
            pipe(
              T.do,
              T.bind("latch", () => ref.get),
              T.tap(({ latch }) => P.await(latch)),
              T.bind("p", () => P.make<never, void>()),
              T.tap(({ p }) => queue.offer([take, p])),
              T.tap(({ p }) => ref.set(p)),
              T.tap(({ p }) => P.await(p)),
              T.asUnit
            ),
          (_) =>
            pipe(
              T.do,
              T.bind("p", () => P.make<never, void>()),
              T.bind("added", ({ p }) => queue.offer([take, p])),
              T.tap(({ added, p }) => T.when_(ref.set(p), () => added)),
              T.asUnit
            )
        )

      return pipe(
        Take.fromPull(as),
        T.tap((take) => offer(take as Ex.Exit<O.Option<E1>, A.Array<O1>>)),
        T.repeatWhile((_) => _ !== Take.end),
        T.asUnit
      )
    }),
    M.tap(({ upstream }) => M.fork(T.toManaged_(upstream))),
    M.let("pull", ({ done }) =>
      pipe(
        done.get,
        T.chain((_) => {
          if (_) {
            return Pull.end
          } else {
            return T.chain_(queue.take, ([take, p]) =>
              T.andThen_(
                T.andThen_(
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
