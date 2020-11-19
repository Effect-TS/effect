import * as fs from "fs"
import * as path from "path"
import * as ts from "ttypescript"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const options = require("./tsconfig.jest.json")

const res = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "packages/system/src/trace.ts")).toString(),
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  {
    ...options,
    fileName: path.join(__dirname, "packages/system/src/trace.ts")
  }
)
console.log(res.outputText)
