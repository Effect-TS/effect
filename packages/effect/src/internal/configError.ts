import type * as Cause from "../Cause.js"
import type * as ConfigError from "../ConfigError.js"
import { TaggedError } from "../Data.js"
import * as Either from "../Either.js"
import { constFalse, constTrue, dual, pipe } from "../Function.js"
import { hasProperty } from "../Predicate.js"
import * as RA from "../ReadonlyArray.js"
import * as OpCodes from "./opCodes/configError.js"

/** @internal */
const ConfigErrorSymbolKey = "effect/ConfigError"

/** @internal */
export const ConfigErrorTypeId: ConfigError.ConfigErrorTypeId = Symbol.for(
  ConfigErrorSymbolKey
) as ConfigError.ConfigErrorTypeId

/** @internal */
const DiscriminantSymbolKey = "effect/ConfigError.Discriminant"

/** @internal */
export const Discriminant: ConfigError.Discriminant = Symbol.for(
  DiscriminantSymbolKey
) as ConfigError.Discriminant

/** @internal */
export const proto = {
  [ConfigErrorTypeId]: ConfigErrorTypeId
}

/** @internal */
export class And extends TaggedError("ConfigError") implements ConfigError.ConfigError.Proto {
  [ConfigErrorTypeId]: typeof ConfigError.ConfigErrorTypeId
  readonly [Discriminant] = OpCodes.OP_AND
  constructor(readonly left: ConfigError.ConfigError, readonly right: ConfigError.ConfigError) {
    super()
    this[ConfigErrorTypeId] = ConfigErrorTypeId
  }

  toString(): string {
    return `${this.left} and ${this.right}`
  }
}

/** @internal */
export class Or extends TaggedError("ConfigError") implements ConfigError.ConfigError.Proto {
  [ConfigErrorTypeId]: typeof ConfigError.ConfigErrorTypeId
  readonly [Discriminant] = OpCodes.OP_OR
  constructor(readonly left: ConfigError.ConfigError, readonly right: ConfigError.ConfigError) {
    super()
    this[ConfigErrorTypeId] = ConfigErrorTypeId
  }

  toString(): string {
    return `${this.left} or ${this.right}`
  }
}

/** @internal */
export class InvalidData extends TaggedError("ConfigError") implements ConfigError.ConfigError.Proto {
  readonly [ConfigErrorTypeId]: typeof ConfigError.ConfigErrorTypeId
  readonly [Discriminant] = OpCodes.OP_INVALID_DATA
  constructor(
    readonly path: ReadonlyArray<string>,
    readonly message: string,
    readonly options: ConfigError.Options = { pathDelim: "." }
  ) {
    super()
    this[ConfigErrorTypeId] = ConfigErrorTypeId
  }

  toString() {
    const path = pipe(this.path, RA.join(this.options.pathDelim))
    return `(Invalid data at ${path}: "${this.message}")`
  }
}

/** @internal */
export class MissingData extends TaggedError("ConfigError") implements ConfigError.ConfigError.Proto {
  readonly [ConfigErrorTypeId]: typeof ConfigError.ConfigErrorTypeId
  readonly [Discriminant] = OpCodes.OP_MISSING_DATA
  constructor(
    readonly path: ReadonlyArray<string>,
    readonly message: string,
    readonly options: ConfigError.Options = { pathDelim: "." }
  ) {
    super()
    this[ConfigErrorTypeId] = ConfigErrorTypeId
  }

  toString() {
    const path = pipe(this.path, RA.join(this.options.pathDelim))
    return `(Missing data at ${path}: "${this.message}")`
  }
}

/** @internal */
export class SourceUnavailable extends TaggedError("ConfigError") implements ConfigError.ConfigError.Proto {
  readonly [ConfigErrorTypeId]: typeof ConfigError.ConfigErrorTypeId
  readonly [Discriminant] = OpCodes.OP_SOURCE_UNAVAILABLE
  constructor(
    readonly path: ReadonlyArray<string>,
    readonly message: string,
    readonly cause: Cause.Cause<unknown>,
    readonly options: ConfigError.Options = { pathDelim: "." }
  ) {
    super()
    this[ConfigErrorTypeId] = ConfigErrorTypeId
  }

  toString() {
    const path = pipe(this.path, RA.join(this.options.pathDelim))
    return `(Source unavailable at ${path}: "${this.message}")`
  }
}

/** @internal */
export class Unsupported extends TaggedError("ConfigError") implements ConfigError.ConfigError.Proto {
  readonly [ConfigErrorTypeId]: typeof ConfigError.ConfigErrorTypeId
  readonly [Discriminant] = OpCodes.OP_UNSUPPORTED
  constructor(
    readonly path: ReadonlyArray<string>,
    readonly message: string,
    readonly options: ConfigError.Options = { pathDelim: "." }
  ) {
    super()
    this[ConfigErrorTypeId] = ConfigErrorTypeId
  }

  toString() {
    const path = pipe(this.path, RA.join(this.options.pathDelim))
    return `(Unsupported operation at ${path}: "${this.message}")`
  }
}

/** @internal */
export const isConfigError = (u: unknown): u is ConfigError.ConfigError => hasProperty(u, ConfigErrorTypeId)

/** @internal */
export const isAnd = (self: ConfigError.ConfigError): self is And => self[Discriminant] === OpCodes.OP_AND

/** @internal */
export const isOr = (self: ConfigError.ConfigError): self is Or => self[Discriminant] === OpCodes.OP_OR

