import type { Chunk } from "../../collection/immutable/Chunk"
import type { Option } from "../../data/Option"
import type { Effect } from "../../io/Effect"

/**
 * @tsplus type ets/Pull
 */
export type Pull<R, E, A> = Effect<R, Option<E>, Chunk<A>>

/**
 * @tsplus type ets/PullOps
 */
export interface PullOps {}
export const Pull: PullOps = {}
