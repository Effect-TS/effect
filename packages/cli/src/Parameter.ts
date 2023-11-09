import type { Effect } from "effect/Effect"
import type { HashSet } from "effect/HashSet"
import type { CliConfig } from "./CliConfig"
import type { HelpDoc } from "./HelpDoc"
import type { ValidationError } from "./ValidationError"

/**
 * Abstraction employed by Wizard class. Parameter trait encompass `Command`,
 * `Options` and `Args` interfaces.
 *
 * The `Wizard` processes subtypes of `Parameter` in different manners.
 */
export interface Parameter {
  get help(): HelpDoc
  get shortDescription(): string
}

/**
 * Input is used to obtain a parameter from user.
 */
export interface Input extends Parameter {
  isValid(input: string, config: CliConfig): Effect<never, ValidationError, ReadonlyArray<string>>
  parse(
    args: ReadonlyArray<string>,
    config: CliConfig
  ): Effect<never, ValidationError, readonly [ReadonlyArray<string>, ReadonlyArray<string>]>
}

/**
 * Represent a parameter with name to be used as the options in Alternatives.
 */
export interface Named extends Parameter {
  get names(): HashSet<string>
}