/** @internal */
export const isInvalidData = (self: ConfigError.ConfigError): self is InvalidData =>
  self[Discriminant] === OpCodes.OP_INVALID_DATA

/** @internal */
export const isMissingData = (self: ConfigError.ConfigError): self is MissingData =>
  self[Discriminant] === OpCodes.OP_MISSING_DATA

/** @internal */
export const isSourceUnavailable = (self: ConfigError.ConfigError): self is SourceUnavailable =>
  self[Discriminant] === OpCodes.OP_SOURCE_UNAVAILABLE

/** @internal */
export const isUnsupported = (self: ConfigError.ConfigError): self is Unsupported =>
  self[Discriminant] === OpCodes.OP_UNSUPPORTED

/** @internal */
export const prefixed: {
  (prefix: ReadonlyArray<string>): (self: ConfigError.ConfigError) => ConfigError.ConfigError
  (self: ConfigError.ConfigError, prefix: ReadonlyArray<string>): ConfigError.ConfigError
} = dual<
  (prefix: ReadonlyArray<string>) => (self: ConfigError.ConfigError) => ConfigError.ConfigError,
  (self: ConfigError.ConfigError, prefix: ReadonlyArray<string>) => ConfigError.ConfigError
>(2, (self, prefix) => {
  switch (self[Discriminant]) {
    case OpCodes.OP_AND: {
      return new And(prefixed(self.left, prefix), prefixed(self.right, prefix))
    }
    case OpCodes.OP_OR: {
      return new Or(prefixed(self.left, prefix), prefixed(self.right, prefix))
    }
    case OpCodes.OP_INVALID_DATA: {
      return new InvalidData([...prefix, ...self.path], self.message)
    }
    case OpCodes.OP_MISSING_DATA: {
      return new MissingData([...prefix, ...self.path], self.message)
    }
    case OpCodes.OP_SOURCE_UNAVAILABLE: {
      return new SourceUnavailable([...prefix, ...self.path], self.message, self.cause)
    }
    case OpCodes.OP_UNSUPPORTED: {
      return new Unsupported([...prefix, ...self.path], self.message)
    }
  }
})

/** @internal */
const IsMissingDataOnlyReducer: ConfigError.ConfigErrorReducer<unknown, boolean> = {
  andCase: (_, left, right) => left && right,
  orCase: (_, left, right) => left && right,
  invalidDataCase: constFalse,
  missingDataCase: constTrue,
  sourceUnavailableCase: constFalse,
  unsupportedCase: constFalse
}

/** @internal */
type ConfigErrorCase = AndCase | OrCase

/** @internal */
interface AndCase {
  readonly _tag: "AndCase"
}

/** @internal */
interface OrCase {
  readonly _tag: "OrCase"
}

/** @internal */
export const reduceWithContext = dual<
  <C, Z>(context: C, reducer: ConfigError.ConfigErrorReducer<C, Z>) => (self: ConfigError.ConfigError) => Z,
  <C, Z>(self: ConfigError.ConfigError, context: C, reducer: ConfigError.ConfigErrorReducer<C, Z>) => Z
>(3, <C, Z>(self: ConfigError.ConfigError, context: C, reducer: ConfigError.ConfigErrorReducer<C, Z>) => {
  const input: Array<ConfigError.ConfigError> = [self]
  const output: Array<Either.Either<ConfigErrorCase, Z>> = []
  while (input.length > 0) {
    const error = input.pop()!
    switch (error[Discriminant]) {
      case OpCodes.OP_AND: {
        input.push(error.right)
        input.push(error.left)
        output.push(Either.left({ _tag: "AndCase" }))
        break
      }
      case OpCodes.OP_OR: {
        input.push(error.right)
        input.push(error.left)
        output.push(Either.left({ _tag: "OrCase" }))
        break
      }
      case OpCodes.OP_INVALID_DATA: {
        output.push(Either.right(reducer.invalidDataCase(context, error.path, error.message)))
        break
      }
      case OpCodes.OP_MISSING_DATA: {
        output.push(Either.right(reducer.missingDataCase(context, error.path, error.message)))
        break
      }
      case OpCodes.OP_SOURCE_UNAVAILABLE: {
        output.push(Either.right(reducer.sourceUnavailableCase(context, error.path, error.message, error.cause)))
        break
      }
      case OpCodes.OP_UNSUPPORTED: {
        output.push(Either.right(reducer.unsupportedCase(context, error.path, error.message)))
        break
      }
    }
  }
  const accumulator: Array<Z> = []
  while (output.length > 0) {
    const either = output.pop()!
    switch (either._tag) {
      case "Left": {
        switch (either.left._tag) {
          case "AndCase": {
            const left = accumulator.pop()!
            const right = accumulator.pop()!
            const value = reducer.andCase(context, left, right)
            accumulator.push(value)
            break
          }
          case "OrCase": {
            const left = accumulator.pop()!
            const right = accumulator.pop()!
            const value = reducer.orCase(context, left, right)
            accumulator.push(value)
            break
          }
        }
        break
      }
      case "Right": {
        accumulator.push(either.right)
        break
      }
    }
  }
  if (accumulator.length === 0) {
    throw new Error(
      "BUG: ConfigError.reduceWithContext - please report an issue at https://github.com/Effect-TS/effect/issues"
    )
  }
  return accumulator.pop()!
})

/** @internal */
export const isMissingDataOnly = (self: ConfigError.ConfigError): boolean =>
  reduceWithContext(self, void 0, IsMissingDataOnlyReducer)
