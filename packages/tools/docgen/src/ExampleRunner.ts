import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { TestRunner } from "vitest"
import { collectorId } from "./Examples.ts"

/**
 * Vitest runner for source-backed docgen example modules.
 *
 * @category testing
 * @since 0.6.0
 */
export default class ExampleRunner extends TestRunner {
  override async importFile(filepath: string, source: "collect" | "setup"): Promise<unknown> {
    if (source !== "collect") return super.importFile(filepath, source)
    const contents = await readFile(filepath)
    const version = createHash("sha256").update(contents).digest("hex").slice(0, 16)
    return super.importFile(collectorId(filepath, version), source)
  }
}
