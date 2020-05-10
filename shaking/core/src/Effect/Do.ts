import { Do as DoG } from "fp-ts-contrib/lib/Do"

import { effect } from "./effect"

export const Do = () => DoG(effect)
