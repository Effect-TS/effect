import * as R from "../../../src"

import { FlashStateEnv, flashStateURI } from "./state"

export const flashMessage = (message: string) =>
  R.accessS<FlashStateEnv>()(({ [flashStateURI]: { messages } }) => {
    messages.push(message)
  })
