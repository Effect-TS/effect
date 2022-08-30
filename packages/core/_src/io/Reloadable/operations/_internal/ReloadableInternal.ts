import { ReloadableURI } from "@effect/core/io/Reloadable/definition"

export class ReloadableInternal<Service> implements Reloadable<Service> {
  readonly [ReloadableURI] = {
    _Service: (_: never) => _
  }

  constructor(
    readonly scopedRef: ScopedRef<Service>,
    readonly reload: Effect<never, unknown, void>
  ) {}

  get get(): Effect<never, never, Service> {
    return this.scopedRef.get
  }

  get reloadFork(): Effect<never, never, void> {
    return this.reload.ignoreLogged.forkDaemon.unit
  }
}
