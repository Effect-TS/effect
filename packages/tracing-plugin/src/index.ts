import type ts from "typescript"

import dataFirst from "./dataFirst"
import identity from "./identity"
import tracer from "./tracer"
import unpipe from "./unpipe"
import untrace from "./untrace"

export default function bundle(
  _program: ts.Program,
  _opts?: {
    tracing?: boolean
    untrace?: boolean
    pipe?: boolean
    identity?: boolean
    dataFirst?: boolean
    moduleMap?: Record<string, string>
    functionModule?: string
  }
) {
  const B0 = {
    dataFirst: dataFirst(_program, _opts),
    identity: identity(_program, _opts),
    tracer: tracer(_program, _opts),
    unpipe: unpipe(_program, _opts),
    untrace: untrace(_program, _opts)
  }

  return {
    before(ctx: ts.TransformationContext) {
      const B1 = {
        dataFirst: B0.dataFirst.before(ctx),
        identity: B0.identity.before(ctx),
        tracer: B0.tracer.before(ctx),
        unpipe: B0.unpipe.before(ctx),
        untrace: B0.untrace.before(ctx)
      }

      return (sourceFile: ts.SourceFile) => {
        const traced = B1.tracer(sourceFile)
        const untraced = B1.untrace(traced)
        const unpiped = B1.unpipe(untraced)
        const unid = B1.identity(unpiped)
        const df = B1.dataFirst(unid)

        return df
      }
    }
  }
}
