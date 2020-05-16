import { Do as DoG } from "../Do"

import { optionMonad } from "./monad"

export const Do = () => DoG(optionMonad)
