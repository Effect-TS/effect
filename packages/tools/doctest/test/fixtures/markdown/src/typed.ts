throw new Error("R11_SOURCE_BODY_EXECUTED")

/**
 * ```ts import.meta.vitest name=typed-jsdoc
 * import { expect } from "vitest"
 * import { answer } from "../docs/helper.ts"
 * const local: number = answer
 * expect.assertions(2)
 * expect(local).toBe(42)
 * expect(import.meta.url).toContain("/src/typed.ts")
 * ```
 */
