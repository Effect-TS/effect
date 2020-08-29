import type { Sync } from "./definitions"
import { fromArray } from "./fromArray"

export const succeed = <A>(a: A): Sync<A> => fromArray([a])
