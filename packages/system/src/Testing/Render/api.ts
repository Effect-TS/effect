// ets_tracing: off

import type * as L from "../../Collections/Immutable/List/index.js"
import * as AssertionM from "../AssertionM/AssertionM.js"
import * as R from "./definition.js"

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
  paramLists: L.List<L.List<R.RenderParam>>
): R.Render {
  return new R.Function_(name, paramLists)
}

/**
 * Create a `Render` from an assertion combinator that should be rendered
 * using infix function notation.
 */
export function infix(left: R.RenderParam, op: string, right: R.RenderParam): R.Render {
  return new R.Infix(left, op, right)
}

/**
 * Construct a `RenderParam` from an `AssertionM`.
 */
export function param<A>(value: AssertionM.AssertionM<A> | A): R.RenderParam {
  if (AssertionM.isAssertionM(value)) {
    return new R.AssertionM(value)
  }

  return new R.Value(value)
}

/**
 * Quote a string so it renders as a valid Scala string when rendered.
 */
export function quoted(str: string): string {
  return `"${str}"`
}
