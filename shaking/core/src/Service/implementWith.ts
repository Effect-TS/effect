import type { Provider } from "../Effect"
import * as T from "../Effect"
import { pipe } from "../Pipe"
import type { Effect } from "../Support/Common"

import type { Implementation } from "./Implementation"
import type { ImplementationEnv } from "./ImplementationEnv"
import type { ModuleSpec } from "./ModuleSpec"
import type { OnlyNew } from "./OnlyNew"
import type { TypeOf } from "./TypeOf"
import { providing } from "./providing"

export function implementWith<SW, RW, EW, AW>(w: Effect<SW, RW, EW, AW>) {
  return <S extends ModuleSpec<any>>(
    s: S,
    inverted: "regular" | "inverted" = "regular"
  ) => <I extends Implementation<TypeOf<S>>>(
    i: (r: AW) => I
  ): Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>> & RW, TypeOf<S>, EW, SW> => (
    eff
  ) =>
    T.chain_(w, (r) =>
      T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
        pipe(eff, T.provide(providing(s, i(r), e), inverted))
      )
    )
}
