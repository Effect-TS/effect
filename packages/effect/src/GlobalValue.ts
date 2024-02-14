/**
 * @since 2.0.0
 */
import * as version from "./internal/version.js"

const globalStoreId = Symbol.for(`effect/GlobalValue/globalStoreId/${version.getCurrentVersion()}`)

if (!(globalStoreId in globalThis)) {
  ;(globalThis as any)[globalStoreId] = new Map()
}

const globalStore = (globalThis as any)[globalStoreId] as Map<unknown, any>

/**
 * @since 2.0.0
 */
export const globalValue = <A>(id: unknown, compute: () => A): A => {
  if (!globalStore.has(id)) {
    globalStore.set(id, compute())
  }
  return globalStore.get(id)!
}
