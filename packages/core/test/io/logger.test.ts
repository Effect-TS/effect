import { Effect } from "../../src/io/Effect"
import { Logger } from "../../src/io/Logger"
import { LogLevel } from "../../src/io/LogLevel"
import { TestLogger } from "../test-utils/TestLogger"

describe("Logger", () => {
  it("logs a simple message", async () => {
    const program = (Effect.log("It's alive!") > TestLogger.logOutput).provideLayer(
      TestLogger.default
    )

    const result = await program.unsafeRunPromise()

    expect(result.length).toBe(1)
    expect(result[0]?.message()).toBe("It's alive!")
    expect(result[0]?.logLevel).toEqual(LogLevel.Info)
  })

  it("change log level in region", async () => {
    const program = Effect.log("It's alive")
      .apply(LogLevel(LogLevel.Warning))
      .zipRight(TestLogger.logOutput)
      .provideLayer(TestLogger.default)

    const result = await program.unsafeRunPromise()

    expect(result.length).toBe(1)
    expect(result[0]?.message()).toBe("It's alive")
    expect(result[0]?.logLevel).toEqual(LogLevel.Warning)
  })

  it("log at a different log level", async () => {
    const program = Effect.logWarning("It's alive!")
      .zipRight(TestLogger.logOutput)
      .provideLayer(TestLogger.default)

    const result = await program.unsafeRunPromise()

    expect(result.length).toBe(1)
    expect(result[0]?.message()).toBe("It's alive!")
    expect(result[0]?.logLevel).toEqual(LogLevel.Warning)
  })

  it("log at a span", async () => {
    const program = Effect.logSpan("initial segment")(Effect.log("It's alive!"))
      .zipRight(TestLogger.logOutput)
      .provideLayer(TestLogger.default)

    const result = await program.unsafeRunPromise()

    expect(result.length).toBe(1)
    expect(result[0]?.spans.prefix[0]?.label).toBe("initial segment")
  })

  it("default formatter", async () => {
    const program = Effect.logSpan("test span")(Effect.log("It's alive!"))
      .zipRight(TestLogger.logOutput)
      .provideLayer(TestLogger.default)

    const result = await program.unsafeRunPromise()

    console.log(result[0]?.call(Logger.default))
  })

  it("none", async () => {
    const program = Effect.log("It's alive!")
      .apply(Effect.disableLogging)
      .zipRight(TestLogger.logOutput)
      .provideLayer(TestLogger.default)

    const result = await program.unsafeRunPromise()

    expect(result.length).toBe(0)
  })

  it("log annotations", async () => {
    const key = "key"
    const value = "value"
    const program = Effect.logAnnotate(key, value)(Effect.log("It's alive!"))
      .zipRight(TestLogger.logOutput)
      .provideLayer(TestLogger.default)

    const result = await program.unsafeRunPromise()

    expect(result.length).toBe(1)
    expect(result[0]?.annotations.get(key)).toBe(value)
  })
})
