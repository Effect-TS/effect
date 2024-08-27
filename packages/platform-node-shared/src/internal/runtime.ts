import { makeRunMain } from "@effect/platform/Runtime"

/** @internal */
export const runMain = makeRunMain(({
  fiber,
  teardown
}) => {
  const keepAlive = setInterval(() => {}, 2 ** 31 - 1)

  fiber.addObserver((exit) => {
    clearInterval(keepAlive)
    teardown(exit, (code) => {
      process.exit(code)
    })
  })

  function onSigint() {
    process.removeListener("SIGINT", onSigint)
    process.removeListener("SIGTERM", onSigint)
    fiber.unsafeInterruptAsFork(fiber.id())
  }

  process.once("SIGINT", onSigint)
  process.once("SIGTERM", onSigint)
})
