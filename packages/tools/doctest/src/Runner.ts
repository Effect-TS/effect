import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { TestRunner } from "vitest"
import { collectorId } from "./internal/Protocol.ts"

/**
 * Vitest runner that collects source-backed documentation examples without importing their source files.
 *
 * @category testing
 * @since 4.0.0
 */
export default class DoctestRunner extends TestRunner {
  override importFile(filepath: string, source: "collect" | "setup"): unknown {
    if (source !== "collect") return super.importFile(filepath, source)
    return readFile(filepath).then((contents) => {
      const version = createHash("sha256").update(contents).digest("hex").slice(0, 16)
      return super.importFile(collectorId(filepath, version), source)
    })
  }
}
