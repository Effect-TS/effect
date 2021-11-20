import type * as Tp from "../../Collections/Immutable/Tuple"
import type { Has, ServiceConstructor, Tag, TypeTag } from "../../Has"
import { tag } from "../../Has"
import * as T from ".."
import * as FRef from "../FiberRef"
import * as L from "../Layer"

export interface State<S> {
  readonly serviceId: `@effect-ts/core/Effect/State<${TypeTag<S>}>`

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

function makeState<S>(
  initial: S
): T.Effect<unknown, never, ServiceConstructor<State<S>>> {
  return T.map_(FRef.make(initial), (ref) => ({
    get: FRef.get(ref),
    modify: (f) => FRef.modify_(ref, f),
    set: (s) => FRef.set_(ref, s),
    update: (f) => FRef.update_(ref, f)
  }))
}

export function State<S>(S: TypeTag<S>): StateExternal<S> {
  const Tag = tag<State<S>>(`@effect-ts/core/Effect/State<${S}>`)
  const derived = T.deriveLifted(Tag)(["set", "update"], ["get"], [])

  return {
    Tag,
    modify: (f) => T.accessServiceM(Tag)((_) => _.modify(f)),
    runState: (s) => T.provideServiceM(Tag)(makeState(s)),
    Live: (s) => L.fromEffect(Tag)(makeState(s)),
    ...derived
  }
}
