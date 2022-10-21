import type { Effect } from "@effect/core/io/Effect"
import type { Dequeue } from "@effect/core/io/Queue/definition"
import { _Out, QueueSym } from "@effect/core/io/Queue/definition"
import type { Chunk } from "@tsplus/stdlib/collections/Chunk"
import type { Maybe } from "@tsplus/stdlib/data/Maybe"

class MapDequeueImpl<A, B> implements Dequeue<B> {
  constructor(
    readonly dequeue: Dequeue<A>,
    readonly f: (a: A) => B
  ) {}
  get take(): Effect<never, never, B> {
    return this.dequeue.take.map(this.f)
  }
  get takeAll(): Effect<never, never, Chunk<B>> {
    return this.dequeue.takeAll.map((all) => all.map(this.f))
  }
  takeUpTo(this: this, max: number): Effect<never, never, Chunk<B>> {
    return this.dequeue.takeUpTo(max).map((upTo) => upTo.map(this.f))
  }
  takeBetween(this: this, min: number, max: number): Effect<never, never, Chunk<B>> {
    return this.dequeue.takeBetween(min, max).map((upTo) => upTo.map(this.f))
  }
  takeN(this: this, n: number): Effect<never, never, Chunk<B>> {
    return this.dequeue.takeN(n).map((upTo) => upTo.map(this.f))
  }
  get poll(): Effect<never, never, Maybe<B>> {
    return this.dequeue.poll.map((m) => m.map(this.f))
  }
  get [_Out](): (_: never) => B {
    return (a) => a
  }
  get capacity(): number {
    return this.dequeue.capacity
  }
  get size(): Effect<never, never, number> {
    return this.dequeue.size
  }
  get awaitShutdown(): Effect<never, never, void> {
    return this.dequeue.awaitShutdown
  }
  get isShutdown(): Effect<never, never, boolean> {
    return this.dequeue.isShutdown
  }
  get shutdown(): Effect<never, never, void> {
    return this.dequeue.shutdown
  }
  get isFull(): Effect<never, never, boolean> {
    return this.dequeue.isFull
  }
  get isEmpty(): Effect<never, never, boolean> {
    return this.dequeue.isEmpty
  }
  get [QueueSym](): QueueSym {
    return QueueSym
  }
}

export function mapDequeue<A, B>(dequeue: Dequeue<A>, f: (a: A) => B): Dequeue<B> {
  return new MapDequeueImpl(dequeue, f)
}
