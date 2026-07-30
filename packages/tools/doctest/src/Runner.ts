/**
 * @since 4.0.0
 */

import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { createFilter } from "vite"
import { TestRunner } from "vitest"
import * as Protocol from "./Protocol.ts"

/**
 * Wraps a Vitest runner so marked documentation files use doctest collectors.
 *
 * @category testing
 * @since 4.0.0
 */
export const wrap = (
  Base: typeof TestRunner,
  include: ReadonlyArray<string> = [],
  root?: string | undefined
): typeof TestRunner => {
  const isRegularTest = include.length === 0
    ? () => false
    : createFilter(include, undefined, root === undefined ? undefined : { resolve: root })
  return class DoctestRunner extends Base {
    override importFile(filepath: string, source: "collect" | "setup"): unknown {
      if (source !== "collect" || isRegularTest(filepath)) return super.importFile(filepath, source)
      return readFile(filepath).then((contents) => {
        if (!contents.includes("import.meta.vitest")) return super.importFile(filepath, source)
        const version = createHash("sha256").update(contents).digest("hex").slice(0, 16)
        return super.importFile(Protocol.collectorId(filepath, version), source)
      })
    }
  }
}

/**
 * Vitest runner that routes marked documentation files to doctest collectors.
 *
 * @category testing
 * @since 4.0.0
 */
export default wrap(TestRunner)
