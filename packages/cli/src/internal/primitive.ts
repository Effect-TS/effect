import * as FileSystem from "@effect/platform/FileSystem"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import { pipeArguments } from "effect/Pipeable"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as EffectSecret from "effect/Secret"
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

/** @internal */
export type Op<Tag extends string, Body = {}> = Primitive.Primitive<never> & Body & {
  readonly _tag: Tag
}

const proto = {
  [PrimitiveTypeId]: {
    _A: (_: never) => _
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export type Instruction =
  | Bool
  | Choice
  | DateTime
  | Float
  | Integer
  | Path
  | Secret
  | Text

/** @internal */
export interface Bool extends
  Op<"Bool", {
    readonly defaultValue: Option.Option<boolean>
  }>
{}

/** @internal */
export interface Choice extends
  Op<"Choice", {
    readonly alternatives: ReadonlyArray.NonEmptyReadonlyArray<[string, unknown]>
  }>
{}

/** @internal */
export interface DateTime extends Op<"DateTime", {}> {}

/** @internal */
export interface Float extends Op<"Float", {}> {}

/** @internal */
export interface Integer extends Op<"Integer", {}> {}

/** @internal */
export interface Path extends
  Op<"Path", {
    readonly pathType: Primitive.Primitive.PathType
    readonly pathExists: Primitive.Primitive.PathExists
  }>
{}

/** @internal */
export interface Secret extends Op<"Secret", {}> {}

/** @internal */
export interface Text extends Op<"Text", {}> {}

// =============================================================================
// Refinements
// =============================================================================

/** @internal */
export const isPrimitive = (u: unknown): u is Primitive.Primitive<unknown> =>
  typeof u === "object" && u != null && PrimitiveTypeId in u

/** @internal */
export const isBool = <A>(self: Primitive.Primitive<A>): boolean =>
  isPrimitive(self) && isBoolType(self as Instruction)

/** @internal */
export const isBoolType = (self: Instruction): self is Bool => self._tag === "Bool"

/** @internal */
export const isChoiceType = (self: Instruction): self is Choice => self._tag === "Choice"

/** @internal */
export const isDateTimeType = (self: Instruction): self is DateTime => self._tag === "DateTime"

/** @internal */
export const isFloatType = (self: Instruction): self is Float => self._tag === "Float"

/** @internal */
export const isIntegerType = (self: Instruction): self is Integer => self._tag === "Integer"

/** @internal */
export const isPathType = (self: Instruction): self is Path => self._tag === "Path"

/** @internal */
export const isSecretType = (self: Instruction): self is Path => self._tag === "Path"

/** @internal */
export const isTextType = (self: Instruction): self is Text => self._tag === "Text"

// =============================================================================
// Constructors
// =============================================================================

/** @internal */
export const trueValues = Schema.literal("true", "1", "y", "yes", "on")

/** @internal */
export const isTrueValue = Schema.is(trueValues)

/** @internal */
export const falseValues = Schema.literal("false", "0", "n", "no", "off")

/** @internal */
export const isFalseValue = Schema.is(falseValues)

/** @internal */
export const boolean = (defaultValue: Option.Option<boolean>): Primitive.Primitive<boolean> => {
  const op = Object.create(proto)
  op._tag = "Bool"
  op.defaultValue = defaultValue
  return op
}

/** @internal */
export const choice = <A>(
  alternatives: ReadonlyArray.NonEmptyReadonlyArray<[string, A]>
): Primitive.Primitive<A> => {
  const op = Object.create(proto)
  op._tag = "Choice"
  op.alternatives = alternatives
  return op
}

/** @internal */
export const date: Primitive.Primitive<globalThis.Date> = (() => {
  const op = Object.create(proto)
  op._tag = "DateTime"
  return op
})()

/** @internal */
export const float: Primitive.Primitive<number> = (() => {
  const op = Object.create(proto)
  op._tag = "Float"
  return op
})()

/** @internal */
export const integer: Primitive.Primitive<number> = (() => {
  const op = Object.create(proto)
  op._tag = "Integer"
  return op
})()

/** @internal */
export const path = (
  pathType: Primitive.Primitive.PathType,
  pathExists: Primitive.Primitive.PathExists
): Primitive.Primitive<string> => {
  const op = Object.create(proto)
  op._tag = "Path"
  op.pathType = pathType
  op.pathExists = pathExists
  return op
}

/** @internal */
export const secret: Primitive.Primitive<EffectSecret.Secret> = (() => {
  const op = Object.create(proto)
  op._tag = "Secret"
  return op
})()

/** @internal */
export const text: Primitive.Primitive<string> = (() => {
  const op = Object.create(proto)
  op._tag = "Text"
  return op
})()

// =============================================================================
// Combinators
// =============================================================================

/** @internal */
export const getChoices = <A>(self: Primitive.Primitive<A>): Option.Option<string> =>
  getChoicesInternal(self as Instruction)

/** @internal */
export const getHelp = <A>(self: Primitive.Primitive<A>): Span.Span =>
  getHelpInternal(self as Instruction)

/** @internal */
export const getTypeName = <A>(self: Primitive.Primitive<A>): string =>
  getTypeNameInternal(self as Instruction)

/** @internal */
export const validate = dual<
  (
    value: Option.Option<string>,
    config: CliConfig.CliConfig
  ) => <A>(self: Primitive.Primitive<A>) => Effect.Effect<
    FileSystem.FileSystem,
    string,
    A
  >,
  <A>(
    self: Primitive.Primitive<A>,
    value: Option.Option<string>,
    config: CliConfig.CliConfig
  ) => Effect.Effect<
    FileSystem.FileSystem,
    string,
    A
  >
>(3, (self, value, config) => validateInternal(self as Instruction, value, config))

/** @internal */
export const wizard = dual<
  (help: HelpDoc.HelpDoc) => <A>(self: Primitive.Primitive<A>) => Prompt.Prompt<A>,
  <A>(self: Primitive.Primitive<A>, help: HelpDoc.HelpDoc) => Prompt.Prompt<A>
>(2, (self, help) => wizardInternal(self as Instruction, help))

// =============================================================================
// Internals
// =============================================================================

const getChoicesInternal = (self: Instruction): Option.Option<string> => {
  switch (self._tag) {
    case "Bool": {
      return Option.some("true | false")
    }
    case "Choice": {
      const choices = pipe(
        ReadonlyArray.map(self.alternatives, ([choice]) => choice),
        ReadonlyArray.join(" | ")
      )
      return Option.some(choices)
    }
    case "DateTime": {
      return Option.some("date")
    }
    case "Float":
    case "Integer":
    case "Path":
    case "Secret":
    case "Text": {
      return Option.none()
    }
  }
}

const getHelpInternal = (self: Instruction): Span.Span => {
  switch (self._tag) {
    case "Bool": {
      return InternalSpan.text("A true or false value.")
    }
    case "Choice": {
      const choices = pipe(
        ReadonlyArray.map(self.alternatives, ([choice]) => choice),
        ReadonlyArray.join(", ")
      )
      return InternalSpan.text(`One of the following: ${choices}`)
    }
    case "DateTime": {
      return InternalSpan.text(
        "A date without a time-zone in the ISO-8601 format, such as 2007-12-03T10:15:30."
      )
    }
    case "Float": {
      return InternalSpan.text("A floating point number.")
    }
    case "Integer": {
      return InternalSpan.text("An integer.")
    }
    case "Path": {
      if (self.pathType === "either" && self.pathExists === "yes") {
        return InternalSpan.text("An existing file or directory.")
      }
      if (self.pathType === "file" && self.pathExists === "yes") {
        return InternalSpan.text("An existing file.")
      }
      if (self.pathType === "directory" && self.pathExists === "yes") {
        return InternalSpan.text("An existing directory.")
      }
      if (self.pathType === "either" && self.pathExists === "no") {
        return InternalSpan.text("A file or directory that must not exist.")
      }
      if (self.pathType === "file" && self.pathExists === "no") {
        return InternalSpan.text("A file that must not exist.")
      }
      if (self.pathType === "directory" && self.pathExists === "no") {
        return InternalSpan.text("A directory that must not exist.")
      }
      if (self.pathType === "either" && self.pathExists === "either") {
        return InternalSpan.text("A file or directory.")
      }
      if (self.pathType === "file" && self.pathExists === "either") {
        return InternalSpan.text("A file.")
      }
      if (self.pathType === "directory" && self.pathExists === "either") {
        return InternalSpan.text("A directory.")
      }
      throw new Error(
        "[BUG]: Path.help - encountered invalid combination of path type " +
          `('${self.pathType}') and path existence ('${self.pathExists}')`
      )
    }
    case "Secret": {
      return InternalSpan.text("A user-defined piece of text that is confidential.")
    }
    case "Text": {
      return InternalSpan.text("A user-defined piece of text.")
    }
  }
}

const getTypeNameInternal = (self: Instruction): string => {
  switch (self._tag) {
    case "Bool": {
      return "boolean"
    }
    case "Choice": {
      return "choice"
    }
    case "DateTime": {
      return "date"
    }
    case "Float": {
      return "float"
    }
    case "Integer": {
      return "integer"
    }
    case "Path": {
      if (self.pathType === "either") {
        return "path"
      }
      return self.pathType
    }
    case "Secret": {
      return "secret"
    }
    case "Text": {
      return "text"
    }
  }
}

const validateInternal = (
  self: Instruction,
  value: Option.Option<string>,
  config: CliConfig.CliConfig
): Effect.Effect<FileSystem.FileSystem, string, any> => {
  switch (self._tag) {
    case "Bool": {
      return Option.map(value, (str) => InternalCliConfig.normalizeCase(config, str)).pipe(
        Option.match({
          onNone: () =>
            Effect.orElseFail(
              self.defaultValue,
              () => `Missing default value for boolean parameter`
            ),
          onSome: (value) =>
            isTrueValue(value)
              ? Effect.succeed(true)
              : isFalseValue(value)
              ? Effect.succeed(false)
              : Effect.fail(`Unable to recognize '${value}' as a valid boolean`)
        })
      )
    }
    case "Choice": {
      return Effect.orElseFail(
        value,
        () => `Choice options to not have a default value`
      ).pipe(
        Effect.flatMap((value) =>
          ReadonlyArray.findFirst(self.alternatives, ([choice]) => choice === value)
        ),
        Effect.mapBoth({
          onFailure: () => {
            const choices = pipe(
              ReadonlyArray.map(self.alternatives, ([choice]) => choice),
              ReadonlyArray.join(", ")
            )
            return `Expected one of the following cases: ${choices}`
          },
          onSuccess: ([, value]) => value
        })
      )
    }
    case "DateTime": {
      return attempt(value, getTypeNameInternal(self), Schema.parse(Schema.Date))
    }
    case "Float": {
      return attempt(value, getTypeNameInternal(self), Schema.parse(Schema.NumberFromString))
    }
    case "Integer": {
      const intFromString = Schema.compose(Schema.NumberFromString, Schema.Int)
      return attempt(value, getTypeNameInternal(self), Schema.parse(intFromString))
    }
    case "Path": {
      return Effect.flatMap(FileSystem.FileSystem, (fileSystem) => {
        const errorMsg = "Path options do not have a default value"
        return Effect.orElseFail(value, () => errorMsg).pipe(
          Effect.tap((path) =>
            Effect.orDie(fileSystem.exists(path)).pipe(
              Effect.tap((pathExists) =>
                validatePathExistence(path, self.pathExists, pathExists).pipe(
                  Effect.zipRight(
                    validatePathType(path, self.pathType, fileSystem).pipe(
                      Effect.when(() => self.pathExists !== "no" && pathExists)
                    )
                  )
                )
              )
            )
          )
        )
      })
    }
    case "Secret": {
      return attempt(value, getTypeNameInternal(self), Schema.parse(Schema.string)).pipe(
        Effect.map((value) => EffectSecret.fromString(value))
      )
    }
    case "Text": {
      return attempt(value, getTypeNameInternal(self), Schema.parse(Schema.string))
    }
  }
}

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
    }
    case "either": {
      return Effect.unit
    }
  }
}

