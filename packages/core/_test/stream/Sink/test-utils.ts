import type { AbstractQueue } from "@effect/core/io/Queue"
import { QueueProto } from "@effect/core/io/Queue"
import { constVoid } from "@tsplus/stdlib/data/Function"

export function findSink<A>(a: A): Sink<never, void, A, A, A> {
  return Sink.fold<A, Maybe<A>>(
    Maybe.none,
    (option) => option.isNone(),
    (_, v) => (a === v ? Maybe.some(a) : Maybe.none)
  ).mapEffect((option) => option.fold(Effect.fail(constVoid), Effect.succeedNow))
}

export function sinkRaceLaw<E, A, L>(
  s: Stream<never, never, A>,
  sink1: Sink<never, E, A, L, A>,
  sink2: Sink<never, E, A, L, A>
): Effect.UIO<boolean> {
  return Effect.struct({
    r1: s.run(sink1).either(),
    r2: s.run(sink2).either(),
    r: s.run(sink1.raceBoth(sink2)).either()
  }).map(({ r, r1, r2 }) =>
    r.fold(
      () => r1.isLeft() || r2.isLeft(),
      (v) =>
        v.fold(
          (w) => r1.isRight() && r1.right === w,
          (w) => r2.isRight() && r2.right === w
        )
    )
  )
}

export function zipParLaw<A, B, C, E>(
  s: Stream<never, never, A>,
  sink1: Sink<never, E, A, A, B>,
  sink2: Sink<never, E, A, A, C>
): Effect.UIO<boolean> {
  return Effect.struct({
    zb: s.run(sink1).either(),
    zc: s.run(sink2).either(),
    zbc: s.run(sink1.zipPar(sink2)).either()
  }).map(({ zb, zbc, zc }) =>
    zbc.fold(
      (e) => (zb.isLeft() && zb.left === e) || (zc.isLeft() && zc.left === e),
      ({ tuple: [b, c] }) => zb.isRight() && zb.right === b && zc.isRight() && zc.right === c
    )
  )
}

export function createQueueSpy<A>(queue: Queue<A>): Queue<A> {
  let isShutdown = false
  const base: AbstractQueue<Queue<A>, typeof QueueProto> = {
    capacity: queue.capacity,
    size: queue.size,
    awaitShutdown: queue.awaitShutdown,
    shutdown: Effect.succeed(() => {
      isShutdown = true
    }),
    isShutdown: Effect.succeed(isShutdown),
    take: queue.take,
    takeAll: queue.takeAll,
    takeUpTo: queue.takeUpTo,
    offer: queue.offer,
    offerAll: queue.offerAll
  }
  return Object.assign(Object.create(QueueProto), base)
}
