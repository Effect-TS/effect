import { appendFileSync } from "node:fs"
import { afterEach, expect } from "vitest"

afterEach((context) => {
  if (process.env.DOCTEST_LEDGER !== undefined) {
    appendFileSync(
      process.env.DOCTEST_LEDGER,
      JSON.stringify({
        id: context.task.id,
        name: context.task.name,
        file: context.task.file.filepath,
        assertions: expect.getState().assertionCalls
      }) + "\n"
    )
  }
})
