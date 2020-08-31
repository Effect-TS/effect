import type { SyncR } from "./definitions"
import { environment } from "./environment"
import { map } from "./map"

/**
 * Accesses the environment of the stream.
 */
export function access<R, A>(f: (r: R) => A): SyncR<R, A> {
  return map(f)(environment<R>())
}
