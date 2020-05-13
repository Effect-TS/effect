import { pipe } from "../Pipe"
import type { Dequeue } from "../Support/Dequeue"

export const slidingOffer = (n: number) => <A>(queue: Dequeue<A>, a: A): Dequeue<A> =>
  queue.size() >= n
    ? pipe(
        queue.take(),
        O.map((t) => t[1]),
        O.getOrElse(() => queue)
      ).offer(a)
    : queue.offer(a)
