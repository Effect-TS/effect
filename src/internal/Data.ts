import type * as Data from "../Data"
import * as Equal from "../Equal"
import * as Hash from "../Hash"
import type * as Types from "../Types"

/** @internal */
export const ArrayProto: Equal.Equal = Object.assign(Object.create(Array.prototype), {
  [Hash.symbol](this: Array<any>) {
    return Hash.array(this)
  },
  [Equal.symbol](this: Array<any>, that: Equal.Equal) {
    if (Array.isArray(that) && this.length === that.length) {
      return this.every((v, i) => Equal.equals(v, (that as Array<any>)[i]))
    } else {
      return false
    }
  }
})

/** @internal */
export const StructProto: Equal.Equal = {
  [Hash.symbol](this: Equal.Equal) {
    return Hash.structure(this)
  },
  [Equal.symbol](this: Equal.Equal, that: Equal.Equal) {
    const selfKeys = Object.keys(this)
    const thatKeys = Object.keys(that as object)
    if (selfKeys.length !== thatKeys.length) {
      return false
    }
    for (const key of selfKeys) {
      if (!(key in (that as object) && Equal.equals((this as any)[key], (that as any)[key]))) {
        return false
      }
    }
    return true
  }
}

/** @internal */
export const Structural: new<A>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void : Omit<A, keyof Equal.Equal>
) => Data.Case = (function() {
  function Structural(this: any, args: any) {
    if (args) {
      Object.assign(this, args)
    }
  }
  Structural.prototype = StructProto
  return Structural as any
})()

/** @internal */
export const struct = <As extends Readonly<Record<string, any>>>(as: As): Data.Data<As> =>
  Object.assign(Object.create(StructProto), as)
