import { Iso } from "../Monocle"

import { unsafeCoerce } from "@matechs/core/Function"

//
// isos
//
export const anyIso = new Iso<any, any>(unsafeCoerce, unsafeCoerce)
