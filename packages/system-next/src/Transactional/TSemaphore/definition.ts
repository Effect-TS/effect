// ets_tracing: off

import type { TRef } from "../TRef"

/**
 * A `TSemaphore` is a semaphore that can be composed transactionally. Because
 * of the extremely high performance of Effect's implementation of software
 * transactional memory `TSemaphore` can support both controlling access to some
 * resource on a standalone basis as well as composing with other STM data
 * structures to solve more advanced concurrency problems.
 *
 * For basic use cases, the most idiomatic way to work with a semaphore is to
 * use the `withPermit` operator, which acquires a permit before executing some
 * effect and release the permit immediately afterward. The permit is guaranteed
 * to be released immediately after the effect completes execution, whether by
 * success, failure, or interruption. Attempting to acquire a permit when a
 * sufficient number of permits are not available will semantically block until
 * permits become available without blocking any underlying operating system
 * threads. If you want to acquire more than one permit at a time you can use
 * `withPermits`, which allows specifying a number of permits to acquire. You
 * can also use `withPermitManaged` or `withPermitsManaged` to acquire and
 * release permits within the context of a managed effect for composing with
 * other resources.
 *
 * For more advanced concurrency problems you can use the `acquire` and
 * `release` operators directly, or their variants `acquireN` and `releaseN`,
 * all of which return STM transactions. Thus, they can be composed to form
 * larger STM transactions, for example acquiring permits from two different
 * semaphores transactionally and later releasing them transactionally to safely
 * synchronize on access to two different mutable variables.
 */
export class TSemaphore {
  constructor(readonly permits: TRef<number>) {}
}
