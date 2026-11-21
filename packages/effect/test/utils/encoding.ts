import { afterAll, beforeAll, describe } from "@effect/vitest"

type Property = readonly [target: object, key: PropertyKey]

// The native `Uint8Array` Base64 and hex methods the encoding modules may use.
const natives: ReadonlyArray<Property> = [
  [Uint8Array, "fromBase64"],
  [Uint8Array, "fromHex"],
  [Uint8Array.prototype, "toBase64"],
  [Uint8Array.prototype, "toHex"]
]

const nativesAndBuffer: ReadonlyArray<Property> = [...natives, [globalThis, "Buffer"]]

const describeWithout = (name: string, props: ReadonlyArray<Property>, suite: () => void): void => {
  describe(name, { concurrent: false }, () => {
    const descriptors = props.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key))
    beforeAll(() => {
      for (const [target, key] of props) Reflect.deleteProperty(target, key)
    })
    afterAll(() => {
      props.forEach(([target, key], i) => {
        const descriptor = descriptors[i]
        if (descriptor !== undefined) Reflect.defineProperty(target, key, descriptor)
      })
    })
    suite()
  })
}

// Registers `suite` once, without the native `Uint8Array` methods.
export const describeWithoutNatives = (name: string, suite: () => void): void => describeWithout(name, natives, suite)

// Registers `suite` as is and without the native `Uint8Array` methods. When
// `bufferFallback` is set, also registers a third copy without `Buffer` so the
// JS loops stay covered. The copies run sequentially, since the removals are
// global and the tests run concurrently.
export const describeWithFallback = (
  name: string,
  suite: () => void,
  options?: { readonly bufferFallback?: boolean }
): void => {
  describe(name, { concurrent: false }, suite)
  describeWithoutNatives(`${name} without native methods`, suite)
  if (options?.bufferFallback) {
    describeWithout(`${name} without native methods or Buffer`, nativesAndBuffer, suite)
  }
}
