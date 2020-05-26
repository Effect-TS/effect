import * as T from "@matechs/core/Effect"
import * as F from "@matechs/core/Service"

/**
 * Definition of a random message module
 */

export const RandomMessageURI = "@uris-free/RandomMessage"

const RandomMessage_ = F.define({
  [RandomMessageURI]: {
    hitMe: F.fn<() => T.Sync<string>>()
  }
})

export interface RandomMessage extends F.TypeOf<typeof RandomMessage_> {}

export const RandomMessage = F.opaque<RandomMessage>()(RandomMessage_)

/**
 * Access helpers
 */
export const { hitMe } = F.access(RandomMessage)[RandomMessageURI]

/**
 * Implementation
 */

export const provideRandomMessage = F.implement(RandomMessage)({
  [RandomMessageURI]: {
    // tslint:disable-next-line: no-bitwise
    hitMe: () => T.sync(() => messages[~~(Math.random() * messages.length)])
  }
})

const messages = ["Hi", "Bye", "Good day", "Good evening"]
