import { ErrFor, HasURI, URIS } from "../../HKT"

export interface IdentityErrF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly combineErr: <E>(
    y: ErrFor<F, Fix0, Fix1, Fix2, Fix3, E>
  ) => <E2>(
    x: ErrFor<F, Fix0, Fix1, Fix2, Fix3, E2>
  ) => ErrFor<F, Fix0, Fix1, Fix2, Fix3, E | E2>
}

export interface IdentityErrK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly combineErr: <E>(
    y: ErrFor<F, Fix0, Fix1, Fix2, Fix3, E>
  ) => <E2>(
    x: ErrFor<F, Fix0, Fix1, Fix2, Fix3, E2>
  ) => ErrFor<F, Fix0, Fix1, Fix2, Fix3, E | E2>
}

export function makeIdentityErr<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    IdentityErrK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityErrK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeIdentityErr<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    IdentityErrF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityErrF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeIdentityErr<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    IdentityErrF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityErrF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}
