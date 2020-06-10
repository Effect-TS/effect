import { GenericStorage, getStorageImpl } from "../generic"

import * as T from "@matechs/core/Effect"
import * as L from "@matechs/core/Layer"

export const SessionStorageURI = "@matechs/browser/SessionStorageURI"

export interface SessionStorage {
  [SessionStorageURI]: GenericStorage<unknown>
}

export const length = T.accessM(
  ({ [SessionStorageURI]: s }: SessionStorage) => s.length
)

export const clear = T.accessM(({ [SessionStorageURI]: s }: SessionStorage) => s.clear)

export const getItem = (key: string) =>
  T.accessM(({ [SessionStorageURI]: s }: SessionStorage) => s.getItem(key))

export const key = (index: number) =>
  T.accessM(({ [SessionStorageURI]: s }: SessionStorage) => s.key(index))

export const removeItem = (key: string) =>
  T.accessM(({ [SessionStorageURI]: s }: SessionStorage) => s.removeItem(key))

export const setItem = (key: string, value: string) =>
  T.accessM(({ [SessionStorageURI]: s }: SessionStorage) => s.setItem(key, value))

export const SessionStorage = (store: Storage = window.sessionStorage) =>
  L.fromValue<SessionStorage>({
    [SessionStorageURI]: getStorageImpl(store)
  })
