/// <reference types="bun-types" />
import { it, test } from "vitest"

const isBun = typeof process !== "undefined" && !!process.isBun

it.runIf(isBun)("HttpServer", () => {
  test("upload", () => {
  })
})
