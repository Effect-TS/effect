/**
 * @since 1.0.0
 */
import { makeRunMain, type RunMain } from "@effect/platform/Runtime"
import { constVoid } from "effect/Function"
import { globalValue } from "effect/GlobalValue"

// keep track of previous main fiber to clear it across hot reloads.
const hmrState = globalValue(
  Symbol.for("@effect/platform-bun/BunRuntime/hmrState"),
  () => ({
    fiber: undefined as any,
    keepAlive: undefined as ReturnType<typeof setInterval> | undefined,
    onSigint: undefined as (() => void) | undefined
  })
)

/**
 * @since 1.0.0
 * @category runtime
 */
export const runMain: RunMain = makeRunMain(({
  fiber,
  teardown
}) => {
  // Interrupt previous fiber from prior previous run
  if (hmrState.fiber) {
    if (hmrState.onSigint) {
      process.removeListener("SIGINT", hmrState.onSigint)
      process.removeListener("SIGTERM", hmrState.onSigint)
    }
    if (hmrState.keepAlive) {
      clearInterval(hmrState.keepAlive)
    }
    hmrState.fiber.unsafeInterruptAsFork(hmrState.fiber.id())
  }

  hmrState.fiber = fiber
  const keepAlive = setInterval(constVoid, 2 ** 31 - 1)
  hmrState.keepAlive = keepAlive
  let receivedSignal = false

  fiber.addObserver((exit) => {
    if (!receivedSignal) {
      process.removeListener("SIGINT", onSigint)
      process.removeListener("SIGTERM", onSigint)
    }
    clearInterval(keepAlive)
    hmrState.fiber = undefined
    hmrState.keepAlive = undefined
    hmrState.onSigint = undefined
    teardown(exit, (code) => {
      if (receivedSignal || code !== 0) {
        process.exit(code)
      }
    })
  })

  function onSigint() {
    receivedSignal = true
    process.removeListener("SIGINT", onSigint)
    process.removeListener("SIGTERM", onSigint)
    fiber.unsafeInterruptAsFork(fiber.id())
  }

  hmrState.onSigint = onSigint
  process.on("SIGINT", onSigint)
  process.on("SIGTERM", onSigint)
})
