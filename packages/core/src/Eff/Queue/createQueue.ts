import { map_ } from "../Effect/map_"
import { make as promiseMake } from "../Promise/make"
import { AtomicBoolean } from "../Support/AtomicBoolean"
import { MutableQueue, Unbounded } from "../Support/MutableQueue"

import { Strategy } from "./strategy"
import { unsafeCreate } from "./unsafeCreate"

export const createQueue = <A>(strategy: Strategy<A>) => (queue: MutableQueue<A>) =>
  map_(promiseMake<never, void>(), (p) =>
    unsafeCreate(queue, new Unbounded(), p, new AtomicBoolean(false), strategy)
  )
