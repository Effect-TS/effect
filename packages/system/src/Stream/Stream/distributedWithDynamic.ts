import * as C from "../../Cause"
import * as A from "../../Chunk"
import * as Ex from "../../Exit"
import { pipe } from "../../Function"
import * as Map from "../../Map"
import * as O from "../../Option"
import * as Q from "../../Queue"
import * as SM from "../../Semaphore"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as R from "../_internal/ref"
import type { Stream } from "./definitions"
import { foreachManaged } from "./foreachManaged"

/**
 * More powerful version of `distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic<E, O>(
  maximumLag: number,
  decide: (_: O) => T.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => T.UIO<any> = (_: any) => T.unit
) {
  return <R>(stream: Stream<R, E, O>) =>
    distributedWithDynamic_(stream, maximumLag, decide, done)
}

/**
 * More powerful version of `distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic_<R, E, O>(
  self: Stream<R, E, O>,
  maximumLag: number,
  decide: (o: O) => T.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => T.UIO<any> = (_: any) => T.unit
): M.Managed<R, never, T.UIO<readonly [symbol, Q.Dequeue<Ex.Exit<O.Option<E>, O>>]>> {
  const offer = (
    queuesRef: R.Ref<ReadonlyMap<symbol, Q.Queue<Ex.Exit<O.Option<E>, O>>>>
  ) => (o: O) =>
    pipe(
      T.do,
      T.bind("shouldProcess", () => decide(o)),
      T.bind("queues", () => T.map_(queuesRef.get, (m) => m.entries())),
      T.chain(({ queues, shouldProcess }) =>
        pipe(
          T.reduce_(queues, A.empty as A.Chunk<symbol>, (acc, [id, queue]) => {
            if (shouldProcess(id)) {
              return pipe(
                queue.offer(Ex.succeed(o)),
                T.foldCauseM(
                  (c) =>
                    C.interrupted(c) ? T.succeed(A.concat_(acc, [id])) : T.halt(c),
                  () => T.succeed(acc)
                )
              )
            } else {
              return T.succeed(acc)
            }
          }),
          T.chain((ids) =>
            A.isNonEmpty(ids) ? R.update_(queuesRef, Map.removeMany(ids)) : T.unit
          )
        )
      )
    )
  return pipe(
    M.do,
    M.bind("queuesRef", () =>
      pipe(
        R.makeRef(Map.empty as Map.Map<symbol, Q.Queue<Ex.Exit<O.Option<E>, O>>>),
        (acquire) =>
          T.toManaged_(acquire, (_) =>
            T.chain_(_.get, (qs) => T.foreach_(qs.values(), (q) => q.shutdown))
          )
      )
    ),
    M.bind("add", ({ queuesRef }) => {
      return pipe(
        M.do,
        M.bind("queuesLock", () => T.toManaged_(SM.makeSemaphore(1))),
        M.bind("newQueue", () =>
          pipe(
            R.makeRef<T.UIO<readonly [symbol, Q.Queue<Ex.Exit<O.Option<E>, O>>]>>(
              pipe(
                T.do,
                T.bind("queue", () =>
                  Q.makeBounded<Ex.Exit<O.Option<E>, O>>(maximumLag)
                ),
                T.let("id", () => Symbol()),
                T.tap(({ id, queue }) => R.update_(queuesRef, Map.insert(id, queue))),
                T.map(({ id, queue }) => [id, queue])
              )
            ),
            T.toManaged()
          )
        ),
        M.let("finalize", ({ newQueue, queuesLock }) => {
          return (endTake: Ex.Exit<O.Option<E>, never>) =>
            SM.withPermit(queuesLock)(
              T.chain_(
                newQueue.set(
                  pipe(
                    T.do,
                    T.bind("queue", () => Q.makeBounded<Ex.Exit<O.Option<E>, O>>(1)),
                    T.tap(({ queue }) => queue.offer(endTake)),
                    T.let("id", () => Symbol()),
                    T.tap(({ id, queue }) =>
                      R.update_(queuesRef, Map.insert(id, queue))
                    ),
                    T.map(({ id, queue }) => [id, queue] as const)
                  )
                ),
                () =>
                  pipe(
                    T.do,
                    T.bind("queues", () =>
                      T.map_(queuesRef.get, (m) => [...m.values()])
                    ),
                    T.tap(({ queues }) =>
                      T.foreach_(queues, (queue) =>
                        pipe(
                          queue.offer(endTake),
                          T.catchSomeCause((c) =>
                            C.interrupted(c) ? O.some(T.unit) : O.none
                          )
                        )
                      )
                    ),
                    T.tap(() => done(endTake)),
                    T.asUnit
                  )
              )
            )
        }),
        M.tap(({ finalize }) =>
          pipe(
            self,
            foreachManaged(offer(queuesRef)),
            M.foldCauseM(
              (cause) => T.toManaged_(finalize(Ex.halt(C.map(O.some)(cause)))),
              () => T.toManaged_(finalize(Ex.fail(O.none)))
            ),
            M.fork
          )
        ),
        M.map(({ newQueue, queuesLock }) =>
          SM.withPermit(queuesLock)(T.flatten(newQueue.get))
        )
      )
    }),
    M.map(({ add }) => add)
  )
}
