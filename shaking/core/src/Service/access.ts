import * as T from "../Effect"

import type { Derived } from "./Derived"
import type { ModuleShape } from "./ModuleShape"
import type { ModuleSpec } from "./ModuleSpec"
import { specURI } from "./specURI"

export function access<A extends ModuleShape<A>>(sp: ModuleSpec<A>): Derived<A> {
  const derived = {} as any
  const a = sp[specURI] as any
  for (const s of Reflect.ownKeys(a)) {
    derived[s] = {}
    for (const k of Object.keys(a[s])) {
      if (typeof a[s][k] === "function") {
        derived[s][k] = (...args: any[]) => T.accessM((r: any) => r[s][k](...args))
      } else {
        derived[s][k] = T.accessM((r: any) => r[s][k])
      }
    }
  }
  return derived
}
