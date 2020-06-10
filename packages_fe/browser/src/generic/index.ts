import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as O from "@matechs/core/Option"

export interface GenericStorage<Env> {
  length: T.SyncRE<Env, Error, number>
  clear: T.SyncRE<Env, Error, void>
  getItem(key: string): T.SyncRE<Env, Error, O.Option<string>>
  key(index: number): T.SyncRE<Env, Error, O.Option<string>>
  removeItem(key: string): T.SyncRE<Env, Error, void>
  setItem(key: string, value: string): T.SyncRE<Env, Error, void>
}

const tryS = T.trySyncMap(E.toError)

export function getStorageImpl(storage: Storage): GenericStorage<unknown> {
  return {
    length: tryS(() => storage.length),
    clear: tryS(() => storage.clear()),
    getItem: (key) => tryS(() => O.fromNullable(storage.getItem(key))),
    key: (index) => tryS(() => O.fromNullable(storage.key(index))),
    removeItem: (key) => tryS(() => storage.removeItem(key)),
    setItem: (key, value) => tryS(() => storage.setItem(key, value))
  }
}
