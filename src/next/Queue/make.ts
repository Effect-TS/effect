import { chain_ } from "../Effect/chain_"
import { Sync } from "../Effect/effect"
import { effectTotal } from "../Effect/effectTotal"
import { Bounded, Unbounded } from "../Support/MutableQueue"

import { BackPressureStrategy } from "./backPressureStrategy"
import { createQueue } from "./createQueue"
import { DroppingStrategy } from "./droppingStrategy"
import { Queue } from "./queue"
import { SlidingStrategy } from "./slidingStrategy"

export const makeSliding = <A>(capacity: number): Sync<Queue<A>> =>
  chain_(
    effectTotal(() => new Bounded<A>(capacity)),
    createQueue(new SlidingStrategy())
  )

export const makeUnbounded = <A>(): Sync<Queue<A>> =>
  chain_(
    effectTotal(() => new Unbounded<A>()),
    createQueue(new DroppingStrategy())
  )

export const makeDropping = <A>(capacity: number): Sync<Queue<A>> =>
  chain_(
    effectTotal(() => new Bounded<A>(capacity)),
    createQueue(new DroppingStrategy())
  )

export const makeBounded = <A>(capacity: number): Sync<Queue<A>> =>
  chain_(
    effectTotal(() => new Bounded<A>(capacity)),
    createQueue(new BackPressureStrategy())
  )
