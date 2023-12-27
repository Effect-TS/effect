import * as PlatformError from "@effect/platform/Error"
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

const storageError = (props: Omit<Parameters<typeof PlatformError.SystemError>[0], "reason" | "module">) =>
  PlatformError.SystemError({
    reason: "PermissionDenied",
    module: "KeyValueStore",
    ...props
  })

/** @internal */
export const layerLocalStorage = Layer.succeed(
  KeyValueStore.KeyValueStore,
  KeyValueStore.make({
    get: (key: string) =>
      Effect.try({
        try: () => Option.fromNullable(localStorage.getItem(key)),
        catch: () =>
          storageError({
            pathOrDescriptor: "layerLocalStorage",
            method: "get",
            message: `Unable to get item with key ${key}`
          })
      }),

    set: (key: string, value: string) =>
      Effect.try({
        try: () => localStorage.setItem(key, value),
        catch: () =>
          storageError({
            pathOrDescriptor: "layerLocalStorage",
            method: "set",
            message: `Unable to set item with key ${key}`
          })
      }),

    remove: (key: string) =>
      Effect.try({
        try: () => localStorage.removeItem(key),
        catch: () =>
          storageError({
            pathOrDescriptor: "layerLocalStorage",
            method: "remove",
            message: `Unable to remove item with key ${key}`
          })
      }),

    clear: Effect.try({
      try: () => localStorage.clear(),
      catch: () =>
        storageError({
          pathOrDescriptor: "layerLocalStorage",
          method: "clear",
          message: `Unable to clear storage`
        })
    }),

    size: Effect.try({
      try: () => localStorage.length,
      catch: () =>
        storageError({
          pathOrDescriptor: "layerLocalStorage",
          method: "size",
          message: `Unable to get size`
        })
    })
  })
)

/** @internal */
export const layerSessionStorage = Layer.succeed(
  KeyValueStore.KeyValueStore,
  KeyValueStore.make({
    get: (key: string) =>
      Effect.try({
        try: () => Option.fromNullable(sessionStorage.getItem(key)),
        catch: () =>
          storageError({
            pathOrDescriptor: "layerSessionStorage",
            method: "get",
            message: `Unable to get item with key ${key}`
          })
      }),

    set: (key: string, value: string) =>
      Effect.try({
        try: () => sessionStorage.setItem(key, value),
        catch: () =>
          storageError({
            pathOrDescriptor: "layerSessionStorage",
            method: "set",
            message: `Unable to set item with key ${key}`
          })
      }),

    remove: (key: string) =>
      Effect.try({
        try: () => sessionStorage.removeItem(key),
        catch: () =>
          storageError({
            pathOrDescriptor: "layerSessionStorage",
            method: "remove",
            message: `Unable to remove item with key ${key}`
          })
      }),

    clear: Effect.try({
      try: () => sessionStorage.clear(),
      catch: () =>
        storageError({
          pathOrDescriptor: "layerSessionStorage",
          method: "clear",
          message: `Unable to clear storage`
        })
    }),

    size: Effect.try({
      try: () => sessionStorage.length,
      catch: () =>
        storageError({
          pathOrDescriptor: "layerSessionStorage",
          method: "size",
          message: `Unable to get size`
        })
    })
  })
)
