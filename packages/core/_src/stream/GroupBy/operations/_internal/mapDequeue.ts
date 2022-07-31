import type { AbstractQueue, Dequeue } from "@effect/core/io/Queue/definition"
import { _Out, QueueProto } from "@effect/core/io/Queue/definition"

export function mapDequeue<A, B>(dequeue: Dequeue<A>, f: (a: A) => B): Dequeue<B> {
  const base: AbstractQueue<Dequeue<B>, typeof QueueProto> = {
    capacity: dequeue.capacity,
    size: dequeue.size,
    awaitShutdown: dequeue.awaitShutdown,
    shutdown: dequeue.shutdown,
    isShutdown: dequeue.isShutdown,
    take: dequeue.take.map((a) => f(a)),
    takeAll: dequeue.takeAll.map((chunk) => chunk.map((a) => f(a))),
    takeUpTo(this, max) {
      return dequeue.takeUpTo(max).map((chunk) => chunk.map((a) => f(a)))
    }
  }
  return Object.setPrototypeOf(base, QueueProto)
}
