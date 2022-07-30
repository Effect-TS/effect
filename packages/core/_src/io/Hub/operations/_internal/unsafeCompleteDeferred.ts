/**
 * Unsafely completes a deferred with the specified value.
 */
export function unsafeCompleteDeferred<A>(deferred: Deferred<never, A>, a: A): void {
  deferred.unsafeDone(Effect.succeed(a))
}
