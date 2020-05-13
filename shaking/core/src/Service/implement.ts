import * as T from "../Effect"
import type { Provider } from "../Effect"
import { pipe } from "../Pipe"

import type { Implementation } from "./Implementation"
import type { ImplementationEnv } from "./ImplementationEnv"
import type { ModuleSpec } from "./ModuleSpec"
import type { OnlyNew } from "./OnlyNew"
import type { TypeOf } from "./TypeOf"
import { providing } from "./providing"

export function implement<S extends ModuleSpec<any>>(
  s: S,
  inverted: "regular" | "inverted" = "regular"
) {
  return <I extends Implementation<TypeOf<S>>>(
    i: I
  ): Provider<ImplementationEnv<OnlyNew<TypeOf<S>, I>>, TypeOf<S>, never> => (eff) =>
    T.accessM((e: ImplementationEnv<OnlyNew<TypeOf<S>, I>>) =>
      pipe(eff, T.provide(providing(s, i, e), inverted))
    )
}
