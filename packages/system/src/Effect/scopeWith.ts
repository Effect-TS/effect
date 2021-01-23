import type { Exit } from "../Exit"
import type { Scope } from "../Scope"
import { descriptorWith } from "./core"
import type { Effect } from "./effect"

export function scopeWith<R, E, A>(
  f: (scope: Scope<Exit<any, any>>) => Effect<R, E, A>
): Effect<R, E, A> {
  return descriptorWith((d) => f(d.scope))
}
