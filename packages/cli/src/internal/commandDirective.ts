import { dual } from "effect/Function"
import type * as BuiltInOption from "../BuiltInOptions.js"
import type * as CommandDirective from "../CommandDirective.js"

/** @internal */
export const builtIn = (
  option: BuiltInOption.BuiltInOptions
): CommandDirective.CommandDirective<never> => ({
  _tag: "BuiltIn",
  option
})

/** @internal */
export const userDefined = <A>(
  leftover: ReadonlyArray<string>,
  value: A
): CommandDirective.CommandDirective<A> => ({
  _tag: "UserDefined",
  leftover,
  value
})

/** @internal */
export const isBuiltIn = <A>(
  self: CommandDirective.CommandDirective<A>
): self is CommandDirective.BuiltIn => self._tag === "BuiltIn"

/** @internal */
export const isUserDefined = <A>(
  self: CommandDirective.CommandDirective<A>
): self is CommandDirective.UserDefined<A> => self._tag === "UserDefined"

/** @internal */
export const map = dual<
  <A, B>(
    f: (a: A) => B
  ) => (self: CommandDirective.CommandDirective<A>) => CommandDirective.CommandDirective<B>,
  <A, B>(
    self: CommandDirective.CommandDirective<A>,
    f: (a: A) => B
  ) => CommandDirective.CommandDirective<B>
>(2, (self, f) => isUserDefined(self) ? userDefined(self.leftover, f(self.value)) : self)
