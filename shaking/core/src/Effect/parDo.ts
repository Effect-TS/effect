import { Do as DoG } from "fp-ts-contrib/lib/Do"

import { parEffect } from "./parEffect"

export const parDo = () => DoG(parEffect)
