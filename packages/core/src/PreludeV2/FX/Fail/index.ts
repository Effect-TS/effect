import type * as HKT from "../../HKT"

// E -> F<E, never>
export interface Fail<F extends HKT.HKT> {
  readonly fail: <E = never>(e: E) => HKT.Kind<F, any, any, any, unknown, E, never>
}
