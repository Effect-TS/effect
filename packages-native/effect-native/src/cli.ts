/**
 * Shared wiring for the `effect-native` CLI: command tree, layers, and runtime helpers.
 *
 * The module keeps our ultra extreme programming feedback loops visible in the
 * generated help output and exposes utilities that the entrypoint and tests share.
 *
 * @since 0.0.1
 */
import { Command, HelpDoc, Span } from "@effect/cli"
import * as CliConfig from "@effect/cli/CliConfig"
import { NodeContext } from "@effect/platform-node"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import packageJson from "../package.json" with { type: "json" }

/**
 * Current `effect-native` package version.
 * @since 0.0.1
 */
export const version = packageJson.version as string

const tightFeedbackDoc = HelpDoc.sequence(
  HelpDoc.p("tight feedback loops keep optimism in check"),
  HelpDoc.enumeration([
    HelpDoc.p("daily: plan with the customer -> release something tiny"),
    HelpDoc.p("hourly: pair -> TDD -> refactor -> CI"),
    HelpDoc.p("each change: red -> green -> refactor following the simple design rules")
  ])
)

const guardrailsDoc = HelpDoc.p(
  "Guardrails: 5-min build, sustainable pace, collective ownership"
)

const sliceDoc = HelpDoc.p(
  "Slice time very thinly so every slice includes discovery, design, implementation, and checks"
)

const activitiesDoc = HelpDoc.sequence(
  HelpDoc.p("uXP activities repeat every slice:"),
  HelpDoc.enumeration([
    HelpDoc.p("figure out what to do"),
    HelpDoc.p("figure out the structure that will let us do it"),
    HelpDoc.p("implement the features"),
    HelpDoc.p("make sure they work as expected")
  ])
)

const doctorCommand = Command.make("doctor", {}, () =>
  Console.log(
    [
      "doctor checks that your workstation can keep feedback loops tight:",
      "  1. nix develop --command pnpm install",
      "  2. nix develop --command pnpm ok"
    ].join("\n")
  )).pipe(
    Command.withDescription(
      HelpDoc.p("Verify tooling: Effect, pnpm, Nix, and native deps stay in sync")
    )
  )

/**
 * Root command exposed by the CLI.
 * @since 0.0.1
 */
export const effectNativeCommand = Command.make("effect-native").pipe(
  Command.withDescription(
    HelpDoc.blocks([
      HelpDoc.p("Effect Native CLI for ultra extreme programmers"),
      tightFeedbackDoc,
      guardrailsDoc,
      sliceDoc,
      activitiesDoc
    ])
  ),
  Command.withSubcommands([
    doctorCommand
  ])
)

/**
 * CLI configuration shared by the binary and tests.
 * @since 0.0.1
 */
export const CliLayer = CliConfig.layer({
  showBuiltIns: false
})

/**
 * Baseline layer stack required by the CLI.
 * @since 0.0.1
 */
export const MainLayer = Layer.mergeAll(
  CliLayer,
  NodeContext.layer
)

/**
 * Fully-configured CLI application ready to interpret `process.argv`.
 * @since 0.0.1
 */
export const cli = Command.run(effectNativeCommand, {
  name: "effect-native",
  version,
  summary: Span.text("tight feedback loops for ultra extreme programmers"),
  footer: HelpDoc.p("Conclusions are based on evidence. When tests go green, refactor and re-evaluate design.")
})

/**
 * Convenience helper for executing the CLI with the default layer stack.
 * @since 0.0.1
 */
export const run = (args: ReadonlyArray<string>) =>
  Effect.suspend(() => cli(args)).pipe(
    Effect.provide(MainLayer)
  )
