import { ReloadableURI } from "@effect/core/io/Reloadable/definition"
import { Tag } from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as WeakIterableMap from "@fp-ts/data/weak/WeakIterableMap"

/** @internal */
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

const tagMap = WeakIterableMap.make<Tag<any>, Tag<any>>([])

/** @internal */
export function reloadableTag<S>(tag: Tag<S>): Tag<Reloadable<S>> {
  const already = pipe(tagMap, WeakIterableMap.get(tag))
  if (Option.isSome(already)) {
    return already.value
  }
  const newTag = Tag<Reloadable<S>>()
  pipe(tagMap, WeakIterableMap.set(tag, newTag))
  return newTag
}
