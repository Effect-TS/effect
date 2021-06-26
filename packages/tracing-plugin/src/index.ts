import type ts from "typescript"

import dataFirst from "./dataFirst"
import identity from "./identity"
import rewrite from "./rewrite"
import tracer from "./tracer"
import unpipe from "./unpipe"

export default function bundle(
  _program: ts.Program,
  _opts?: {
    tracing?: boolean
    moduleMap?: Record<string, string>
    __importTracingFrom?: string
  }
) {
  const B0 = {
    rewrite: rewrite(_program, _opts),
    dataFirst: dataFirst(_program),
    identity: identity(_program),
    tracer: tracer(_program, _opts),
    unpipe: unpipe(_program)
  }

  return {
    before(ctx: ts.TransformationContext) {
      const B1 = {
        rewrite: B0.rewrite.before(ctx),
        dataFirst: B0.dataFirst.before(ctx),
        identity: B0.identity.before(ctx),
        tracer: B0.tracer.before(ctx),
        unpipe: B0.unpipe.before(ctx)
      }

      return (sourceFile: ts.SourceFile) => {
        const rewrite = B1.rewrite(sourceFile)
        const unpiped = B1.unpipe(rewrite)
        const traced = B1.tracer(unpiped)
        const unid = B1.identity(traced)
        const df = B1.dataFirst(unid)

        return df
      }
    }
  }
}
