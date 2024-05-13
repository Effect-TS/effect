import * as KeyValueStore from "@effect/platform/KeyValueStore"

/** @internal  */
export const layerSessionStorage = KeyValueStore.layerStorage("layerSessionStorage", sessionStorage)

/** @internal  */
export const layerLocalStorage = KeyValueStore.layerStorage("layerLocalStorage", localStorage)
