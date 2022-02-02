// ets_tracing: off

import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type { Has, Tag } from "../../Has/index.js"
import { tag } from "../../Has/index.js"
import * as T from "../index.js"
import * as L from "../Layer/index.js"
import * as Ref from "../Ref/index.js"

export interface State<S> {
  //readonly serviceId: `@effect-ts/core/Effect/State<${TypeTag<S>}>`

  readonly get: T.Effect<unknown, never, S>

  readonly set: (s: S) => T.Effect<unknown, never, void>

  readonly update: (f: (s: S) => S) => T.Effect<unknown, never, void>

  readonly modify: <A>(f: (s: S) => Tp.Tuple<[A, S]>) => T.Effect<unknown, never, A>
}

export interface StateExternal<S> {
  readonly Tag: Tag<State<S>>

  readonly get: T.Effect<Has<State<S>>, never, S>

  readonly set: (s: S) => T.Effect<Has<State<S>>, never, void>

  readonly update: (f: (s: S) => S) => T.Effect<Has<State<S>>, never, void>

  readonly modify: <A>(
    f: (s: S) => Tp.Tuple<[A, S]>
  ) => T.Effect<Has<State<S>>, never, A>

  readonly runState: (
    s: S
  ) => <R, E, A>(self: T.Effect<Has<State<S>> & R, E, A>) => T.Effect<R, E, A>

  readonly Live: (s: S) => L.Layer<unknown, never, Has<State<S>>>
}

export function makeState<S>(initial: S): T.Effect<unknown, never, State<S>> {
  return T.map_(Ref.makeRef(initial), (ref) => ({
    get: Ref.get(ref),
    modify: (f) => Ref.modify_(ref, f),
    set: (s) => Ref.set_(ref, s),
    update: (f) => Ref.update_(ref, f)
  }))
}

export function State<S>(S: PropertyKey): StateExternal<S> {
  const Tag = tag<State<S>>(S)
  const derived = T.deriveLifted(Tag)(["set", "update"], ["get"], [])

  return {
    Tag,
    modify: (f) => T.accessServiceM(Tag)((_) => _.modify(f)),
    runState: (s) => T.provideServiceM(Tag)(makeState(s)),
    Live: (s) => L.fromEffect(Tag)(makeState(s)),
    ...derived
  }
}
