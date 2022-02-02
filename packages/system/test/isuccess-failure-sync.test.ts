import { pipe } from "@effect-ts/system/Function"

import * as Sy from "../src/Sync"

describe("Checking success in Sync", () => {
  it("should be true in case of success", () => {
    const result = pipe(Sy.succeed("ok"), Sy.isSuccess, Sy.run)
    expect(result).toBe(true)
  })
  it("should be false in case of handled failure", () => {
    const result = pipe(Sy.fail("error"), Sy.isSuccess, Sy.run)
    expect(result).toBe(false)
  })
})

describe("Checking failure in Sync", () => {
  it("should be false in case of success", () => {
    const result = pipe(Sy.succeed("ok"), Sy.isFailure, Sy.run)
    expect(result).toBe(false)
  })
  it("should be true in case of handled failure", () => {
    const result = pipe(Sy.fail("error"), Sy.isFailure, Sy.run)
    expect(result).toBe(true)
  })
})
