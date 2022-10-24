import { CachedURI } from "@effect/core/io/Cached/definition"

/** @internal */
export class CachedInternal<Error, Resource> implements Cached<Error, Resource> {
  readonly [CachedURI] = {
    _Error: (_: never) => _,
    _Resource: (_: never) => _
  }

  constructor(
    readonly ref: ScopedRef<Exit<Error, Resource>>,
    readonly acquire: Effect<Scope, Error, Resource>
  ) {}

  get get(): Effect<never, Error, Resource> {
    return this.ref.get.flatMap(Effect.done)
  }

  get refresh(): Effect<never, Error, void> {
    return this.ref.set<never, Error>(this.acquire.map(Exit.succeed))
  }
}