const wizardInternal = (self: Instruction, help: HelpDoc.HelpDoc): Prompt.Prompt<any> => {
  switch (self._tag) {
    case "Bool": {
      const primitiveHelp = InternalHelpDoc.p("Select true or false")
      const message = InternalHelpDoc.sequence(help, primitiveHelp)
      const initial = Option.getOrElse(self.defaultValue, () => false)
      return InternalTogglePrompt.toggle({
        message: InternalHelpDoc.toAnsiText(message).trimEnd(),
        initial,
        active: "true",
        inactive: "false"
      }).pipe(InternalPrompt.map((bool) => `${bool}`))
    }
    case "Choice": {
      const primitiveHelp = InternalHelpDoc.p("Select one of the following choices")
      const message = InternalHelpDoc.sequence(help, primitiveHelp)
      return InternalSelectPrompt.select({
        message: InternalHelpDoc.toAnsiText(message).trimEnd(),
        choices: ReadonlyArray.map(
          self.alternatives,
          ([title]) => ({ title, value: title })
        )
      })
    }
    case "DateTime": {
      const primitiveHelp = InternalHelpDoc.p("Enter a date")
      const message = InternalHelpDoc.sequence(help, primitiveHelp)
      return InternalDatePrompt.date({
        message: InternalHelpDoc.toAnsiText(message).trimEnd()
      }).pipe(InternalPrompt.map((date) => date.toISOString()))
    }
    case "Float": {
      const primitiveHelp = InternalHelpDoc.p("Enter a floating point value")
      const message = InternalHelpDoc.sequence(help, primitiveHelp)
      return InternalNumberPrompt.float({
        message: InternalHelpDoc.toAnsiText(message).trimEnd()
      }).pipe(InternalPrompt.map((value) => `${value}`))
    }
    case "Integer": {
      const primitiveHelp = InternalHelpDoc.p("Enter an integer")
      const message = InternalHelpDoc.sequence(help, primitiveHelp)
      return InternalNumberPrompt.integer({
        message: InternalHelpDoc.toAnsiText(message).trimEnd()
      }).pipe(InternalPrompt.map((value) => `${value}`))
    }
    case "Path": {
      const primitiveHelp = InternalHelpDoc.p("Enter a file system path")
      const message = InternalHelpDoc.sequence(help, primitiveHelp)
      return InternalTextPrompt.text({
        message: InternalHelpDoc.toAnsiText(message).trimEnd()
      })
    }
    case "Secret": {
      const primitiveHelp = InternalHelpDoc.p("Enter some text (value will be hidden)")
      const message = InternalHelpDoc.sequence(help, primitiveHelp)
      return InternalTextPrompt.hidden({
        message: InternalHelpDoc.toAnsiText(message).trimEnd()
      })
    }
    case "Text": {
      const primitiveHelp = InternalHelpDoc.p("Enter some text")
      const message = InternalHelpDoc.sequence(help, primitiveHelp)
      return InternalTextPrompt.text({
        message: InternalHelpDoc.toAnsiText(message).trimEnd()
      })
    }
  }
}

