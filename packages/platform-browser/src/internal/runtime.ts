import { makeRunMain } from "@effect/platform/Runtime"

/** @internal */
export const runMain = makeRunMain(({ fiber }) => {
  addEventListener("beforeunload", () => {
    fiber.unsafeInterruptAsFork(fiber.id())
  })
})
