import * as BunFileSystem from "@effect/platform-bun/BunFileSystem"
import { describe } from "@effect/vitest"
import { testPositionedWrites } from "../../../effect/test/FileSystem.test-utils.ts"

describe("BunFileSystem positioned writes", { concurrent: false }, () => {
  testPositionedWrites(BunFileSystem.layer)
})
