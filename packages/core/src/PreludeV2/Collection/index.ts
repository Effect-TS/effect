// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Collection<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly builder: <A>() => CollectionBuilder<F, A>
}

export interface CollectionBuilder<F extends HKT.HKT, A> {
  readonly append: (a: A) => CollectionBuilder<F, A>
  readonly build: () => HKT.Kind<F, any, unknown, unknown, never, A>
}
