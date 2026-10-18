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
  // `Object.assign` copies exactly the keys the loop below copies (own, enumerable, strings then symbols, in `ownKeys` order) with the
  // same [[Get]] / [[Set]]; only an own "__proto__" key needs the `defineProperty` path, since a [[Set]] of it replaces the prototype.
  //
  // Known, accepted limitation (pinned by the "KNOWN LIMITATION" test in test/Data.test.ts): this
  // guard asks `source` about "__proto__" once and then, on a cache miss, hands `source` to `Object.assign`,
  // which re-derives its own key list and descriptors from scratch rather than reusing this check. For
  // an ordinary object those two queries can never disagree, so the hardening this guard exists for -
  // an own "__proto__" key arriving as data, e.g. from `JSON.parse`, must land as an own data property
  // and never reach the inherited `__proto__` setter - holds for every realistic `source` (including
  // every call site in this codebase, which all pass plain objects or `JSON.parse` output). It does
  // NOT hold against a deliberately adversarial Proxy `source` whose `getOwnPropertyDescriptor` trap
  // answers differently between this check and `Object.assign`'s own internal one (legal under the
  // Proxy invariants, since "__proto__" is not a real own property of any realistic proxy target):
  // such a proxy can report "absent" here and "present and enumerable" to `Object.assign`, which would
  // then perform a plain [[Set]] that fires the setter and replaces `self`'s prototype. Closing that
  // gap requires either reproducing `Object.assign`'s own per-key interleaving by hand (the old loop
  // below, which is exactly what this fast path exists to avoid) or accepting a different observable
  // difference from the old loop (wrong key order or a different thrown error under an already-hostile
  // combination of a frozen target and a throwing getter) - both tried and reverted; see the PR
  // description for the tradeoff.
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
