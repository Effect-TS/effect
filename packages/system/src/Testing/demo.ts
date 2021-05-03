import { pipe } from "../Function"
import type { ZSpec } from "./Spec"
import * as TestAspect from "./TestAspect"

export const x = pipe({} as ZSpec<{ foo: string }, "err">, TestAspect.identity)
