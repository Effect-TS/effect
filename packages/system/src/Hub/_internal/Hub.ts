import * as H from "../../Case/HasHash"
import type * as AR from "../../Collections/Immutable/Array"
import * as HH from "../../Hash"

export abstract class Subscription<A> implements H.HasHash {
  abstract isEmpty(): boolean
  abstract poll(default_: A): A
  abstract pollUpTo(n: number): AR.Array<A>
  abstract size(): number
  abstract unsubscribe(): void

  [H.hashSym]() {
    return HH.incrementalHash(this)
  }
}

export abstract class Hub<A> {
  abstract readonly capacity: number
  abstract isEmpty(): boolean
  abstract isFull(): boolean
  abstract publish(a: A): boolean
  abstract publishAll(as: Iterable<A>): AR.Array<A>
  abstract size(): number
  abstract slide(): void
  abstract subscribe(): Subscription<A>
}
