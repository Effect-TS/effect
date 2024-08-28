import type * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Prompt from "@effect/cli/Prompt"
import * as MockConsole from "@effect/cli/test/services/MockConsole"
import * as MockTerminal from "@effect/cli/test/services/MockTerminal"
import { NodeFileSystem, NodePath } from "@effect/platform-node"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import { describe, expect, it } from "vitest"

const MainLive = Effect.gen(function*(_) {
  const console = yield* _(MockConsole.make)
  return Layer.mergeAll(
    Console.setConsole(console),
    NodeFileSystem.layer,
    MockTerminal.layer,
    NodePath.layer
  )
}).pipe(Layer.unwrapEffect)

const runEffect = <E, A>(
  self: Effect.Effect<A, E, CliApp.CliApp.Environment>
): Promise<A> => Effect.provide(self, MainLive).pipe(Effect.runPromise)

describe("Prompt", () => {
  describe("text", () => {
    it("should use the prompt value when no default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.text({
          message: "This does not have a default"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toBe("")
      }).pipe(runEffect))

    it("should use the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.text({
          message: "This should have a default",
          default: "default-value"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toBe("default-value")
      }).pipe(runEffect))

    it("should render the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.text({
          message: "Test Prompt",
          default: "default-value"
        })

        const cli = Command.prompt("test-command", prompt, () => Effect.void).pipe(Command.run({
          name: "Test",
          version: "1.0.0"
        }))

        const fiber = yield* Effect.fork(cli([]))

        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)

        const lines = yield* MockConsole.getLines()

        const unsubmittedValue = Doc.annotate(Doc.text("default-value"), Ansi.blackBright).pipe(Doc.render({
          style: "pretty"
        }))

        const submittedValue = Doc.annotate(Doc.text("default-value"), Ansi.green).pipe(Doc.render({
          style: "pretty"
        }))

        expect(lines).toEqual(
          expect.arrayContaining([
            expect.stringContaining(
              unsubmittedValue
            ),
            expect.stringContaining(
              submittedValue
            )
          ])
        )

        expect(lines.findIndex((line) => line.includes(unsubmittedValue))).toBeLessThan(
          lines.findIndex((line) => line.includes(submittedValue))
        )
      }).pipe(runEffect))

    it("should accept the default value when the tab is pressed", () =>
      Effect.gen(function*() {
        const prompt = Prompt.text({
          message: "Test Prompt",
          default: "default-value"
        })

        const cli = Command.prompt("test-command", prompt, () => Effect.void).pipe(Command.run({
          name: "Test",
          version: "1.0.0"
        }))

        const fiber = yield* Effect.fork(cli([]))

        yield* MockTerminal.inputKey("tab")
        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)

        const lines = yield* MockConsole.getLines()

        const unsubmittedValue = Doc.annotate(Doc.text("default-value"), Ansi.blackBright).pipe(Doc.render({
          style: "pretty"
        }))

        const enteredValue = Doc.annotate(Doc.text("default-value"), Ansi.combine(Ansi.underlined, Ansi.cyanBright))
          .pipe(Doc.render({
            style: "pretty"
          }))

        expect(lines).toEqual(
          expect.arrayContaining([
            expect.stringContaining(
              unsubmittedValue
            ),
            expect.stringContaining(
              enteredValue
            )
          ])
        )

        expect(lines.findIndex((line) => line.includes(unsubmittedValue))).toBeLessThan(
          lines.findIndex((line) => line.includes(enteredValue))
        )
      }).pipe(runEffect))
  })

  describe("hidden", () => {
    it("should use the prompt value when no default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.hidden({
          message: "This does not have a default"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(Redacted.make(""))
      }).pipe(runEffect))

    it("should use the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.hidden({
          message: "This should have a default",
          default: "default-value"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(Redacted.make("default-value"))
      }).pipe(runEffect))

    it("should not render the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.hidden({
          message: "Test Prompt",
          default: "default-value"
        })

        const cli = Command.prompt("test-command", prompt, () => Effect.void).pipe(Command.run({
          name: "Test",
          version: "1.0.0"
        }))

        const fiber = yield* Effect.fork(cli([]))

        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)

        const lines = yield* MockConsole.getLines({ stripAnsi: true })

        expect(lines).not.toEqual(
          expect.arrayContaining([
            expect.stringContaining(
              "default-value"
            )
          ])
        )
      }).pipe(runEffect))
  })

  describe("list", () => {
    it("should use the prompt value when no default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.list({
          message: "This does not have a default"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual([""])
      }).pipe(runEffect))

    it("should use the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.list({
          message: "This should have a default",
          default: "default-value"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(["default-value"])
      }).pipe(runEffect))

    it("should render the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.list({
          message: "Test Prompt",
          default: "default-value"
        })

        const cli = Command.prompt("test-command", prompt, () => Effect.void).pipe(Command.run({
          name: "Test",
          version: "1.0.0"
        }))

        const fiber = yield* Effect.fork(cli([]))

        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)

        const lines = yield* MockConsole.getLines()

        const unsubmittedValue = Doc.annotate(Doc.text("default-value"), Ansi.blackBright).pipe(Doc.render({
          style: "pretty"
        }))

        const submittedValue = Doc.annotate(Doc.text("default-value"), Ansi.green).pipe(Doc.render({
          style: "pretty"
        }))

        expect(lines).toEqual(
          expect.arrayContaining([
            expect.stringContaining(
              unsubmittedValue
            ),
            expect.stringContaining(
              submittedValue
            )
          ])
        )

        expect(lines.findIndex((line) => line.includes(unsubmittedValue))).toBeLessThan(
          lines.findIndex((line) => line.includes(submittedValue))
        )
      }).pipe(runEffect))
  })

  describe("password", () => {
    it("should use the prompt value when no default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.password({
          message: "This does not have a default"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(Redacted.make(""))
      }).pipe(runEffect))

    it("should use the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.password({
          message: "This should have a default",
          default: "default-value"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(Redacted.make("default-value"))
      }).pipe(runEffect))

    it("should render the redacted default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.password({
          message: "Test Prompt",
          default: "default-value"
        })

        const cli = Command.prompt("test-command", prompt, () => Effect.void).pipe(Command.run({
          name: "Test",
          version: "1.0.0"
        }))

        const fiber = yield* Effect.fork(cli([]))

        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)

        const lines = yield* MockConsole.getLines()

        const redactedValue = Array.from("default-value", () => "*").join("")
        const unsubmittedValue = Doc.annotate(Doc.text(redactedValue), Ansi.blackBright).pipe(Doc.render({
          style: "pretty"
        }))

        const submittedValue = Doc.annotate(Doc.text(redactedValue), Ansi.green).pipe(Doc.render({
          style: "pretty"
        }))

        expect(lines).toEqual(
          expect.arrayContaining([
            expect.stringContaining(
              unsubmittedValue
            ),
            expect.stringContaining(
              submittedValue
            )
          ])
        )

        expect(lines.findIndex((line) => line.includes(unsubmittedValue))).toBeLessThan(
          lines.findIndex((line) => line.includes(submittedValue))
        )
      }).pipe(runEffect))
  })
})
