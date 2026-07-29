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
    return super.importFile(source === "collect" ? collectorId(filepath) : filepath, source)
  }
}
