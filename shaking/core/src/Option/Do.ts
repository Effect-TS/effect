import { Do as DoG } from "fp-ts-contrib/lib/Do"

import { optionMonad } from "./monad"

export const Do = () => DoG(optionMonad)
