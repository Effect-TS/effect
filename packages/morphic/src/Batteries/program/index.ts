import type { IntersectionURI } from "../../Algebra/intersection"
import type { NewtypeURI } from "../../Algebra/newtype"
import type { ObjectURI } from "../../Algebra/object"
import type { PrimitivesURI } from "../../Algebra/primitives"
import type { RecordURI } from "../../Algebra/record"
import type { RecursiveURI } from "../../Algebra/recursive"
import type { RefinedURI } from "../../Algebra/refined"
import type { SetURI } from "../../Algebra/set"
import type { TaggedUnionURI } from "../../Algebra/tagged-union"
import type { UnknownURI } from "../../Algebra/unknown"
import type { GetAlgebra } from "../../Algebra/utils/core"
import type { InferredAlgebra, InferredProgram } from "../usage/program-infer"
import type { AnyConfigEnv } from "../usage/summoner"

export const ProgramURI = "ProgramURI" as const

export type ProgramURI = typeof ProgramURI

export interface AlgebraNoUnion<F, Env> extends InferredAlgebra<F, ProgramURI, Env> {}

export interface P<R extends AnyConfigEnv, E, A>
  extends InferredProgram<R, E, A, ProgramURI> {}

declare module "../usage/program-type" {
  interface ProgramAlgebraURI {
    [ProgramURI]: GetAlgebra<
      | PrimitivesURI
      | IntersectionURI
      | ObjectURI
      | RecursiveURI
      | SetURI
      | RecordURI
      | TaggedUnionURI
      | UnknownURI
      | NewtypeURI
      | RefinedURI
    >
  }

  interface ProgramAlgebra<F, Env> {
    [ProgramURI]: AlgebraNoUnion<F, Env>
  }

  interface ProgramType<R extends AnyConfigEnv, E, A> {
    [ProgramURI]: P<R, E, A>
  }
}
