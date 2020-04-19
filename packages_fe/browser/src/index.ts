import { T, E } from "@matechs/prelude";
import * as O from "fp-ts/lib/Option";

export const localStorageEnv = "@matechs/browser/localStorageURI";
export const sessionStorageEnv = "@matechs/browser/sessionStorageURI";

interface GenericStorage<Env> {
  length: T.SyncRE<Env, Error, number>;
  clear: T.SyncRE<Env, Error, void>;
  getItem(key: string): T.SyncRE<Env, Error, O.Option<string>>;
  key(index: number): T.SyncRE<Env, Error, O.Option<string>>;
  removeItem(key: string): T.SyncRE<Env, Error, void>;
  setItem(key: string, value: string): T.SyncRE<Env, Error, void>;
}

export interface SessionStorageEnv {
  [sessionStorageEnv]: GenericStorage<unknown>;
}

export interface LocalStorageEnv {
  [localStorageEnv]: GenericStorage<unknown>;
}

const tryS = T.trySyncMap(E.toError);

function getStorageImpl(storage: Storage): GenericStorage<unknown> {
  return {
    length: tryS(() => storage.length),
    clear: tryS(() => storage.clear()),
    getItem: (key) => tryS(() => O.fromNullable(storage.getItem(key))),
    key: (index) => tryS(() => O.fromNullable(storage.key(index))),
    removeItem: (key) => tryS(() => storage.removeItem(key)),
    setItem: (key, value) => tryS(() => storage.setItem(key, value))
  };
}

export function storageEnv(session: Storage, local: Storage): SessionStorageEnv & LocalStorageEnv {
  return {
    [sessionStorageEnv]: getStorageImpl(session),
    [localStorageEnv]: getStorageImpl(local)
  };
}

export const sessionStore: GenericStorage<SessionStorageEnv> = {
  length: T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.length),
  clear: T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.clear),
  getItem: (key) => T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.getItem(key)),
  key: (index) => T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.key(index)),
  removeItem: (key) =>
    T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.removeItem(key)),
  setItem: (key, value) =>
    T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.setItem(key, value))
};

export const localStore: GenericStorage<LocalStorageEnv> = {
  length: T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.length),
  clear: T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.clear),
  getItem: (key) => T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.getItem(key)),
  key: (index) => T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.key(index)),
  removeItem: (key) => T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.removeItem(key)),
  setItem: (key, value) =>
    T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.setItem(key, value))
};
