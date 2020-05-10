import { Do as DoG } from "fp-ts-contrib/lib/Do"

import { parFastEffect } from "./parFastEffect"

export const parFastDo = () => DoG(parFastEffect)
