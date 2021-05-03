import * as L from "../Collections/Immutable/List"
import * as AM from "./AssertionM"

export const AssertionMTypeId = Symbol()

export class AssertionM {
  readonly _typeId: typeof AssertionMTypeId = AssertionMTypeId

  constructor(readonly assertion: AM.AssertionM<any>) {}

  toString(): string {
    return this.assertion.toString()
  }
}

export const ValueTypeId = Symbol()

export class Value {
  readonly _typeId: typeof ValueTypeId = ValueTypeId

  constructor(readonly value: any) {}

  toString(): string {
    return this.value.toString()
  }
}

export type RenderParam = AssertionM | Value

export const FunctionTypeId = Symbol()

export class Function_ {
  readonly _typeId: typeof FunctionTypeId = FunctionTypeId

  constructor(
    readonly name: string,
    readonly paramLists: L.List<L.List<RenderParam>>
  ) {}

  toString() {
    const params = L.join_(
      L.map_(this.paramLists, (l) =>
        L.join_(
          L.map_(l, (x) => x.toString()),
          ", "
        )
      ),
      ", "
    )

    return `${this.name}(${params})`
  }
}

export const InfixTypeId = Symbol()

export class Infix {
  readonly _typeId: typeof InfixTypeId = InfixTypeId

  constructor(
    readonly left: RenderParam,
    readonly op: string,
    readonly right: RenderParam
  ) {}

  toString() {
    return `(${this.left.toString()} ${this.op} ${this.right.toString()})`
  }
}

export type Render = Function_ | Infix

/**
 * Creates a string representation of a class name.
 */
export function className(cons: new (...args: any[]) => any): string {
  return cons.prototype.constructor.name
}

/**
 * Creates a string representation of a field accessor.
 */
export function field(name: string): string {
  return `_.${name}`
}

/**
 * Create a `Render` from an assertion combinator that should be rendered
 * using standard function notation.
 */
export function function_(
  name: string,
  paramLists: L.List<L.List<RenderParam>>
): Render {
  return new Function_(name, paramLists)
}

/**
 * Create a `Render` from an assertion combinator that should be rendered
 * using infix function notation.
 */
export function infix(left: RenderParam, op: string, right: RenderParam): Render {
  return new Infix(left, op, right)
}

/**
 * Construct a `RenderParam` from an `AssertionM`.
 */
export function param<A>(value: AM.AssertionM<A> | A): RenderParam {
  if (AM.isAssertionM(value)) {
    return new AssertionM(value)
  }

  return new Value(value)
}

/**
 * Quote a string so it renders as a valid Scala string when rendered.
 */
export function quoted(str: string): string {
  return `"${str}"`
}
