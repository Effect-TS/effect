export function unsafeCompleteDeferred<A>(deferred: Deferred<never, A>, a: A): void {
  return deferred.unsafeDone(Effect.succeedNow(a));
}
