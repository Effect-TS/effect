import { effect as T } from "@matechs/effect";
import * as O from "fp-ts/lib/Option";

export const localStorageEnv = "@matechs/browser/localStorageURI";
export const sessionStorageEnv = "@matechs/browser/sessionStorageURI";

interface GenericStorage<Env> {
  length: T.Effect<Env, Error, number>;
  clear: T.Effect<Env, Error, void>;
  getItem(key: string): T.Effect<Env, Error, O.Option<string>>;
  key(index: number): T.Effect<Env, Error, O.Option<string>>;
  removeItem(key: string): T.Effect<Env, Error, void>;
  setItem(key: string, value: string): T.Effect<Env, Error, void>;
}

export interface SessionStorageEnv {
  [sessionStorageEnv]: GenericStorage<T.NoEnv>;
}

export interface LocalStorageEnv {
  [localStorageEnv]: GenericStorage<T.NoEnv>;
}

function getStorageImpl(storage: Storage): GenericStorage<T.NoEnv> {
  return {
    length: T.trySync(() => storage.length),
    clear: T.trySync(() => storage.clear()),
    getItem: key => T.trySync(() => O.fromNullable(storage.getItem(key))),
    key: index => T.trySync(() => O.fromNullable(storage.key(index))),
    removeItem: key => T.trySync(() => storage.removeItem(key)),
    setItem: (key, value) => T.trySync(() => storage.setItem(key, value))
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
  getItem: key => T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.getItem(key)),
  key: index => T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.key(index)),
  removeItem: key => T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.removeItem(key)),
  setItem: (key, value) => T.accessM(({ [sessionStorageEnv]: s }: SessionStorageEnv) => s.setItem(key, value))
};

export const localStore: GenericStorage<LocalStorageEnv> = {
  length: T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.length),
  clear: T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.clear),
  getItem: key => T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.getItem(key)),
  key: index => T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.key(index)),
  removeItem: key => T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.removeItem(key)),
  setItem: (key, value) => T.accessM(({ [localStorageEnv]: s }: LocalStorageEnv) => s.setItem(key, value))
};
