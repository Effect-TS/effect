import type * as CliApp from "@effect/cli/CliApp"
import * as Prompt from "@effect/cli/Prompt"
import { NodeFileSystem, NodePath } from "@effect/platform-node"
import * as Ansi from "@effect/printer-ansi/Ansi"
import * as Doc from "@effect/printer-ansi/AnsiDoc"
import { describe, expect, it } from "@effect/vitest"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as MockConsole from "./services/MockConsole.js"
import * as MockTerminal from "./services/MockTerminal.js"

const MainLive = Effect.gen(function*() {
  const console = yield* MockConsole.make
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

        const fiber = yield* Effect.fork(prompt)

        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)

        const lines = yield* MockConsole.getLines()

        const unsubmittedValue = Doc.annotate(Doc.text("default-value"), Ansi.blackBright).pipe(Doc.render({
          style: "pretty"
        }))

        const submittedValue = Doc.annotate(Doc.text("default-value"), Ansi.white).pipe(Doc.render({
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

        const fiber = yield* Effect.fork(prompt)

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

        const fiber = yield* Effect.fork(prompt)

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

        const fiber = yield* Effect.fork(prompt)

        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)

        const lines = yield* MockConsole.getLines()

        const unsubmittedValue = Doc.annotate(Doc.text("default-value"), Ansi.blackBright).pipe(Doc.render({
          style: "pretty"
        }))

        const submittedValue = Doc.annotate(Doc.text("default-value"), Ansi.white).pipe(Doc.render({
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

        const fiber = yield* Effect.fork(prompt)

        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)

        const lines = yield* MockConsole.getLines()

        const redactedValue = "*".repeat("default-value".length)
        const unsubmittedValue = Doc.annotate(Doc.text(redactedValue), Ansi.blackBright).pipe(Doc.render({
          style: "pretty"
        }))

        const submittedValue = Doc.annotate(Doc.text(redactedValue), Ansi.white).pipe(Doc.render({
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

  describe("Prompt.select", () => {
    it("should return the selected value when an option is chosen", () =>
      Effect.gen(function*() {
        const prompt = Prompt.select({
          message: "Select an option",
          choices: [
            { title: "Option 1", value: 1 },
            { title: "Option 2", value: 2 },
            { title: "Option 3", value: 3 }
          ]
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("down")
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(2)
      }).pipe(runEffect))

    it("should honor a single default selected choice", () =>
      Effect.gen(function*() {
        const prompt = Prompt.select({
          message: "Select an option",
          choices: [
            { title: "Option 1", value: 1 },
            { title: "Option 2", value: 2, selected: true },
            { title: "Option 3", value: 3 }
          ]
        })

        const fiber = yield* Effect.fork(prompt)
        // Immediately submit without navigation
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(2)
      }).pipe(runEffect))

    it("should throw if multiple default selected choices are provided", () =>
      Effect.gen(function*() {
        expect(() =>
          Prompt.select({
            message: "Select an option",
            choices: [
              { title: "Option 1", value: 1, selected: true },
              { title: "Option 2", value: 2, selected: true },
              { title: "Option 3", value: 3 }
            ]
          })
        ).toThrow()
      }).pipe(runEffect))
  })

  describe("Prompt.selectMulti", () => {
    it("should return the selected values when multiple options are chosen", () =>
      Effect.gen(function*() {
        const prompt = Prompt.multiSelect({
          message: "Select multiple options",
          choices: [
            { title: "Option A", value: "A" },
            { title: "Option B", value: "B" },
            { title: "Option C", value: "C" }
          ]
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("down")
        yield* MockTerminal.inputKey("down")
        yield* MockTerminal.inputKey("space")
        yield* MockTerminal.inputKey("down")
        yield* MockTerminal.inputKey("space")
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(["A", "B"])
      }).pipe(runEffect))

    it("should select all options when 'Select All' is triggered", () =>
      Effect.gen(function*() {
        const prompt = Prompt.multiSelect({
          message: "Select multiple options",
          choices: [
            { title: "Option A", value: "A" },
            { title: "Option B", value: "B" },
            { title: "Option C", value: "C" }
          ]
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("space") // Select All
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(["A", "B", "C"])
      }).pipe(runEffect))

    it("should deselect all options when 'Select None' is triggered", () =>
      Effect.gen(function*() {
        const prompt = Prompt.multiSelect({
          message: "Select multiple options",
          choices: [
            { title: "Option A", value: "A" },
            { title: "Option B", value: "B" },
            { title: "Option C", value: "C" }
          ]
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("space") // Select All
        yield* MockTerminal.inputKey("space") // Select None
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual([])
      }).pipe(runEffect))

    it("should inverse the selection when 'Inverse Selection' is triggered", () =>
      Effect.gen(function*() {
        const prompt = Prompt.multiSelect({
          message: "Select multiple options",
          choices: [
            { title: "Option A", value: "A" },
            { title: "Option B", value: "B" },
            { title: "Option C", value: "C" }
          ]
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("space")
        yield* MockTerminal.inputKey("tab")
        yield* MockTerminal.inputKey("tab")
        yield* MockTerminal.inputKey("space")
        yield* MockTerminal.inputKey("up")
        yield* MockTerminal.inputKey("space")
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(["A"])
      }).pipe(runEffect))

    it("should preselect choices marked with selected: true", () =>
      Effect.gen(function*() {
        const prompt = Prompt.multiSelect({
          message: "Select multiple options",
          choices: [
            { title: "Option A", value: "A", selected: true },
            { title: "Option B", value: "B", selected: true },
            { title: "Option C", value: "C" }
          ]
        })

        const fiber = yield* Effect.fork(prompt)
        // Immediately submit without any navigation or toggling
        yield* MockTerminal.inputKey("enter")
        const result = yield* Fiber.join(fiber)

        expect(result).toEqual(["A", "B"])
      }).pipe(runEffect))
  })
})
