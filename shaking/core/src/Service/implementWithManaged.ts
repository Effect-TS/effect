import * as T from "../Effect"
import type { Provider } from "../Effect"
import { use, Managed } from "../Managed"
import { pipe } from "../Pipe"

import type { Implementation } from "./Implementation"
import type { ImplementationEnv } from "./ImplementationEnv"
import type { ModuleSpec } from "./ModuleSpec"
import type { OnlyNew } from "./OnlyNew"
import type { TypeOf } from "./TypeOf"
import { providing } from "./providing"

export function implementWithManaged<SW, RW, EW, AW>(w: Managed<SW, RW, EW, AW>) {
  return <S extends ModuleSpec<any>>(
    s: S,
    inverted: "regular" | "inverted" = "regular"
  ) => <I extends Implementation<TypeOf<S>>>(
    i: (r: AW) => I
  ): Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>> & RW, TypeOf<S>, EW, SW> => (
    eff
  ) =>
    use(w, (r) =>
      T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
        pipe(eff, T.provide(providing(s, i(r), e), inverted))
      )
    )
}
