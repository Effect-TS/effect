// tracing: off

import * as St from "@effect-ts/core/Structural"

export function augmentRecord(value: {}) {
  Object.defineProperty(value, St.hashSym, {
    get: (): number => {
      const ka = Object.keys(value).sort()
      if (ka.length === 0) {
        return 0
      }
      let hash = St.combineHash(St.hashString(ka[0]!), St.hash(value[ka[0]!]))
      let i = 1
      while (hash && i < ka.length) {
        hash = St.combineHash(
          hash,
          St.combineHash(St.hashString(ka[i]!), St.hash(value[ka[i]!]))
        )
        i++
      }
      return hash
    },
    enumerable: false
  })

  Object.defineProperty(value, St.equalsSym, {
    value: (that: unknown): boolean => {
      if (typeof that !== "object" || that == null) {
        return false
      }
      const ka = Object.keys(value)
      const kb = Object.keys(that)
      if (ka.length !== kb.length) {
        return false
      }
      let eq = true
      let i = 0
      const ka_ = ka.sort()
      const kb_ = kb.sort()
      while (eq && i < ka.length) {
        eq = ka_[i] === kb_[i] && St.equals(value[ka_[i]!], that[kb_[i]!])
        i++
      }
      return eq
    },
    enumerable: false
  })
}
