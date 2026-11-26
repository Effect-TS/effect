import * as babel from "@babel/core"
import { fileURLToPath } from "node:url"

const packageDir = fileURLToPath(new URL("../..", import.meta.url))

/**
 * Path of the effect sources, which fixtures resolve to in tests.
 */
export const effectSrcDir = fileURLToPath(new URL("../../../../effect/src/", import.meta.url))

/**
 * The published build runs babel with annotate-pure-calls over the compiler
 * output. Bundlers rely on those annotations to drop unused module-scope
 * calls, so tests reproduce the same step for every effect source module.
 * Without it bundlers shake source differently from the published package.
 */
export const annotatePureCalls = async (code: string, filename: string): Promise<string> => {
  const annotated = await babel.transformAsync(code, {
    babelrc: false,
    configFile: false,
    compact: false,
    cwd: packageDir,
    filename,
    plugins: ["annotate-pure-calls"]
  })
  return annotated!.code!
}
