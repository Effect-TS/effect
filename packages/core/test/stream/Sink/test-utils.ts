import { Effect } from "@effect/core/io/Effect"
import { _In, _Out, QueueSym } from "@effect/core/io/Queue"
import type { Chunk } from "@tsplus/stdlib/collections/Chunk"
import type { Collection } from "@tsplus/stdlib/collections/Collection"
import { constVoid } from "@tsplus/stdlib/data/Function"
import { Maybe } from "@tsplus/stdlib/data/Maybe"

export function findSink<A>(a: A): Sink<never, void, A, A, A> {
  return Sink.fold<A, Maybe<A>>(
    Maybe.none,
    (option) => option.isNone(),
    (_, v) => (a === v ? Maybe.some(a) : Maybe.none)
  ).mapEffect((option) => option.fold(Effect.failSync(constVoid), Effect.succeed))
}

export function sinkRaceLaw<E, A, L>(
  s: Stream<never, never, A>,
  sink1: Sink<never, E, A, L, A>,
  sink2: Sink<never, E, A, L, A>
): Effect<never, never, boolean> {
  return Effect.struct({
    r1: s.run(sink1).either,
    r2: s.run(sink2).either,
    r: s.run(sink1.raceBoth(sink2)).either
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
): Effect<never, never, boolean> {
  return Effect.struct({
    zb: s.run(sink1).either,
    zc: s.run(sink2).either,
    zbc: s.run(sink1.zipPar(sink2)).either
  }).map(({ zb, zbc, zc }) =>
    zbc.fold(
      (e) => (zb.isLeft() && zb.left === e) || (zc.isLeft() && zc.left === e),
      ([b, c]) => zb.isRight() && zb.right === b && zc.isRight() && zc.right === c
    )
  )
}

export function createQueueSpy<A>(queue: Queue<A>): Queue<A> {
  return new Spy(queue)
}

class Spy<A> implements Queue<A> {
  private isShutdownInternal = false
  constructor(readonly queue: Queue<A>) {}

  get [_In](): (_: A) => void {
    throw new Error("Method not implemented.")
  }

  get [QueueSym](): QueueSym {
    return this.queue[QueueSym]
  }

  get [_Out](): () => A {
    throw new Error("Method not implemented.")
  }

  offer(a: A) {
    return this.queue.offer(a)
  }

  offerAll(as: Collection<A>) {
    return this.queue.offerAll(as)
  }

  get capacity(): number {
    return this.queue.capacity
  }

  get size(): Effect<never, never, number> {
    return this.queue.size
  }

  get awaitShutdown(): Effect<never, never, void> {
    return this.queue.awaitShutdown
  }

  get isShutdown(): Effect<never, never, boolean> {
    return Effect.sync(this.isShutdownInternal)
  }

  get shutdown(): Effect<never, never, void> {
    return Effect.sync(() => {
      this.isShutdownInternal = true
    })
  }

  get isFull(): Effect<never, never, boolean> {
    return this.queue.isFull
  }

  get isEmpty(): Effect<never, never, boolean> {
    return this.queue.isEmpty
  }

  get take(): Effect<never, never, A> {
    return this.queue.take
  }

  get takeAll(): Effect<never, never, Chunk<A>> {
    return this.queue.takeAll
  }

  takeUpTo(max: number): Effect<never, never, Chunk<A>> {
    return this.queue.takeUpTo(max)
  }

  takeBetween(min: number, max: number): Effect<never, never, Chunk<A>> {
    return this.queue.takeBetween(min, max)
  }

  takeN(n: number): Effect<never, never, Chunk<A>> {
    return this.queue.takeN(n)
  }

  get poll(): Effect<never, never, Maybe<A>> {
    return this.queue.poll
  }
}