// =============================================================================
// Completion Internals
// =============================================================================

/** @internal */
export const getBashCompletions = (self: Instruction): string => {
  switch (self._tag) {
    case "Bool": {
      return "\"${cur}\""
    }
    case "DateTime":
    case "Float":
    case "Integer":
    case "Secret":
    case "Text": {
      return "$(compgen -f \"${cur}\")"
    }
    case "Path": {
      switch (self.pathType) {
        case "file": {
          return self.pathExists === "yes" || self.pathExists === "either"
            ? "$(compgen -f \"${cur}\")"
            : ""
        }
        case "directory": {
          return self.pathExists === "yes" || self.pathExists === "either"
            ? "$(compgen -d \"${cur}\")"
            : ""
        }
        case "either": {
          return self.pathExists === "yes" || self.pathExists === "either"
            ? "$(compgen -f \"${cur}\")"
            : ""
        }
      }
    }
    case "Choice": {
      const choices = pipe(
        ReadonlyArray.map(self.alternatives, ([choice]) => choice),
        ReadonlyArray.join(",")
      )
      return `$(compgen -W "${choices}" -- "\${cur}")`
    }
  }
}

/** @internal */
export const getFishCompletions = (self: Instruction): ReadonlyArray<string> => {
  switch (self._tag) {
    case "Bool": {
      return ReadonlyArray.empty()
    }
    case "DateTime":
    case "Float":
    case "Integer":
    case "Secret":
    case "Text": {
      return ReadonlyArray.make("-r", "-f")
    }
    case "Path": {
      switch (self.pathType) {
        case "file": {
          return self.pathExists === "yes" || self.pathExists === "either"
            ? ReadonlyArray.make("-r", "-F")
            : ReadonlyArray.make("-r")
        }
        case "directory": {
          return self.pathExists === "yes" || self.pathExists === "either"
            ? ReadonlyArray.make(
              "-r",
              "-f",
              "-a",
              `"(__fish_complete_directories (commandline -ct))"`
            )
            : ReadonlyArray.make("-r")
        }
        case "either": {
          return self.pathExists === "yes" || self.pathExists === "either"
            ? ReadonlyArray.make("-r", "-F")
            : ReadonlyArray.make("-r")
        }
      }
    }
    case "Choice": {
      const choices = pipe(
        ReadonlyArray.map(self.alternatives, ([choice]) => `${choice}''`),
        ReadonlyArray.join(",")
      )
      return ReadonlyArray.make("-r", "-f", "-a", `"{${choices}}"`)
    }
  }
}

/** @internal */
export const getZshCompletions = (self: Instruction): string => {
  switch (self._tag) {
    case "Bool": {
      return ""
    }
    case "Choice": {
      const choices = pipe(
        ReadonlyArray.map(self.alternatives, ([name]) => name),
        ReadonlyArray.join(" ")
      )
      return `:CHOICE:(${choices})`
    }
    case "DateTime": {
      return ""
    }
    case "Float": {
      return ""
    }
    case "Integer": {
      return ""
    }
    case "Path": {
      switch (self.pathType) {
        case "file": {
          return self.pathExists === "yes" || self.pathExists === "either"
            ? ":PATH:_files"
            : ""
        }
        case "directory": {
          return self.pathExists === "yes" || self.pathExists === "either"
            ? ":PATH:_files -/"
            : ""
        }
        case "either": {
          return self.pathExists === "yes" || self.pathExists === "either"
            ? ":PATH:_files"
            : ""
        }
      }
    }
    case "Secret":
    case "Text": {
      return ""
    }
  }
}
