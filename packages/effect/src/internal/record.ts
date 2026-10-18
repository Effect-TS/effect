/** @internal */
export function assignProperty(self: object, key: PropertyKey, value: unknown): void {
  if (key === "__proto__") {
    Object.defineProperty(self, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    })
  } else {
    ;(self as any)[key] = value
  }
}

/** @internal */
export function assignProperties(self: object, source: object): void {
  // Same own+enumerable keys, order, and [[Get]]/[[Set]] as the loop below, except an own
  // "__proto__" key, which needs the `defineProperty` path to avoid firing the prototype setter.
  //
  // Known limitation (pinned by the "KNOWN LIMITATION" test in test/Data.test.ts): a Proxy
  // source whose getOwnPropertyDescriptor trap answers this check and Object.assign's own
  // internal check differently can still pollute self's prototype. No real call site in this
  // codebase can trigger it; see the PR description for why it isn't closed.
  if (!Object.hasOwn(source, "__proto__")) {
    Object.assign(self, source)
    return
  }
  for (const key of Reflect.ownKeys(source)) {
    if (Object.prototype.propertyIsEnumerable.call(source, key)) {
      assignProperty(self, key, (source as any)[key])
    }
  }
}
