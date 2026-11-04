import * as Exit from "../../Exit.ts"
import * as Option from "../../Option.ts"
import { args } from "../core.ts"

/** @internal */
export const missing: unique symbol = Symbol.for("effect/schema/parser/missing")

/** @internal */
export { args }

/** @internal */
export type Success<A, E = never> = Exit.Success<A, E> & { readonly [args]: A }

/** @internal */
export const succeed = Exit.succeed as <A>(value: A) => Success<A>

// Parsers attached to ASTs can come from another module copy. Both the missing
// value and the unchanged-input exit must retain their identity across copies.
const registryKey = Symbol.for("effect/schema/parser")
const registry = globalThis as typeof globalThis & {
  [registryKey]?: {
    readonly missingExit: Success<typeof missing>
    readonly sameExit: Success<unknown>
  }
}
const exits = registry[registryKey] ??= {
  missingExit: succeed(missing),
  sameExit: succeed(missing)
}

/** @internal */
export const missingExit = exits.missingExit

// Shared success for a present input returned unchanged. It must be resolved
// before crossing an asynchronous or transformation boundary.
/** @internal */
export const sameExit: Success<unknown> = exits.sameExit

/** @internal */
export const toOption = <A>(value: A): Option.Option<A> => value === missing ? Option.none() : Option.some(value as A)

/** @internal */
export const fromOptionExit = <A>(option: Option.Option<A>): Success<A | typeof missing> =>
  option._tag === "None" ? missingExit : succeed(option.value)
