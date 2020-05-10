import { Option } from "fp-ts/lib/Option"
import { FunctionN } from "fp-ts/lib/function"

import { SyncE } from "../Support/Common/effect"

import { encaseOption } from "./encaseOption"
import { suspended } from "./suspended"

export function liftOption<E>(
  onNone: () => E
): <A, B>(f: FunctionN<[A], Option<B>>) => FunctionN<[A], SyncE<E, B>> {
  return (f) => (a) => suspended(() => encaseOption(f(a), onNone))
}
