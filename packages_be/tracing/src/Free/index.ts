import * as TR from "../Tracing"

import * as T from "@matechs/core/Effect"
import * as F from "@matechs/core/Service"

export function access<A extends F.ModuleShape<A>>(sp: F.ModuleSpec<A>): F.Derived<A> {
  const derived = {} as F.Derived<A>
  const a: F.ModuleShape<A> = sp[F.specURI]

  for (const s of Reflect.ownKeys(a)) {
    derived[s] = {}

    for (const k of Object.keys(a[s])) {
      if (typeof a[s][k] === "function") {
        derived[s][k] = (...args: any[]) =>
          TR.withChildSpan(k)(T.accessM((r: A) => r[s][k](...args)))
      } else {
        derived[s][k] = TR.withChildSpan(k)(T.accessM((r: A) => r[s][k]))
      }
    }
  }

  return derived
}
