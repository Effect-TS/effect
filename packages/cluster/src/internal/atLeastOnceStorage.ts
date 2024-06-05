import * as Context from "effect/Context"
import type * as AtLeastOnceStorage from "../AtLeastOnceStorage.js"

/** @internal */
const AtLeastOnceStorageSymbolKey = "@effect/cluster/AtLeastOnceStorage"

/** @internal */
export const AtLeastOnceStorageTypeId: AtLeastOnceStorage.AtLeastOnceStorageTypeId = Symbol.for(
  AtLeastOnceStorageSymbolKey
) as AtLeastOnceStorage.AtLeastOnceStorageTypeId

/** @internal */
export const atLeastOnceStorageTag: Context.Tag<
  AtLeastOnceStorage.AtLeastOnceStorage,
  AtLeastOnceStorage.AtLeastOnceStorage
> = Context.GenericTag<AtLeastOnceStorage.AtLeastOnceStorage>(AtLeastOnceStorageSymbolKey)

/** @internal */
export function make(
  data: Omit<AtLeastOnceStorage.AtLeastOnceStorage, AtLeastOnceStorage.AtLeastOnceStorageTypeId>
): AtLeastOnceStorage.AtLeastOnceStorage {
  return ({ [AtLeastOnceStorageTypeId]: AtLeastOnceStorageTypeId, ...data })
}
