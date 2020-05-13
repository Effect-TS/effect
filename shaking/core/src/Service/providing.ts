import type { Implementation } from "./Implementation"
import type { ImplementationEnv } from "./ImplementationEnv"
import type { ModuleShape } from "./ModuleShape"
import type { ModuleSpec } from "./ModuleSpec"
import type { OnlyNew } from "./OnlyNew"
import type { TypeOf } from "./TypeOf"
import { specURI } from "./specURI"

export function providing<
  M extends ModuleShape<M>,
  S extends ModuleSpec<M>,
  I extends Implementation<M>
>(s: S, a: I, env: ImplementationEnv<OnlyNew<M, I>>): TypeOf<S> {
  const r = {} as any
  for (const sym of Reflect.ownKeys((s as any)[specURI])) {
    r[sym] = {}
    for (const entry of Object.keys((s as any)[specURI][sym])) {
      if (typeof (a as any)[sym][entry] === "function") {
        r[sym][entry] = (...args: any[]) =>
          T.provide(env, "inverted")((a as any)[sym][entry](...args))
      } else if (typeof (a as any)[sym][entry] === "object") {
        r[sym][entry] = T.provide(env, "inverted")((a as any)[sym][entry])
      }
    }
  }
  return r
}
