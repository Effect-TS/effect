import { Dequeue } from "../Support/Dequeue"

export const unboundedOffer = <A>(queue: Dequeue<A>, a: A): Dequeue<A> => queue.offer(a)
