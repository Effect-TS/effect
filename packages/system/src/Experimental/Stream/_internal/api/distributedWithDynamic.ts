// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as HM from "../../../../Collections/Immutable/HashMap/index.js"
import * as L from "../../../../Collections/Immutable/List/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as Ex from "../../../../Exit/index.js"
import type { Predicate } from "../../../../Function/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import * as Q from "../../../../Queue/index.js"
import * as Ref from "../../../../Ref/index.js"
import * as SM from "../../../../Semaphore/index.js"
import * as AR from "../../../../Support/AtomicNumber/index.js"
import type * as C from "../core.js"
import * as RunForEachManaged from "./runForEachManaged.js"

const distributedWithDynamicId = new AR.AtomicNumber(0)

/**
 * More powerful version of `Stream#distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  maximumLag: number,
  decide: (a: A) => T.UIO<Predicate<number>>,
  done: (ex: Ex.Exit<O.Option<E>, never>) => T.UIO<A1>
): M.RIO<R, T.UIO<Tp.Tuple<[number, Q.Dequeue<Ex.Exit<O.Option<E>, A>>]>>> {
  return pipe(
    M.do,
    M.bind("queuesRef", () =>
      T.toManagedRelease_(
        Ref.makeRef<HM.HashMap<number, Q.Queue<Ex.Exit<O.Option<E>, A>>>>(HM.make()),
        (_) =>
          T.chain_(Ref.get(_), (qs) => T.forEach_(HM.values(qs), (_) => Q.shutdown(_)))
      )
    ),
    M.bind("add", ({ queuesRef }) => {
      const offer = (a: A) =>
        pipe(
          T.do,
          T.bind("shouldProcess", () => decide(a)),
          T.bind("queues", () => Ref.get(queuesRef)),
          T.tap(({ queues, shouldProcess }) =>
            pipe(
              T.reduce_(queues, L.empty<number>(), (acc, [id, queue]) => {
                if (shouldProcess(id)) {
                  return T.foldCauseM_(
                    Q.offer_(queue, Ex.succeed(a)),
                    (c) =>
                      CS.interrupted(c) ? T.succeed(L.prepend_(acc, id)) : T.halt(c),
                    (_) => T.succeed(acc)
                  )
                } else {
                  return T.succeed(acc)
                }
              }),
              T.chain((ids) =>
                L.isEmpty(ids) ? T.unit : Ref.update_(queuesRef, HM.removeMany(ids))
              )
            )
          ),
          T.asUnit
        )

      return pipe(
        M.do,
        M.bind("queuesLock", () => T.toManaged(SM.makeSemaphore(1))),
        M.bind("newQueue", () =>
          T.toManaged(
            Ref.makeRef<T.UIO<Tp.Tuple<[number, Q.Queue<Ex.Exit<O.Option<E>, A>>]>>>(
              pipe(
                T.do,
                T.bind("queue", () =>
                  Q.makeBounded<Ex.Exit<O.Option<E>, A>>(maximumLag)
                ),
                T.bind("id", () =>
                  T.succeedWith(() => distributedWithDynamicId.incrementAndGet())
                ),
                T.tap(({ id, queue }) => Ref.update_(queuesRef, HM.set(id, queue))),
                T.map(({ id, queue }) => Tp.tuple(id, queue))
              )
            )
          )
        ),
        M.let(
          "finalize",
          ({ newQueue, queuesLock }) =>
            (endTake: Ex.Exit<O.Option<E>, never>) =>
              SM.withPermit_(
                pipe(
                  T.do,
                  T.tap(() =>
                    Ref.set_(
                      newQueue,
                      pipe(
                        T.do,
                        T.bind("queue", () =>
                          Q.makeBounded<Ex.Exit<O.Option<E>, A>>(1)
                        ),
                        T.tap(({ queue }) => Q.offer_(queue, endTake)),
                        T.bind("id", () =>
                          T.succeedWith(() =>
                            distributedWithDynamicId.incrementAndGet()
                          )
                        ),
                        T.tap(({ id, queue }) =>
                          Ref.update_(queuesRef, HM.set(id, queue))
                        ),
                        T.map(({ id, queue }) => Tp.tuple(id, queue))
                      )
                    )
                  ),
                  T.bind("queues", () => T.map_(Ref.get(queuesRef), HM.values)),
                  T.tap(({ queues }) =>
                    T.forEach_(queues, (queue) =>
                      T.catchSomeCause_(Q.offer_(queue, endTake), (c) => {
                        if (CS.interrupted(c)) {
                          return O.some(T.unit)
                        } else {
                          return O.none
                        }
                      })
                    )
                  ),
                  T.tap((_) => done(endTake)),
                  T.asUnit
                ),
                queuesLock
              )
        ),
        M.tap(({ finalize }) =>
          pipe(
            RunForEachManaged.runForEachManaged_(self, offer),
            M.foldCauseM(
              (cause) => T.toManaged(finalize(Ex.halt(CS.map_(cause, O.some)))),
              (_) => T.toManaged(finalize(Ex.fail(O.none)))
            ),
            M.fork
          )
        ),
        M.map(({ newQueue, queuesLock }) =>
          SM.withPermit_(T.flatten(Ref.get(newQueue)), queuesLock)
        )
      )
    }),
    M.map(({ add }) => add)
  )
}

/**
 * More powerful version of `Stream#distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 *
 * @ets_data_first distributedWithDynamic_
 */
export function distributedWithDynamic<E, A, A1>(
  maximumLag: number,
  decide: (a: A) => T.UIO<Predicate<number>>,
  done: (ex: Ex.Exit<O.Option<E>, never>) => T.UIO<A1>
) {
  return <R>(self: C.Stream<R, E, A>) =>
    distributedWithDynamic_(self, maximumLag, decide, done)
}
