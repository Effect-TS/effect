import { assert, describe, it } from "@effect/vitest"
import { Config, Context, Effect, Option } from "effect"
import { Argument, Command, CommandSpec, Flag, GlobalFlag, Prompt } from "effect/cli"

// Contract tests for the `CommandSpec` projection (EFF-3379). `resolve` is
// pure and synchronous: it reads a command tree without running handlers,
// prompts, `Config` or effectful defaults.

const specOf = (
  command: Command.Command.Any,
  path: ReadonlyArray<string>,
  options?: { readonly builtIns?: ReadonlyArray<GlobalFlag.GlobalFlag<any>> }
): CommandSpec.Spec => Option.getOrThrow(CommandSpec.resolve(command, path, options))

const flagOf = (spec: CommandSpec.Spec, name: string): CommandSpec.Flag => {
  const flag = spec.flags.find((flag) => flag.name === name)
  assert.isDefined(flag, `flag --${name} not found`)
  return flag
}

const argumentOf = (spec: CommandSpec.Spec, name: string): CommandSpec.Argument => {
  const argument = spec.arguments.find((argument) => argument.name === name)
  assert.isDefined(argument, `argument <${name}> not found`)
  return argument
}

describe("CommandSpec", () => {
  describe("resolve", () => {
    it("resolves a command by its name path and returns none for unknown paths", () => {
      const push = Command.make("push").pipe(Command.withDescription("Push migrations"))
      const db = Command.make("db").pipe(
        Command.withAlias("database"),
        Command.withSubcommands([push])
      )
      const app = Command.make("app").pipe(Command.withSubcommands([db]))

      const spec = specOf(app, ["app", "db", "push"])
      assert.deepStrictEqual(spec.path, ["app", "db", "push"])
      assert.strictEqual(spec.name, "push")
      assert.strictEqual(spec.description, "Push migrations")

      // The root command resolves to itself.
      assert.strictEqual(specOf(app, ["app"]).name, "app")

      // Paths are canonical names only: aliases, unknown segments, a foreign
      // root and the empty path are all rejected instead of resolving to the
      // deepest matching ancestor.
      assert.isTrue(Option.isNone(CommandSpec.resolve(app, ["app", "database", "push"])))
      assert.isTrue(Option.isNone(CommandSpec.resolve(app, ["app", "db", "pull"])))
      assert.isTrue(Option.isNone(CommandSpec.resolve(app, ["other", "db"])))
      assert.isTrue(Option.isNone(CommandSpec.resolve(app, [])))
    })

    it("reports the effective flags of a path with their provenance", () => {
      const Region = GlobalFlag.Setting("region")({ flag: Flag.String("region").pipe(Flag.optional) })
      const leaf = Command.make("leaf", { topic: Flag.String("topic") })
      const admin = Command.make("admin").pipe(
        Command.withGlobalFlags([Region]),
        Command.withSubcommands([leaf])
      )
      const app = Command.make("app", { workspace: Flag.String("workspace") }).pipe(
        Command.withSharedFlags({ profile: Flag.String("profile") }),
        Command.withSubcommands([admin])
      )

      const spec = specOf(app, ["app", "admin", "leaf"])

      // Local first, then inherited shared flags root to leaf, then globals
      // with built-ins ahead of declarations. Flags local to an ancestor
      // (`--workspace`) are not part of the leaf's surface.
      assert.deepStrictEqual(
        spec.flags.map((flag) => [flag.name, flag.scope] as const),
        [
          ["topic", { _tag: "Local" }],
          ["profile", { _tag: "Inherited", declaredBy: ["app"] }],
          ["help", { _tag: "Global", declaredBy: undefined, kind: "Action" }],
          ["version", { _tag: "Global", declaredBy: undefined, kind: "Action" }],
          ["wizard", { _tag: "Global", declaredBy: undefined, kind: "Action" }],
          ["completions", { _tag: "Global", declaredBy: undefined, kind: "Action" }],
          ["log-level", { _tag: "Global", declaredBy: undefined, kind: "Setting" }],
          ["region", { _tag: "Global", declaredBy: ["app", "admin"], kind: "Setting" }]
        ]
      )

      // Built-ins come from the options and default to `GlobalFlag.BuiltIns`.
      const withoutBuiltIns = specOf(app, ["app", "admin", "leaf"], { builtIns: [] })
      assert.deepStrictEqual(
        withoutBuiltIns.flags.map((flag) => flag.name),
        ["topic", "profile", "region"]
      )

      // A global declared on a descendant is not active on its ancestors.
      assert.isFalse(specOf(app, ["app"]).flags.some((flag) => flag.name === "region"))
    })

    it("includes hidden flags and unlisted subcommands and marks them", () => {
      const secret = Command.make("experimental-foo").pipe(Command.unlisted)
      const deploy = Command.make("deploy").pipe(
        Command.withAlias("d"),
        Command.withShortDescription("Deploy"),
        Command.withDescription("Deploy the application")
      )
      const app = Command.make("app", {
        debugPort: Flag.Int("debug-port").pipe(Flag.withHidden),
        verbose: Flag.Boolean("verbose")
      }).pipe(
        Command.withSubcommands([
          { group: "Ops", commands: [deploy] },
          secret
        ])
      )

      const spec = specOf(app, ["app"], { builtIns: [] })

      assert.deepStrictEqual(
        spec.flags.map((flag) => [flag.name, flag.hidden] as const),
        [["debug-port", true], ["verbose", false]]
      )

      // An aliased subcommand is listed once, with its alias as data.
      assert.deepStrictEqual(spec.subcommands, [
        {
          name: "deploy",
          alias: "d",
          group: "Ops",
          unlisted: false,
          shortDescription: "Deploy",
          description: "Deploy the application"
        },
        {
          name: "experimental-foo",
          alias: undefined,
          group: undefined,
          unlisted: true,
          shortDescription: undefined,
          description: undefined
        }
      ])
    })

    it("describes the input surface of a flag without collapsing types", () => {
      const app = Command.make("app", {
        port: Flag.Int("port").pipe(
          Flag.withAlias("p"),
          Flag.withDescription("Port to listen on"),
          Flag.withMetavar("PORT")
        ),
        config: Flag.FileText("config"),
        format: Flag.Literals("format", ["json", "table"]),
        force: Flag.Boolean("force"),
        quiet: Flag.Boolean("quiet").pipe(Flag.withoutNegation),
        color: Flag.String("color").pipe(Flag.withOptionalValue("auto"))
      })

      const spec = specOf(app, ["app"], { builtIns: [] })

      const port = flagOf(spec, "port")
      assert.deepStrictEqual(port.aliases, ["p"])
      assert.strictEqual(port.description, "Port to listen on")
      assert.deepStrictEqual(port.type, { _tag: "Int" })
      assert.strictEqual(port.typeName, "integer")
      assert.strictEqual(port.metavar, "PORT")
      assert.isTrue(port.required)
      assert.deepStrictEqual(port.fallbacks, [])

      assert.deepStrictEqual(flagOf(spec, "config").type, { _tag: "FileText" })
      assert.deepStrictEqual(flagOf(spec, "format").type, { _tag: "Choice", values: ["json", "table"] })

      // Booleans are never required and expose their effective negated name.
      const force = flagOf(spec, "force")
      assert.isFalse(force.required)
      assert.strictEqual(force.negation, "no-force")
      assert.strictEqual(flagOf(spec, "quiet").negation, undefined)

      assert.strictEqual(flagOf(spec, "color").optionalValue, "auto")
    })

    it("records fallbacks structurally in the order they are consulted, without executing them", () => {
      let defaultEvaluated = false
      let promptBuilt = false

      const app = Command.make("app", {
        port: Flag.Int("port").pipe(
          Flag.withFallbackConfig(Config.Int("PORT")),
          Flag.withDefault(8080)
        ),
        token: Flag.String("token").pipe(Flag.withFallbackConfig(Config.String("TOKEN"))),
        retries: Flag.Int("retries").pipe(
          Flag.withDefault(Effect.sync(() => {
            defaultEvaluated = true
            return 3
          }))
        ),
        name: Flag.String("name").pipe(
          Flag.withFallbackPrompt(Effect.sync(() => {
            promptBuilt = true
            return Prompt.String({ message: "Name" })
          }))
        ),
        tag: Flag.String("tag").pipe(Flag.optional)
      })

      const spec = specOf(app, ["app"], { builtIns: [] })

      const port = flagOf(spec, "port")
      assert.isFalse(port.required)
      assert.deepStrictEqual(port.fallbacks, [
        { _tag: "Config" },
        { _tag: "Default", value: 8080 }
      ])

      // A config fallback alone does not make the flag optional on the
      // command line; the parser still fails when neither supplies a value.
      const token = flagOf(spec, "token")
      assert.isTrue(token.required)
      assert.deepStrictEqual(token.fallbacks, [{ _tag: "Config" }])

      assert.deepStrictEqual(flagOf(spec, "retries").fallbacks, [{ _tag: "DefaultEffect" }])
      assert.deepStrictEqual(flagOf(spec, "name").fallbacks, [{ _tag: "Prompt" }])
      assert.isFalse(defaultEvaluated)
      assert.isFalse(promptBuilt)

      const tag = flagOf(spec, "tag")
      assert.isFalse(tag.required)
      assert.deepStrictEqual(tag.fallbacks, [])
    })

    it("carries user annotations and keeps metadata through later combinators", () => {
      const EnvVar = Context.Service<never, string>("effect/test/cli/CommandSpec/EnvVar")

      const app = Command.make("app", {
        port: Flag.Int("port").pipe(
          Flag.withDefault(8080),
          Flag.annotate(EnvVar, "APP_PORT"),
          Flag.withAlias("p"),
          Flag.withMetavar("PORT")
        ),
        plain: Flag.String("plain")
      })

      const spec = specOf(app, ["app"], { builtIns: [] })

      const port = flagOf(spec, "port")
      assert.strictEqual(Context.get(port.annotations, EnvVar), "APP_PORT")
      assert.deepStrictEqual(port.fallbacks, [{ _tag: "Default", value: 8080 }])
      assert.deepStrictEqual(port.aliases, ["p"])
      assert.strictEqual(port.metavar, "PORT")

      assert.isTrue(Option.isNone(Context.getOption(flagOf(spec, "plain").annotations, EnvVar)))
    })

    it("reports argument requiredness and variadic bounds", () => {
      const app = Command.make("app", {
        target: Argument.String("target"),
        files: Argument.String("files").pipe(Argument.variadic),
        names: Argument.String("names").pipe(Argument.atLeast(1))
      })

      const spec = specOf(app, ["app"], { builtIns: [] })

      const target = argumentOf(spec, "target")
      assert.isTrue(target.required)
      assert.strictEqual(target.variadic, undefined)

      // A zero-minimum variadic accepts no values, so it is not required.
      const files = argumentOf(spec, "files")
      assert.isFalse(files.required)
      assert.deepStrictEqual(files.variadic, { min: undefined, max: undefined })

      const names = argumentOf(spec, "names")
      assert.isTrue(names.required)
      assert.deepStrictEqual(names.variadic, { min: 1, max: undefined })
    })

    it("resolves examples for the requested path", () => {
      const deploy = Command.make("deploy").pipe(
        Command.withExamples(({ commandPath }) => [
          { command: `${commandPath.join(" ")} --prod`, description: "Deploy to production" }
        ])
      )
      const app = Command.make("app").pipe(Command.withSubcommands([deploy]))

      assert.deepStrictEqual(specOf(app, ["app", "deploy"]).examples, [
        { command: "app deploy --prod", description: "Deploy to production" }
      ])
    })
  })
})
