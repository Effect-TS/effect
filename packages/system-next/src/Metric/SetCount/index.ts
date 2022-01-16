// ets_tracing: off

import type { Chunk } from "../../Collections/Immutable/Chunk"
import type { Tuple } from "../../Collections/Immutable/Tuple"
import { _A } from "../../Effect"
import type { UIO } from "../_internal/effect"

/**
 * A `SetCount` represents the number of occurrences of specified values. You
 * can think of a `SetCount` as like a set of counters associated with each
 * value except that new counters will automatically be created when new values
 * are observed. This could be used to track the frequency of different types of
 * failures, for example.
 */
export class SetCount<A> {
  readonly [_A]: (_: A) => A

  constructor(
    /**
     * The number of occurences of every value observed by this set count.
     */
    readonly occurrences: UIO<Chunk<Tuple<[string, number]>>>,
    /**
     * The number of occurences of the specified value observed by this set count.
     */
    readonly occurrencesFor: (word: string, __trace?: string) => UIO<number>,
    /**
     * Increments the counter associated with the specified value by one.
     */
    readonly observe: (word: string, __trace?: string) => UIO<any>,

    readonly unsafeOccurrences: () => Chunk<Tuple<[string, number]>>,
    readonly unsafeOccurrencesFor: (word: string) => number,
    readonly unsafeObserve: (word: string) => void
  ) {}
}
