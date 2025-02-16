// You can run this test suite with the following command:
// npx vitest scripts/codemods/ts-fence.test.ts --config scripts/codemods/vitest.config.ts
import type * as cs from "jscodeshift"
import * as TestUtils from "jscodeshift/src/testUtils"
import transformer from "./ts-fence.js"

const expectTransformation_ = (transformer: cs.Transform) =>
(
  description: string,
  input: string,
  output: string
) => {
  TestUtils.defineInlineTest(
    { default: transformer, parser: "ts" },
    {},
    input,
    output,
    description
  )
}

const expectTransformation = expectTransformation_(transformer)

expectTransformation(
  "should ignore line comments",
  `// description
const v = 1`,
  `// description
const v = 1`
)

expectTransformation(
  "should ignore block comments that don't contain an @example tag",
  `
/**
 * description
 */
const v = 1`,
  `
/**
 * description
 */
const v = 1`
)

expectTransformation(
  "should wrap the given code in a ts fence (without following tags)",
  `
/**
 * a
 *
 * b
 *
 * @example
 * const x = 1
 *
 */
const v = 1`,
  `
/**
 * a
 *
 * b
 *
 * @example
 * \`\`\`ts
 * const x = 1
 *
 * \`\`\`
 */
const v = 1`
)

expectTransformation(
  "should wrap the given code in a ts fence (with following tags)",
  `
/**
 * a
 *
 * b
 *
 * @example
 * const x = 1
 *
 * @since 1.0.0
 * @category collecting & elements
 */
const v = 1`,
  `
/**
 * a
 *
 * b
 *
 * @example
 * \`\`\`ts
 * const x = 1
 * \`\`\`
 *
 * @since 1.0.0
 * @category collecting & elements
 */
const v = 1`
)

expectTransformation(
  "should skip wrapping if the code is already in a ts fence",
  `
/**
 * a
 *
 * b
 *
 * @example
 * \`\`\`ts
 * const x = 1
 * \`\`\`
 */
const v = 1`,
  `
/**
 * a
 *
 * b
 *
 * @example
 * \`\`\`ts
 * const x = 1
 * \`\`\`
 */
const v = 1`
)
