/**
 * Copying element builders: each chain call returns a copy with one field
 * changed.
 *
 * @internal
 */

/**
 * The library's builder classes, by prototype, with the fields their
 * instances hold beyond `ElementBuilder`'s. A copy of one of them copies
 * those fields by name; a class registered nowhere, as one a user extends, has
 * its own enumerable fields found on each copy.
 *
 * @internal
 */
export const knownFields = new WeakMap<object, ReadonlyArray<string>>()

const builderFields: ReadonlySet<string> = new Set([
  "tag",
  "elementKey",
  "attrs",
  "props",
  "handlers",
  "eventOptions",
  "refKey",
  "mount",
  "owned"
])

/**
 * A copy of a builder with its class and fields. The core fields are copied
 * one by one, which is several times faster than `Object.assign` on a fresh
 * object, and so is every chain call.
 *
 * @internal
 */
export const copy = <B extends object>(builder: B): B => {
  const proto = Object.getPrototypeOf(builder)
  const b = builder as any
  const out = Object.create(proto)
  out.tag = b.tag
  out.elementKey = b.elementKey
  out.attrs = b.attrs
  out.props = b.props
  out.handlers = b.handlers
  out.eventOptions = b.eventOptions
  out.refKey = b.refKey
  out.mount = b.mount
  out.owned = b.owned
  const extra = knownFields.get(proto)
  if (extra !== undefined) {
    for (let i = 0; i < extra.length; i++) out[extra[i]!] = b[extra[i]!]
  } else {
    for (const key of Object.keys(builder)) {
      if (!builderFields.has(key)) out[key] = b[key]
    }
    for (const key of Object.getOwnPropertySymbols(builder)) {
      if (Object.prototype.propertyIsEnumerable.call(builder, key)) out[key] = b[key]
    }
  }
  return out
}
