import { HKT, Kind6, URIS6 } from "../HKT"

export interface DeriveF<F, Typeclass> {
  readonly Derive: "Derive"
  readonly derive: <A>(fa: HKT<Typeclass, A>) => HKT<Typeclass, HKT<F, A>>
}

export interface Derive66<F extends URIS6, Typeclass extends URIS6> {
  readonly Derive: "Derive"
  readonly derive: <X, I, S, R, E, A>(
    fa: Kind6<Typeclass, X, I, S, R, E, A>
  ) => Kind6<Typeclass, X, I, S, R, E, Kind6<F, X, I, S, R, E, A>>
}

export function makeDerive<F extends URIS6, Typeclass extends URIS6>(
  _: F,
  __: Typeclass
): (_: Omit<Derive66<F, Typeclass>, "Derive">) => Derive66<F, Typeclass>
export function makeDerive<F, Typeclass>(
  _: F,
  __: Typeclass
): (_: Omit<DeriveF<F, Typeclass>, "Derive">) => DeriveF<F, Typeclass> {
  return (_) => ({
    Derive: "Derive",
    ..._
  })
}
