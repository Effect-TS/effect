import { _Out, QueueSym } from "@effect/core/io/Queue/definition"

export function mapDequeue<A, B>(dequeue: Dequeue<A>, f: (a: A) => B): Dequeue<B> {
  return new MapDequeueImplementation(dequeue, f)
}

class MapDequeueImplementation<A, B> implements Dequeue<B> {
  readonly [QueueSym]: QueueSym = QueueSym
  readonly [_Out]!: () => B

  constructor(readonly dequeue: Dequeue<A>, readonly f: (a: A) => B) {}

  capacity: number = this.dequeue.capacity

  size: Effect<never, never, number> = this.dequeue.size

  awaitShutdown: Effect<never, never, void> = this.dequeue.awaitShutdown

  shutdown: Effect<never, never, void> = this.dequeue.shutdown

  isShutdown: Effect<never, never, boolean> = this.dequeue.isShutdown

  take: Effect<never, never, B> = this.dequeue.take.map((a) => this.f(a))

  takeAll: Effect<never, never, Chunk<B>> = this.dequeue.takeAll.map((chunk) => chunk.map((a) => this.f(a)))

  takeUpTo(max: number, __tsplusTrace?: string): Effect<never, never, Chunk<B>> {
    return this.dequeue.takeUpTo(max).map((chunk) => chunk.map((a) => this.f(a)))
  }
}
