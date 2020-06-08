import * as M from "mobx"
import React from "react"

import { UI } from "../../../src"

import { FlashStateEnv, flashStateURI } from "./state"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"

export const DisplayFlash = UI.withRun()((run, dispose) =>
  UI.withState<FlashStateEnv>()<{
    children: (_: { message: string }) => React.ReactElement
  }>(({ children, [flashStateURI]: { messages } }) => {
    const [message, setMessage] = React.useState<O.Option<string>>(O.none)

    React.useEffect(() => {
      const disposeAutorun = M.autorun(() => {
        const current = messages.length > 0 ? O.some(messages[0]) : O.none

        setMessage(current)

        if (messages.length > 0) {
          run(
            T.delay(
              T.sync(() => {
                messages.shift()
              }),
              3000
            )
          )
        }
      })

      return () => {
        disposeAutorun()
        dispose()
        messages.splice(0, messages.length)
      }
    }, [])

    return pipe(
      message,
      O.fold(
        () => <></>,
        (m) =>
          React.createElement(children, {
            message: m
          })
      )
    )
  })
)
