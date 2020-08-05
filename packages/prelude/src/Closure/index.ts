import { And, BooleanProd, BooleanSum, Or, Prod, StringSum, Sum } from "../Newtype"

import { pipe } from "@matechs/core/Function"

export interface Closure<A> {
  combine(l: A, r: A): A
}

export const make = <A>(f: (l: A, r: A) => A): Closure<A> => ({ combine: f })

export const BooleanConjunctionClosure: Closure<And> = make<And>((l, r) =>
  And.wrap(And.unwrap(l) && And.unwrap(r))
)

export const BooleanDisjunctionClosure: Closure<Or> = make<Or>((l, r) =>
  Or.wrap(Or.unwrap(l) || Or.unwrap(r))
)

export const BooleanProdClosure: Closure<Prod<boolean>> = make<Prod<boolean>>((l, r) =>
  BooleanProd.wrap(BooleanProd.unwrap(l) && BooleanProd.unwrap(r))
)

export const BooleanSumClosure: Closure<Sum<boolean>> = make<Sum<boolean>>((l, r) =>
  BooleanSum.wrap(BooleanSum.unwrap(l) || BooleanSum.unwrap(r))
)

export function ArraySumClosure<A>(): Closure<Sum<readonly A[]>> {
  return pipe(Sum<readonly A[]>(), (SumArray) =>
    make((l, r) => SumArray.wrap([...SumArray.unwrap(l), ...SumArray.unwrap(r)]))
  )
}

export const StringSumClosure: Closure<Sum<string>> = make((l, r) =>
  StringSum.wrap(`${StringSum.unwrap(l)}${StringSum.unwrap(r)}`)
)
