import { CachedInternal } from "@effect/core/io/Cached/operations/_internal/CachedInternal"

/**
 * Creates a new `Cached` value that must be manually refreshed by calling
 * the refresh method. Note that error retrying is not performed
 * automatically, so if you want to retry on errors, you should first apply
 * retry policies to the acquisition effect before passing it to this
 * constructor.
 *
 * @tsplus static effect/core/io/Cached.Ops manual
 */
export function manual<R, Error, Resource>(
  acquire: Effect<R, Error, Resource>
): Effect<R | Scope, never, Cached<Error, Resource>> {
  return Do(($) => {
    const env = $(Effect.environment<R>())
    const ref = $(ScopedRef.fromAcquire(acquire.exit))
    return new CachedInternal(ref, acquire.provideEnvironment(env))
  })
}
