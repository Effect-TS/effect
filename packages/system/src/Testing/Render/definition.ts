// ets_tracing: off

import * as L from "../../Collections/Immutable/List/index.js"
import type * as AM from "../AssertionM/AssertionM.js"

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
