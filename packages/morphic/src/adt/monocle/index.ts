import type { Predicate, Refinement } from "@matechs/core/Function"
import * as At from "@matechs/core/Monocle/At"
import * as Index from "@matechs/core/Monocle/Index"
import * as Lens from "@matechs/core/Monocle/Lens"
import * as Optional from "@matechs/core/Monocle/Optional"
import * as Prism from "@matechs/core/Monocle/Prism"
import type { Option } from "@matechs/core/Option"

interface LensFromProp<S> {
  <P extends keyof S>(prop: P): Lens.Lens<S, S[P]>
}

interface LensFromProps<S> {
  <P extends keyof S>(props: Array<P>): Lens.Lens<
    S,
    {
      [K in P]: S[K]
    }
  >
}

declare type OptionPropertyNames<S> = {
  [K in keyof S]-?: S[K] extends Option<any> ? K : never
}[keyof S]

declare type OptionPropertyType<
  S,
  K extends OptionPropertyNames<S>
> = S[K] extends Option<infer A> ? A : never

interface OptionalFromOptionProp<S> {
  <P extends OptionPropertyNames<S>>(prop: P): Optional.Optional<
    S,
    OptionPropertyType<S, P>
  >
}

interface OptionalFromNullableProp<S> {
  <K extends keyof S>(k: K): Optional.Optional<S, NonNullable<S[K]>>
}

interface IndexFromAt<T> {
  <J, B>(at: At.At<T, J, Option<B>>): Index.Index<T, J, B>
}

interface PrismFromPredicate<S> {
  <A extends S>(refinement: Refinement<S, A>): Prism.Prism<S, A>
  (predicate: Predicate<S>): Prism.Prism<S, S>
}

export interface MonocleFor<S> {
  lensFromProp: LensFromProp<S>
  lensFromProps: LensFromProps<S>
  lensFromPath: Lens.LensFromPath<S>
  indexFromAt: IndexFromAt<S>
  optionalFromOptionProp: OptionalFromOptionProp<S>
  optionalFromNullableProp: OptionalFromNullableProp<S>
  prism: Prism.Prism<Option<S>, S>
  prismFromPredicate: PrismFromPredicate<S>
}

const makeMonocleFor = <S>(): MonocleFor<S> => ({
  lensFromProp: Lens.fromProp(),
  lensFromProps: Lens.fromProps(),
  lensFromPath: Lens.fromPath(),
  indexFromAt: Index.fromAt,
  optionalFromOptionProp: Optional.fromOptionProp(),
  optionalFromNullableProp: Optional.fromNullableProp(),
  prism: Prism.some(),
  prismFromPredicate: Prism.fromPredicate
})

const staticMonocle = makeMonocleFor<any>()

export const MonocleFor = <A>(): MonocleFor<A> => staticMonocle
