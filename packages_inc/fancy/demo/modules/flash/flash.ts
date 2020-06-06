import * as R from "../../../src"

import { FlashStateEnv, flashStateURI } from "./state"

import { mutable } from "@matechs/core/Utils"

export const flashMessage = (message: string) =>
  R.accessS<FlashStateEnv>()(({ [flashStateURI]: { messages } }) => {
    mutable(messages).push(message)
  })
