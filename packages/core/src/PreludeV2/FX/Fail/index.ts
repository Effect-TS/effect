import type * as HKT from "../../HKT/index.js"

export interface Fail<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly fail: <E = never>(e: E) => HKT.Kind<F, unknown, E, never>
}
