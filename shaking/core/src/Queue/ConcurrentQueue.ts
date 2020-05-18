import { Async } from "../Effect"

export interface ConcurrentQueue<A> {
  readonly take: Async<A>
  offer(a: A): Async<void>
}
