import { _In, _Out, QueueSym } from "@effect/core/io/Queue"
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
  return new QueueSpyImplementation(queue)
}

class QueueSpyImplementation<A> implements Queue<A> {
  readonly [QueueSym]: QueueSym = QueueSym
  readonly [_In]!: (_: A) => void
  readonly [_Out]!: () => A

  #isShutdown = false

  constructor(readonly queue: Queue<A>) {}

  awaitShutdown: Effect.UIO<void> = this.queue.awaitShutdown

  capacity: number = this.queue.capacity

  isShutdown: Effect.UIO<boolean> = Effect.succeed(this.#isShutdown)

  offer(a: A): Effect<never, never, boolean> {
    return this.queue.offer(a)
  }

  offerAll(as: Collection<A>): Effect<never, never, boolean> {
    return this.queue.offerAll(as)
  }

  shutdown: Effect.UIO<void> = Effect.succeed(() => {
    this.#isShutdown = true
  })

  size: Effect.UIO<number> = this.queue.size

  take: Effect<never, never, A> = this.queue.take

  takeAll: Effect<never, never, Chunk<A>> = this.queue.takeAll

  takeUpTo(n: number): Effect<never, never, Chunk<A>> {
    return this.queue.takeUpTo(n)
  }
}
