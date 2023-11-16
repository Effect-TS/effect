import * as FileSystem from "@effect/platform/FileSystem"
// import * as AnsiRender from "@effect/printer-ansi/AnsiRender"
// import * as AnsiStyle from "@effect/printer-ansi/AnsiStyle"
// import * as Color from "@effect/printer-ansi/Color"
// import * as Doc from "@effect/printer/Doc"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as CliConfig from "../CliConfig.js"
import type * as HelpDoc from "../HelpDoc.js"
import type * as Span from "../HelpDoc/Span.js"
import type * as Primitive from "../Primitive.js"
import type * as Prompt from "../Prompt.js"
import * as InternalCliConfig from "./cliConfig.js"
import * as InternalHelpDoc from "./helpDoc.js"
import * as InternalSpan from "./helpDoc/span.js"
import * as InternalPrompt from "./prompt.js"
import * as InternalDatePrompt from "./prompt/date.js"
import * as InternalNumberPrompt from "./prompt/number.js"
import * as InternalSelectPrompt from "./prompt/select.js"
import * as InternalTextPrompt from "./prompt/text.js"
import * as InternalTogglePrompt from "./prompt/toggle.js"

const PrimitiveSymbolKey = "@effect/cli/Primitive"

/** @internal */
export const PrimitiveTypeId: Primitive.PrimitiveTypeId = Symbol.for(
  PrimitiveSymbolKey
) as Primitive.PrimitiveTypeId

const proto = {
  _A: (_: never) => _
}

/** @internal */
export const trueValues = Schema.literal("true", "1", "y", "yes", "on")

/** @internal */
export const falseValues = Schema.literal("false", "0", "n", "no", "off")

/**
 * Represents a boolean value.
 *
 * True values can be passed as one of: `["true", "1", "y", "yes" or "on"]`.
 * False value can be passed as one of: `["false", "o", "n", "no" or "off"]`.
 *
 * @internal
 */
