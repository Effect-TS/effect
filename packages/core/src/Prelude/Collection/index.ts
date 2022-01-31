// ets_tracing: off

import type * as HKT from "../HKT/index.js"

export interface Collection<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Collection: "Collection"
  readonly builder: <A>() => CollectionBuilder<F, C, A>
}

export interface CollectionBuilder<F extends HKT.URIS, C, A> {
  readonly append: (a: A) => CollectionBuilder<F, C, A>
  readonly build: () => HKT.Kind<
    F,
    C,
    HKT.Initial<C, "K">,
    HKT.Initial<C, "Q">,
    HKT.Initial<C, "W">,
    HKT.Initial<C, "X">,
    HKT.Initial<C, "I">,
    HKT.Initial<C, "S">,
    HKT.Initial<C, "R">,
    HKT.Initial<C, "E">,
    A
  >
}
