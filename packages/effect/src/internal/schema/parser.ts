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

/** @internal */
export const missingExit = succeed(missing)

// Shared success for a present input returned unchanged. It must be resolved
// before crossing an asynchronous or transformation boundary. Kept on
// globalThis under the missing symbol so that module copies share its identity.
// Keep initialization in a call so the build can remove it when unused.
/** @internal */
export const sameExit: Success<unknown> = (() => (globalThis as any)[missing] ??= succeed(missing))()

/** @internal */
export const toOption = <A>(value: A): Option.Option<A> => value === missing ? Option.none() : Option.some(value as A)

/** @internal */
export const fromOptionExit = <A>(option: Option.Option<A>): Success<A | typeof missing> =>
  option._tag === "None" ? missingExit : succeed(option.value)
