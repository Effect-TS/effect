#!/usr/bin/env node

/**
 * @since 0.6.0
 */
import * as Array from "effect/Array"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as CliError from "effect/unstable/cli/CliError"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import PackageJson from "../package.json" with { type: "json" }
import * as Configuration from "./Configuration.ts"
import * as Core from "./Core.ts"
import * as Domain from "./Domain.ts"

const projectHomepage = Flag.string("homepage").pipe(
  Flag.withFallbackConfig(Config.string("projectHomepage")),
  Flag.withDescription(
    "The link to the project homepage (will be shown in the Auxiliary Links of the generated documentation)"
  ),
  Flag.optional
)

const srcLink = Flag.string("srcLink").pipe(
  Flag.withFallbackConfig(Config.string("srcLink")),
  Flag.withDescription("The link to the project source code"),
  Flag.optional
)

const srcDir = Flag.directory("src", { mustExist: true }).pipe(
  Flag.withFallbackConfig(Config.string("srcDir").pipe(Config.withDefault("src"))),
  Flag.withDescription("The directory in which docgen will search for TypeScript files to parse")
)

const outDir = Flag.directory("out").pipe(
  Flag.withFallbackConfig(Config.string("outDir").pipe(Config.withDefault("docs"))),
  Flag.withDescription("The directory to which docgen will generate its output markdown documents")
)

const theme = Flag.string("theme").pipe(
  Flag.withFallbackConfig(Config.string("theme").pipe(Config.withDefault(Configuration.DEFAULT_THEME))),
  Flag.withDescription("The Jekyll theme that should be used for the generated documentation")
)

const disableSearch = Flag.boolean("disable-search").pipe(
  Flag.withDescription("Whether or not search should be enabled in the generated documentation"),
  Flag.optional
)

const enableSearchAlias = Flag.boolean("enable-search").pipe(
  Flag.withDescription("Whether or not search should be enabled in the generated documentation"),
  Flag.optional
)

const enforceDescriptions = Flag.boolean("enforce-descriptions").pipe(
  Flag.withDescription("Whether or not a description for each module export should be required"),
  Flag.optional
)

const enforceExamples = Flag.boolean("enforce-examples").pipe(
  Flag.withDescription(
    "Whether or not @example tags for each module export should be required " +
      "(Note: examples will not be enforced in module documentation)"
  ),
  Flag.optional
)

const noEnforceVersion = Flag.boolean("no-enforce-version").pipe(
  Flag.withDescription("Whether or not @since tags for each module export should be required"),
  Flag.optional
)

const enforceVersionAlias = Flag.boolean("enforce-version").pipe(
  Flag.withDescription("Whether or not @since tags for each module export should be required"),
  Flag.optional
)

const noDocs = Flag.boolean("no-docs").pipe(
  Flag.withDescription("Disable Markdown documentation generation"),
  Flag.optional
)

const noExamples = Flag.boolean("no-examples").pipe(
  Flag.withDescription("Disable extracted TypeScript example generation"),
  Flag.optional
)

const json = Flag.file("json").pipe(
  Flag.withDescription("Write the renderer-independent semantic model to a JSON file"),
  Flag.optional
)

const frontend = Flag.choice("frontend", ["source", "declaration"]).pipe(
  Flag.withFallbackConfig(Config.literals(["source", "declaration"], "frontend").pipe(Config.withDefault("source"))),
  Flag.withDescription("Select the source or declaration analysis frontend")
)

const exclude = Flag.string("exclude").pipe(
  Flag.between(0, Infinity),
  Flag.withFallbackConfig(
    Config.schema(Config.Array(Schema.String), "exclude").pipe(
      Config.withDefault(Array.empty<string>())
    )
  ),
  Flag.withDescription(
    "An array of glob patterns specifying files that should be excluded from the generated documentation"
  )
)

const compilerOptionsSchema = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown))

const parseCompilerOptionsFlag = (name: string, description: string) =>
  Flag.string(name).pipe(
    Flag.withDescription(description),
    Flag.mapEffect((value) =>
      Schema.decodeUnknownEffect(compilerOptionsSchema)(value).pipe(
        Effect.mapError((error) =>
          new CliError.InvalidValue({
            option: name,
            value,
            expected: `a JSON record (${globalThis.String(error)})`,
            kind: "flag"
          })
        )
      )
    )
  )

const parseCompilerOptionsFile = Flag.file("parse-tsconfig-file", { mustExist: true }).pipe(
  Flag.withDescription("The TypeScript TSConfig file to use for parsing source files"),
  Flag.optional
)

const parseCompilerOptionsInline = parseCompilerOptionsFlag(
  "parse-compiler-options",
  "The TypeScript compiler options to use for parsing source files"
).pipe(Flag.optional)