export class Bool implements Primitive.Primitive<boolean> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Bool"

  constructor(readonly defaultValue: Option.Option<boolean>) {}

  typeName(): string {
    return "boolean"
  }

  help(): Span.Span {
    return InternalSpan.text("A true or false value.")
  }

  choices(): Option.Option<string> {
    return Option.some("true | false")
  }

  wizard(help: HelpDoc.HelpDoc): Prompt.Prompt<string> {
    const primitiveHelp = InternalHelpDoc.p("Select true or false")
    const message = InternalHelpDoc.sequence(help, primitiveHelp)
    return InternalTogglePrompt.toggle({
      message: InternalHelpDoc.toAnsiText(message).trimEnd(),
      initial: Option.getOrElse(this.defaultValue, () => false),
      active: "true",
      inactive: "false"
    }).pipe(InternalPrompt.map((bool) => `${bool}`))
  }

  validate(
    value: Option.Option<string>,
    config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, string, boolean> {
    return Option.map(value, (str) => InternalCliConfig.normalizeCase(config, str)).pipe(
      Option.match({
        onNone: () =>
          Effect.orElseFail(this.defaultValue, () => `Missing default value for boolean parameter`),
        onSome: (value) =>
          Schema.is(trueValues)(value)
            ? Effect.succeed(true)
            : Schema.is(falseValues)(value)
            ? Effect.succeed(false)
            : Effect.fail(`Unable to recognize '${value}' as a valid boolean`)
      })
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

export class Choice<A> implements Primitive.Primitive<A> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Choice"

  constructor(readonly alternatives: ReadonlyArray.NonEmptyReadonlyArray<readonly [string, A]>) {}

  typeName(): string {
    return "choice"
  }

  help(): Span.Span {
    const choices = pipe(
      ReadonlyArray.map(this.alternatives, ([choice]) => choice),
      ReadonlyArray.join(", ")
    )
    return InternalSpan.text(`One of the following: ${choices}`)
  }

  choices(): Option.Option<string> {
    const choices = pipe(
      ReadonlyArray.map(this.alternatives, ([choice]) => choice),
      ReadonlyArray.join(" | ")
    )
    return Option.some(choices)
  }

  wizard(help: HelpDoc.HelpDoc): Prompt.Prompt<string> {
    const primitiveHelp = InternalHelpDoc.p("Select one of the following choices")
    const message = InternalHelpDoc.sequence(help, primitiveHelp)
    return InternalSelectPrompt.select({
      message: InternalHelpDoc.toAnsiText(message).trimEnd(),
      choices: this.alternatives.map(([title]) => ({ title, value: title }))
    })
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, string, A> {
    return Effect.orElseFail(
      value,
      () => `Choice options to not have a default value`
    ).pipe(
      Effect.flatMap((value) =>
        ReadonlyArray.findFirst(this.alternatives, ([choice]) => choice === value)
      ),
      Effect.mapBoth({
        onFailure: () => {
          const choices = pipe(
            ReadonlyArray.map(this.alternatives, ([choice]) => choice),
            ReadonlyArray.join(", ")
          )
          return `Expected one of the following cases: ${choices}`
        },
        onSuccess: ([, value]) => value
      })
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Represents a date in ISO-8601 format, such as `2007-12-03T10:15:30`.
 *
 * @internal
 */
export class Date implements Primitive.Primitive<globalThis.Date> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Date"

  typeName(): string {
    return "date"
  }

  help(): Span.Span {
    return InternalSpan.text(
      "A date without a time-zone in the ISO-8601 format, such as 2007-12-03T10:15:30."
    )
  }

  choices(): Option.Option<string> {
    return Option.some("date")
  }

  wizard(help: HelpDoc.HelpDoc): Prompt.Prompt<string> {
    const primitiveHelp = InternalHelpDoc.p("Enter a date")
    const message = InternalHelpDoc.sequence(help, primitiveHelp)
    return InternalDatePrompt.date({
      message: InternalHelpDoc.toAnsiText(message).trimEnd()
    }).pipe(InternalPrompt.map((date) => date.toISOString()))
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, string, globalThis.Date> {
    return attempt(
      value,
      this.typeName(),
      Schema.parse(Schema.dateFromString(Schema.string))
    )
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Represents a floating point number.
 *
 * @internal
 */
export class Float implements Primitive.Primitive<number> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Float"

  typeName(): string {
    return "float"
  }

  help(): Span.Span {
    return InternalSpan.text("A floating point number.")
  }

  choices(): Option.Option<string> {
    return Option.none()
  }

  wizard(help: HelpDoc.HelpDoc): Prompt.Prompt<string> {
    const primitiveHelp = InternalHelpDoc.p("Enter a floating point value")
    const message = InternalHelpDoc.sequence(help, primitiveHelp)
    return InternalNumberPrompt.float({
      message: InternalHelpDoc.toAnsiText(message).trimEnd()
    }).pipe(InternalPrompt.map((value) => `${value}`))
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, string, number> {
    const numberFromString = Schema.string.pipe(Schema.numberFromString)
    return attempt(value, this.typeName(), Schema.parse(numberFromString))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Represents an integer.
 *
 * @internal
 */
export class Integer implements Primitive.Primitive<number> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Integer"

  typeName(): string {
    return "integer"
  }

  help(): Span.Span {
    return InternalSpan.text("An integer.")
  }

  choices(): Option.Option<string> {
    return Option.none()
  }

  wizard(help: HelpDoc.HelpDoc): Prompt.Prompt<string> {
    const primitiveHelp = InternalHelpDoc.p("Enter an integer")
    const message = InternalHelpDoc.sequence(help, primitiveHelp)
    return InternalNumberPrompt.float({
      message: InternalHelpDoc.toAnsiText(message).trimEnd()
    }).pipe(InternalPrompt.map((value) => `${value}`))
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, string, number> {
    const intFromString = Schema.string.pipe(Schema.numberFromString, Schema.int())
    return attempt(value, this.typeName(), Schema.parse(intFromString))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export class Path implements Primitive.Primitive<string> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Path"

  constructor(
    readonly pathType: Primitive.Primitive.PathType,
    readonly pathExists: Primitive.Primitive.PathExists
  ) {}

  typeName(): string {
    if (this.pathType === "either") {
      return "path"
    }
    return this.pathType
  }

  help(): Span.Span {
    if (this.pathType === "either" && this.pathExists === "yes") {
      return InternalSpan.text("An existing file or directory.")
    }
    if (this.pathType === "file" && this.pathExists === "yes") {
      return InternalSpan.text("An existing file.")
    }
    if (this.pathType === "directory" && this.pathExists === "yes") {
      return InternalSpan.text("An existing directory.")
    }
    if (this.pathType === "either" && this.pathExists === "no") {
      return InternalSpan.text("A file or directory that must not exist.")
    }
    if (this.pathType === "file" && this.pathExists === "no") {
      return InternalSpan.text("A file that must not exist.")
    }
    if (this.pathType === "directory" && this.pathExists === "no") {
      return InternalSpan.text("A directory that must not exist.")
    }
    if (this.pathType === "either" && this.pathExists === "either") {
      return InternalSpan.text("A file or directory.")
    }
    if (this.pathType === "file" && this.pathExists === "either") {
      return InternalSpan.text("A file.")
    }
    if (this.pathType === "directory" && this.pathExists === "either") {
      return InternalSpan.text("A directory.")
    }
    throw new Error(
      "[BUG]: Path.help - encountered invalid combination of path type " +
        `('${this.pathType}') and path existence ('${this.pathExists}')`
    )
  }

  choices(): Option.Option<string> {
    return Option.none()
  }

  wizard(help: HelpDoc.HelpDoc): Prompt.Prompt<string> {
    const primitiveHelp = InternalHelpDoc.p("Enter a file system path")
    const message = InternalHelpDoc.sequence(help, primitiveHelp)
    return InternalTextPrompt.text({
      message: InternalHelpDoc.toAnsiText(message).trimEnd()
    })
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, string, string> {
    return Effect.flatMap(FileSystem.FileSystem, (fileSystem) => {
      const errorMsg = "Path options do not have a default value"
      return Effect.orElseFail(value, () => errorMsg).pipe(
        Effect.tap((path) =>
          Effect.orDie(fileSystem.exists(path)).pipe(
            Effect.tap((pathExists) =>
              validatePathExistence(path, this.pathExists, pathExists).pipe(
                Effect.zipRight(
                  validatePathType(path, this.pathType, fileSystem).pipe(
                    Effect.when(() => this.pathExists !== "no" && pathExists)
                  )
                )
              )
            )
          )
        )
      )
    })
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Represents a user-defined piece of text.
 *
 * @internal
 */
export class Text implements Primitive.Primitive<string> {
  readonly [PrimitiveTypeId] = proto
  readonly _tag = "Text"

  typeName(): string {
    return "text"
  }

  help(): Span.Span {
    return InternalSpan.text("A user-defined piece of text.")
  }

  choices(): Option.Option<string> {
    return Option.none()
  }

  wizard(help: HelpDoc.HelpDoc): Prompt.Prompt<string> {
    const primitiveHelp = InternalHelpDoc.p("Enter some text")
    const message = InternalHelpDoc.sequence(help, primitiveHelp)
    return InternalTextPrompt.text({ message: InternalHelpDoc.toAnsiText(message).trimEnd() })
  }

  validate(
    value: Option.Option<string>,
    _config: CliConfig.CliConfig
  ): Effect.Effect<FileSystem.FileSystem, string, string> {
    return attempt(value, this.typeName(), Schema.parse(Schema.string))
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const boolean = (defaultValue: Option.Option<boolean>): Primitive.Primitive<boolean> =>
  new Bool(defaultValue)

/** @internal */
export const choice = <A>(
  alternatives: ReadonlyArray.NonEmptyReadonlyArray<[string, A]>
): Primitive.Primitive<A> => new Choice(alternatives)

/** @internal */
export const date: Primitive.Primitive<globalThis.Date> = new Date()

/** @internal */
export const float: Primitive.Primitive<number> = new Float()

/** @internal */
export const integer: Primitive.Primitive<number> = new Integer()

/** @internal */
export const path = (
  pathType: Primitive.Primitive.PathType,
  pathExists: Primitive.Primitive.PathExists
): Primitive.Primitive<string> => new Path(pathType, pathExists)

/** @internal */
export const text: Primitive.Primitive<string> = new Text()

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isPrimitive = (u: unknown): u is Primitive.Primitive<unknown> =>
  typeof u === "object" && u != null && PrimitiveTypeId in u

/** @internal */
export const isBool = <A>(self: Primitive.Primitive<A>): boolean =>
  isPrimitive(self) && "_tag" in self && self._tag === "Bool"

/** @internal */
export const isBoolType = (u: unknown): u is Bool =>
  isPrimitive(u) && "_tag" in u && u._tag === "Bool"

/** @internal */
export const isChoiceType = (u: unknown): u is Choice<unknown> =>
  isPrimitive(u) && "_tag" in u && u._tag === "Choice"

/** @internal */
export const isDateType = (u: unknown): u is Date =>
  isPrimitive(u) && "_tag" in u && u._tag === "Date"

/** @internal */
export const isFloatType = (u: unknown): u is Float =>
  isPrimitive(u) && "_tag" in u && u._tag === "Float"

/** @internal */
export const isIntegerType = (u: unknown): u is Integer =>
  isPrimitive(u) && "_tag" in u && u._tag === "Integer"

/** @internal */
export const isPathType = (u: unknown): u is Path =>
  isPrimitive(u) && "_tag" in u && u._tag === "Path"

/** @internal */
export const isTextType = (u: unknown): u is Text =>
  isPrimitive(u) && "_tag" in u && u._tag === "Text"

// =============================================================================
// Internals
// =============================================================================

const attempt = <E, A>(
  option: Option.Option<string>,
  typeName: string,
  parse: (value: string) => Effect.Effect<never, E, A>
): Effect.Effect<never, string, A> =>
  Effect.orElseFail(
    option,
    () => `${typeName} options do not have a default value`
  ).pipe(
    Effect.flatMap((value) =>
      Effect.orElseFail(
        parse(value),
        () => `'${value}' is not a ${typeName}`
      )
    )
  )

const validatePathExistence = (
  path: string,
  shouldPathExist: Primitive.Primitive.PathExists,
  pathExists: boolean
): Effect.Effect<never, string, void> => {
  if (shouldPathExist === "no" && pathExists) {
    return Effect.fail(`Path '${path}' must not exist`)
  }
  if (shouldPathExist === "yes" && !pathExists) {
    return Effect.fail(`Path '${path}' must exist`)
  }
  return Effect.unit
}

const validatePathType = (
  path: string,
  pathType: Primitive.Primitive.PathType,
  fileSystem: FileSystem.FileSystem
): Effect.Effect<never, string, void> => {
  switch (pathType) {
    case "file": {
      const checkIsFile = fileSystem.stat(path).pipe(
        Effect.map((info) => info.type === "File"),
        Effect.orDie
      )
      return Effect.fail(`Expected path '${path}' to be a regular file`).pipe(
        Effect.unlessEffect(checkIsFile),
        Effect.asUnit
      )
    }
    case "directory": {
      const checkIsDirectory = fileSystem.stat(path).pipe(
        Effect.map((info) => info.type === "Directory"),
        Effect.orDie
      )
      return Effect.fail(`Expected path '${path}' to be a directory`).pipe(
        Effect.unlessEffect(checkIsDirectory),
        Effect.asUnit
      )
      //         ZIO.fail(s"Expected path '$value' to be a directory.").unlessZIO(self.fileSystem.isDirectory(path)).unit
    }
    case "either": {
      return Effect.unit
    }
  }
}
