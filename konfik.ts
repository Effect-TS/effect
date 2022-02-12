import { eslint } from "./konfik/eslint"
import { gitpod } from "./konfik/gitpod"
import { jest } from "./konfik/jest"
import { prettier } from "./konfik/prettier"
import { tsconfig, tsconfigBase, tsconfigJest } from "./konfik/tsconfig"

export default {
  ".eslintrc.json": eslint("off"),
  ".gitpod.yml": gitpod,
  ".prettierrc.js": prettier,
  "tsconfig.base.json": tsconfigBase,
  "tsconfig.json": tsconfig,
  "tsconfig.jest.json": tsconfigJest,
  "jest.config.json": jest
}

export { prettyPrint } from "./konfik/prettyPrint.js"
