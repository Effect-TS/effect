import { HKT, Kind, URIS } from "fp-ts/lib/HKT";

/**
 * Abstractly specify the initial algebra of a Functor F as its fixed point.
 */
export interface FixN<F> {
  readonly unfix: HKT<F, FixN<F>>;
}

/**
 * Abstractly specify the initial algebra of a Functor F as its fixed point.
 */
export interface Fix<F extends URIS> {
  readonly unfix: Kind<F, Fix<F>>;
}

/**
 * Construct a fixed point (invariant) for an F-Algebra.
 */
export function fix<F extends URIS>(unfix: Kind<F, Fix<F>>): Fix<F>;
export function fix<F>(unfix: HKT<F, FixN<F>>): FixN<F> {
  return {
    unfix
  };
}