const validate = Flag.boolean("validate").pipe(
  Flag.withDescription("Validate documentation without rendering or writing generated output")
)

const packages = Flag.string("package").pipe(
  Flag.withDescription("Validate packages whose documentation slug contains this value (repeatable)"),
  Flag.atMost(Number.MAX_SAFE_INTEGER)
)

const paths = Flag.string("path").pipe(
  Flag.withDescription("Validate workspace-relative source paths containing this value (repeatable)"),
  Flag.atMost(Number.MAX_SAFE_INTEGER)
)

const options = {
  projectHomepage,
  srcLink,
  srcDir,
  outDir,
  theme,
  disableSearch,
  enableSearchAlias,
  enforceDescriptions,
  enforceExamples,
  noEnforceVersion,
  enforceVersionAlias,
  noDocs,
  noExamples,
  json,
  frontend,
  exclude,
  parseCompilerOptionsFile,
  parseCompilerOptionsInline,
  validate,
  packages,
  paths
}

/** @internal */
export const docgenCommand = Command.make("docgen", options)

/** @internal */
export const loadConfiguration = Effect.fnUntraced(function*(
  args: Command.Command.Config.Infer<typeof options>
) {
  const {
    enableSearchAlias,
    disableSearch,
    enforceDescriptions,
    enforceExamples,
    enforceVersionAlias,
    noEnforceVersion,
    noDocs,
    noExamples,
    json: _json,
    parseCompilerOptionsFile,
    parseCompilerOptionsInline,
    validate: _validate,
    packages: _packages,
    paths: _paths,
    ...config
  } = args
  void _validate
  void _packages
  void _paths
  void _json
  if (Option.isSome(parseCompilerOptionsFile) && Option.isSome(parseCompilerOptionsInline)) {
    return yield* new CliError.InvalidValue({
      option: "parse-compiler-options",
      value: JSON.stringify(parseCompilerOptionsInline.value),
      expected: "only one of --parse-tsconfig-file or --parse-compiler-options",
      kind: "flag"
    })
  }
  const configuredEnableSearch = yield* Config.boolean("enableSearch").pipe(Effect.orElseSucceed(() => true))
  const configuredEnforceDescriptions = yield* Config.boolean("enforceDescriptions").pipe(
    Effect.orElseSucceed(() => false)
  )
  const configuredEnforceExamples = yield* Config.boolean("enforceExamples").pipe(
    Effect.orElseSucceed(() => false)
  )
  const configuredEnforceVersion = yield* Config.boolean("enforceVersion").pipe(Effect.orElseSucceed(() => true))
  const configuredGenerateDocs = yield* Config.boolean("generateDocs").pipe(Effect.orElseSucceed(() => true))
  const configuredGenerateExamples = yield* Config.boolean("generateExamples").pipe(Effect.orElseSucceed(() => true))
  return yield* Configuration.load({
    ...config,
    enableSearch: Option.match(disableSearch, {
      onNone: () => Option.getOrElse(enableSearchAlias, () => configuredEnableSearch),
      onSome: (disabled) => !disabled
    }),
    enforceDescriptions: Option.getOrElse(enforceDescriptions, () => configuredEnforceDescriptions),
    enforceExamples: Option.getOrElse(enforceExamples, () => configuredEnforceExamples),
    enforceVersion: Option.match(noEnforceVersion, {
      onNone: () => Option.getOrElse(enforceVersionAlias, () => configuredEnforceVersion),
      onSome: (disabled) => !disabled
    }),
    generateDocs: Option.match(noDocs, {
      onNone: () => configuredGenerateDocs,
      onSome: (disabled) => !disabled
    }),
    generateExamples: Option.match(noExamples, {
      onNone: () => configuredGenerateExamples,
      onSome: (disabled) => !disabled
    }),
    parseCompilerOptions: Option.orElse(parseCompilerOptionsFile, () => parseCompilerOptionsInline)
  })
})

const command = docgenCommand.pipe(
  Command.withHandler(({ json, packages, paths, validate }) =>
    Effect.scoped(Core.program({
      jsonFile: Option.getOrUndefined(json),
      packages,
      paths,
      validateOnly: validate
    })).pipe(
      Effect.catchTag("DocgenError", (error) =>
        Effect.gen(function*() {
          const config = yield* Configuration.Configuration
          return yield* new Domain.DocgenError({
            message: config.workspace ? error.message : `[${config.projectName}] ${error.message}`
          })
        }))
    )
  ),
  Command.provideEffect(Configuration.Configuration, loadConfiguration)
)

/**
 * @category CLI
 * @since 0.6.0
 */
export const cli = Command.runWith(command, {
  version: PackageJson["version"]
})
