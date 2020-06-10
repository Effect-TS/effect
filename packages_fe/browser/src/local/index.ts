import { GenericStorage, getStorageImpl } from "../generic"

import * as T from "@matechs/core/Effect"
import * as L from "@matechs/core/Layer"

export const LocalStorageURI = "@matechs/browser/LocalStorageURI"

export interface LocalStorage {
  [LocalStorageURI]: GenericStorage<unknown>
}

export const length = T.accessM(({ [LocalStorageURI]: s }: LocalStorage) => s.length)

export const clear = T.accessM(({ [LocalStorageURI]: s }: LocalStorage) => s.clear)

export const getItem = (key: string) =>
  T.accessM(({ [LocalStorageURI]: s }: LocalStorage) => s.getItem(key))

export const key = (index: number) =>
  T.accessM(({ [LocalStorageURI]: s }: LocalStorage) => s.key(index))

export const removeItem = (key: string) =>
  T.accessM(({ [LocalStorageURI]: s }: LocalStorage) => s.removeItem(key))

export const setItem = (key: string, value: string) =>
  T.accessM(({ [LocalStorageURI]: s }: LocalStorage) => s.setItem(key, value))

export const LocalStorage = (store: Storage = window.localStorage) =>
  L.fromValue<LocalStorage>({
    [LocalStorageURI]: getStorageImpl(store)
  })
