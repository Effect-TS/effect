import { None } from "../Fiber"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import type { MutableQueue } from "../Support/MutableQueue"
import { Bounded, Unbounded } from "../Support/MutableQueue"
import type { Strategy } from "./core"
import {
  BackPressureStrategy,
  DroppingStrategy,
  SlidingStrategy,
  unsafeCreate
} from "./core"
import * as P from "./promise"
import type { Queue } from "./xqueue"

export function unsafeCreateQueue<A>(strategy: Strategy<A>) {
  return (queue: MutableQueue<A>) =>
    unsafeCreate(
      queue,
      new Unbounded(),
      P.unsafeMake<never, void>(None),
      new AtomicBoolean(false),
      strategy
    )
}

export function unsafeMakeSliding<A>(capacity: number): Queue<A> {
  return unsafeCreateQueue(new SlidingStrategy<A>())(new Bounded<A>(capacity))
}

export function unsafeMakeUnbounded<A>(): Queue<A> {
  return unsafeCreateQueue(new DroppingStrategy<A>())(new Unbounded<A>())
}

export function unsafeMakeDropping<A>(capacity: number): Queue<A> {
  return unsafeCreateQueue(new DroppingStrategy<A>())(new Bounded<A>(capacity))
}

export function unsafeMakeBounded<A>(capacity: number): Queue<A> {
  return unsafeCreateQueue(new BackPressureStrategy<A>())(new Bounded<A>(capacity))
}
