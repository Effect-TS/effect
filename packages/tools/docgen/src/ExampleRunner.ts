import { readFile } from "node:fs/promises"
import { sep } from "node:path"
import { test, TestRunner } from "vitest"
import { decode, marker } from "./ExampleMetadata.ts"

const isGeneratedExamplePath = (filepath: string): boolean => filepath.split(sep).includes("examples")

/**
 * Vitest runner for generated docgen example modules.
 *
 * @category testing
 * @since 0.6.0
 */
export default class ExampleRunner extends TestRunner {
  override async importFile(filepath: string, source: "collect" | "setup"): Promise<unknown> {
    if (source !== "collect") {
      return super.importFile(filepath, source)
    }

    const contents = await readFile(filepath, "utf8")
    if (!contents.startsWith(marker) && !isGeneratedExamplePath(filepath)) {
      return super.importFile(filepath, source)
    }

    const metadata = decode(contents)
    test(metadata.name, { meta: { docgenExample: metadata } as never }, () => super.importFile(filepath, source))
  }
}
