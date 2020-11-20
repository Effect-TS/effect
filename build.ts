import * as fs from "fs"
import * as path from "path"
import * as ts from "ttypescript"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const options = require("./tsconfig.base.json")

const res = ts.transpileModule(
  fs
    .readFileSync(path.join(__dirname, "packages/system/test/tracing.test.ts"))
    .toString(),
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  {
    ...options,
    fileName: path.join(__dirname, "packages/system/test/tracing.test.ts")
  }
)
fs.writeFileSync(
  path.join(__dirname, "packages/system/test/tracing-built.test.ts"),
  res.outputText
)
