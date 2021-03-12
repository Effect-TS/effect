import type ts from "typescript"

import dataFirst from "./dataFirst"
import identity from "./identity"
import tracer from "./tracer"
import unpipe from "./unpipe"

export default function bundle(
  _program: ts.Program,
  _opts?: {
    tracing?: boolean
    moduleMap?: Record<string, string>
  }
) {
  const B0 = {
    dataFirst: dataFirst(_program),
    identity: identity(_program),
    tracer: tracer(_program, _opts),
    unpipe: unpipe(_program)
  }

  return {
    before(ctx: ts.TransformationContext) {
      const B1 = {
        dataFirst: B0.dataFirst.before(ctx),
        identity: B0.identity.before(ctx),
        tracer: B0.tracer.before(ctx),
        unpipe: B0.unpipe.before(ctx)
      }

      return (sourceFile: ts.SourceFile) => {
        const unpiped = B1.unpipe(sourceFile)
        const traced = B1.tracer(unpiped)
        const unid = B1.identity(traced)
        const df = B1.dataFirst(unid)

        return df
      }
    }
  }
}
