import type { Chunk } from "../../collection/immutable/Chunk/core"
import type { Tuple } from "../../collection/immutable/Tuple"
import { _A } from "../../support/Symbols"
import type { UIO } from "../Effect"

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
