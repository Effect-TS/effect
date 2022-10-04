import { ScopedRefURI } from "@effect/core/io/ScopedRef/definition"

export class ScopedRefInternal<A> implements ScopedRef<A> {
  constructor(readonly ref: Ref.Synchronized<readonly [Scope.Closeable, A]>) {}
  readonly [ScopedRefURI] = {
    _A: (_: never) => _
  }

  get get(): Effect<never, never, A> {
    return this.ref.get.map((tuple) => tuple[1])
  }

  get close(): Effect<never, never, void> {
    return this.ref.get.flatMap(([scope, _]) => scope.close(Exit.unit))
  }

  set<R, E>(this: this, acquire: Effect<Scope | R, E, A>): Effect<R, E, void> {
    return this.ref.modifyEffect(([oldScope, a]) =>
      Effect.uninterruptibleMask(({ restore }) =>
        Do(($) => {
          const newScope = $(Scope.make)
          const exit = $(
            restore(
              acquire.provideSomeEnvironment((env: Env<R>) => env.add(Scope.Tag, newScope))
            ).exit
          )
          return $(exit.fold(
            (cause) =>
              newScope.close(Exit.unit).ignore.as(
                [
                  Effect.failCause(cause) as unknown as Effect<never, never, void>,
                  [oldScope, a] as const
                ] as const
              ),
            (a) =>
              oldScope.close(Exit.unit).ignore.as([Effect.unit, [newScope, a] as const] as const)
          ))
        })
      )
    ).flatten
  }

  setAsync<R, E>(this: this, acquire: Effect<Scope | R, E, A>): Effect<R, E, void> {
    return this.set(acquire).forkDaemon.unit
  }
}
