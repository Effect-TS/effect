import { effect as T } from "@matechs/effect";
import * as O from "fp-ts/lib/Option";

export const localStorageEnv: unique symbol = Symbol();
export const sessionStorageEnv: unique symbol = Symbol();

interface GenericStorage<Env> {
  length: T.Effect<Env, Error, number>;
  clear: T.Effect<Env, Error, void>;
  getItem(key: string): T.Effect<Env, Error, O.Option<string>>;
  key(index: number): T.Effect<Env, Error, O.Option<string>>;
  removeItem(key: string): T.Effect<Env, Error, void>;
  setItem(key: string, value: string): T.Effect<Env, Error, void>;
}

export interface StorageEnv {
  [localStorageEnv]: GenericStorage<T.NoEnv>;
  [sessionStorageEnv]: GenericStorage<T.NoEnv>;
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

export function storageEnv(session: Storage, local: Storage): StorageEnv {
  return {
    [sessionStorageEnv]: getStorageImpl(session),
    [localStorageEnv]: getStorageImpl(local)
  };
}

function getStorageFunctions(
  sym: typeof sessionStorageEnv | typeof localStorageEnv
): GenericStorage<StorageEnv> {
  return {
    length: T.accessM(({ [sym]: s }: StorageEnv) => s.length),
    clear: T.accessM(({ [sym]: s }: StorageEnv) => s.clear),
    getItem: key => T.accessM(({ [sym]: s }: StorageEnv) => s.getItem(key)),
    key: index => T.accessM(({ [sym]: s }: StorageEnv) => s.key(index)),
    removeItem: key =>
      T.accessM(({ [sym]: s }: StorageEnv) => s.removeItem(key)),
    setItem: (key, value) =>
      T.accessM(({ [sym]: s }: StorageEnv) => s.setItem(key, value))
  };
}

export const sessionStore: GenericStorage<StorageEnv> = getStorageFunctions(
  sessionStorageEnv
);

export const localStore: GenericStorage<StorageEnv> = getStorageFunctions(
  localStorageEnv
);
