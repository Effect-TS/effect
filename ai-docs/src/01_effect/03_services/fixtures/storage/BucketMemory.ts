// file: test/storage/BucketMemory.ts
import { Layer } from "effect"
import { Bucket } from "./Bucket.ts"

// An in-memory stand-in for the platform binding, used only by tests. It is
// never imported by the composition root, so it does not affect the bundle.
export const BucketMemoryLayer = Layer.sync(Bucket, () => {
  const objects = new Map<string, string>([["greeting", "hello"]])
  return {
    get: (key) => Promise.resolve(objects.get(key) ?? null),
    put: (key, value) => {
      objects.set(key, value)
      return Promise.resolve()
    },
    list: ({ prefix }) =>
      Promise.resolve(
        Array.from(objects.keys(), (key) => ({ key })).filter((object) => object.key.startsWith(prefix))
      )
  }
})
