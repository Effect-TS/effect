import type { IntersectionURI } from "../../Algebra/Intersection"
import type { NewtypeURI } from "../../Algebra/Newtype"
import type { ObjectURI } from "../../Algebra/Object"
import type { PrimitivesURI } from "../../Algebra/Primitives"
import type { RecordURI } from "../../Algebra/Record"
import type { RecursiveURI } from "../../Algebra/Recursive"
import type { RefinedURI } from "../../Algebra/Refined"
import type { SetURI } from "../../Algebra/Set"
import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import type { UnionURI } from "../../Algebra/Union"
import type { UnknownURI } from "../../Algebra/Unknown"
import type { GetAlgebra, InterpreterURIS } from "../../HKT"
import type { InferredAlgebra, InferredProgram } from "../usage/program-infer"
import type { AnyConfigEnv } from "../usage/summoner"

export const ProgramURI = "ProgramURI" as const

export type ProgramURI = typeof ProgramURI

export interface CoreAlgebra<F extends InterpreterURIS, Env>
  extends InferredAlgebra<F, ProgramURI, Env> {}

export interface P<R extends AnyConfigEnv, E, A>
  extends InferredProgram<R, E, A, ProgramURI> {}

declare module "../usage/program-type" {
  interface ProgramAlgebraURI {
    [ProgramURI]: GetAlgebra<
      | PrimitivesURI
      | TaggedUnionURI
      | IntersectionURI
      | ObjectURI
      | NewtypeURI
      | RecordURI
      | RecursiveURI
      | RefinedURI
      | UnknownURI
      | SetURI
      | UnionURI
    >
  }

  interface ProgramAlgebra<F extends InterpreterURIS, Env> {
    [ProgramURI]: CoreAlgebra<F, Env>
  }

  interface ProgramType<R extends AnyConfigEnv, E, A> {
    [ProgramURI]: P<R, E, A>
  }
}
