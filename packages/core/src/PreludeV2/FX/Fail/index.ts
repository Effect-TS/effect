import type * as HKT from "../../HKT"

export interface Fail<F extends HKT.HKT> {
  readonly fail: <E = never>(e: E) => HKT.Kind<F, any, unknown, unknown, E, never>
}
