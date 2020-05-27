import { Server } from "http"

import express from "express"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as M from "@matechs/core/Managed"

/* istanbul ignore file */

export const expressM = (port: number) =>
  M.bracket(
    T.async<Error, { app: express.Express; server: Server }>((r) => {
      const app = express()

      const server = app.listen(port, (err) => {
        if (err) {
          r(E.left(err))
        } else {
          r(
            E.right({
              app,
              server
            })
          )
        }
      })

      return (cb) => {
        server.close((err) => {
          err ? cb(err) : cb()
        })
      }
    }),
    ({ server }) =>
      T.async((r) => {
        server.close((err) => {
          if (err) {
            r(E.left(err))
          } else {
            r(E.right(undefined))
          }
        })

        return (cb) => {
          cb()
        }
      })
  )
