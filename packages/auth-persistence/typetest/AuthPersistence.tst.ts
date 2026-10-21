import { expect, it } from "tstyche"
import { storage } from "../test/packaging/raw.ts"

it("allocates password storage without proof request storage for a password-only definition", () => {
  expect(storage.schema).type.toHaveProperty("passwords")
  expect(storage.schema).type.not.toHaveProperty("proofRequests")
})
