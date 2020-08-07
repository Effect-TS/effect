import { HKT, Kind, URIS } from "../HKT"

export interface Derive<F, Typeclass> {
  readonly Derive: "Derive"
  readonly derive: <A>(fa: HKT<Typeclass, A>) => HKT<Typeclass, HKT<F, A>>
}

export interface Derive11<F extends URIS, Typeclass extends URIS> {
  readonly Derive: "Derive"
  readonly derive: <A>(fa: Kind<Typeclass, A>) => Kind<Typeclass, Kind<F, A>>
}
