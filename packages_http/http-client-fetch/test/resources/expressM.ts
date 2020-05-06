import { Server } from "http"

import { T, M, E } from "@matechs/prelude"
import express from "express"

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
          cb(err)
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
