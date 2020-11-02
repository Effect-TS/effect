import * as Lens from "@effect-ts/monocle/Lens"
import * as Optional from "@effect-ts/monocle/Optional"
import * as Prism from "@effect-ts/monocle/Prism"

export interface MonocleFor<S> {
  lens: Lens.Lens<S, S>
  prism: Prism.Prism<S, S>
  optional: Optional.Optional<S, S>
}

const makeMonocleFor = <S>(): MonocleFor<S> => ({
  lens: Lens.id(),
  prism: Prism.id(),
  optional: Optional.id()
})

const staticMonocle = makeMonocleFor<any>()

export const MonocleFor = <A>(): MonocleFor<A> => staticMonocle
