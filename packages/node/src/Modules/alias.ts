/* eslint-disable @typescript-eslint/no-var-requires */
const BuiltinModule = require("module")

// Guard against poorly mocked module constructors
const Module: any = module.constructor.length > 1 ? module.constructor : BuiltinModule

const oldResolveFilename = Module._resolveFilename

export function alias(paths: Record<string, string>) {
  Module._resolveFilename = function (
    request: any,
    parentModule: any,
    isMain: any,
    options: any
  ) {
    let req: string = request
    for (const k of Object.keys(paths)) {
      if (req.includes(k) && !req.includes(paths[k])) {
        req = req.replace(k, paths[k])
      }
    }
    return oldResolveFilename.call(this, req, parentModule, isMain, options)
  }
}
