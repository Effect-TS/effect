/** @internal */
export const getAllObjectKeys = (obj: object): Set<PropertyKey> => {
  const keys = new Set<PropertyKey>(Reflect.ownKeys(obj))
  if (obj.constructor === Object) return keys

  if (obj instanceof Error) {
    keys.delete("stack")
  }

  const proto = Object.getPrototypeOf(obj)
  let current = proto

  while (current !== null && current !== Object.prototype) {
    const ownKeys = Reflect.ownKeys(current)
    for (let i = 0; i < ownKeys.length; i++) {
      keys.add(ownKeys[i])
    }
    current = Object.getPrototypeOf(current)
  }
  if (keys.has("constructor") && typeof obj.constructor === "function" && proto === obj.constructor.prototype) {
    keys.delete("constructor")
  }

  return keys
}

/** @internal */
export const byReferenceInstances = new WeakSet<object>()

/**
 * The keys a prototype chain contributes to {@link getAllObjectKeys} (below
 * `Object.prototype`, deduplicated nearest-first), computed once per prototype
 * and held weakly by it. `constant[i]` marks data properties, whose value is
 * the same for every instance; accessors read instance state, and
 * `constructor` and `stack` are included or not depending on the instance.
 *
 * Only used for class instances hashed or compared structurally (without their
 * own `Hash` / `Equal`); their prototype chain is assumed unchanged once such
 * instances have been hashed or compared.
 *
 * @internal
 */
export interface PrototypeLayout {
  readonly keys: ReadonlyArray<PropertyKey>
  readonly keySet: ReadonlySet<PropertyKey>
  readonly constant: ReadonlyArray<boolean>
  readonly values: ReadonlyArray<unknown>
}

const prototypeLayouts = new WeakMap<object, PrototypeLayout>()

/** @internal */
export const prototypeLayout = (proto: object): PrototypeLayout => {
  let layout = prototypeLayouts.get(proto)
  if (layout === undefined) {
    const keys: Array<PropertyKey> = []
    const keySet = new Set<PropertyKey>()
    const constant: Array<boolean> = []
    const values: Array<unknown> = []
    for (
      let current = proto;
      current !== null && current !== Object.prototype;
      current = Object.getPrototypeOf(current)
    ) {
      const ownKeys = Reflect.ownKeys(current)
      for (let i = 0; i < ownKeys.length; i++) {
        const key = ownKeys[i]
        if (keySet.has(key)) continue
        keySet.add(key)
        keys.push(key)
        const descriptor = Object.getOwnPropertyDescriptor(current, key)!
        const isConstant = "value" in descriptor && key !== "constructor" && key !== "stack"
        constant.push(isConstant)
        values.push(isConstant ? descriptor.value : undefined)
      }
    }
    layout = { keys, keySet, constant, values }
    prototypeLayouts.set(proto, layout)
  }
  return layout
}
