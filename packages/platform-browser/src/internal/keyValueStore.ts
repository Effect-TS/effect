import * as KeyValueStore from "@effect/platform/KeyValueStore"

/** @internal  */
export const layerSessionStorage = KeyValueStore.layerStorage(() => sessionStorage)

/** @internal  */
export const layerLocalStorage = KeyValueStore.layerStorage(() => localStorage)
