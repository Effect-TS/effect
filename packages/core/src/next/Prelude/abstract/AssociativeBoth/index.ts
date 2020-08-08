import { HasURI, HKT8, KindEx, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeBothF<F> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <O, O2, X2, In2, St, Env2, Err2, B>(
    fb: HKT8<F, O, O2, X2, In2, St, Env2, Err2, B>
  ) => <I, X, In, Env, Err, A>(
    fa: HKT8<F, I, O, X, In, St, Env, Err, A>
  ) => HKT8<F, I, O2, X2 | X, In2 & In, St, Env2 & Env, Err2 | Err, readonly [A, B]>
}

export interface AssociativeBothK<F extends URIS> extends HasURI<F> {
  readonly AssociativeBoth: "AssociativeBoth"
  readonly both: <O, O2, X2, In2, St, Env2, Err2, B>(
    fb: KindEx<F, O, O2, X2, In2, St, Env2, Err2, B>
  ) => <I, X, In, Env, Err, A>(
    fa: KindEx<F, I, O, X, In, St, Env, Err, A>
  ) => KindEx<F, I, O2, X2 | X, In2 & In, St, Env2 & Env, Err2 | Err, readonly [A, B]>
}

export function makeAssociativeBoth<URI extends URIS>(
  _: URI
): (_: Omit<AssociativeBothK<URI>, "URI" | "AssociativeBoth">) => AssociativeBothK<URI>
export function makeAssociativeBoth<URI>(
  URI: URI
): (_: Omit<AssociativeBothF<URI>, "URI" | "AssociativeBoth">) => AssociativeBothF<URI>
export function makeAssociativeBoth<URI>(
  URI: URI
): (
  _: Omit<AssociativeBothF<URI>, "URI" | "AssociativeBoth">
) => AssociativeBothF<URI> {
  return (_) => ({
    URI,
    AssociativeBoth: "AssociativeBoth",
    ..._
  })
}
