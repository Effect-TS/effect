import { pipe } from "@effect-ts/system/Function"

import * as Sy from "../src/Sync"

describe("Checking failure or success in Sync", () => {
  it("should be true in case of success", async () => {
    const result = pipe(Sy.succeed("ok"), Sy.isSuccess, Sy.run)
    expect(result).toBe(true)
  })
  it("should be false in case of handled failure", async () => {
    const result = pipe(Sy.fail("error"), Sy.isSuccess, Sy.run)
    expect(result).toBe(false)
  })
})
