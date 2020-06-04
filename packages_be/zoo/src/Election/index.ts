import { State } from "node-zookeeper-client"

import { managedClient, ZooError, error, ConnectionDroppedError } from "../Client"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"

// work in progress
/* istanbul ignore file */

export const election = (electionPath: string) => <S, R, E, A>(
  run: T.Effect<S, R, E, A>
) =>
  M.use(managedClient, (c) => {
    // run election
    const proc = pipe(
      c.mkdirp(electionPath),
      T.chain((_) => c.create(`${electionPath}/p_`, "EPHEMERAL_SEQUENTIAL")),
      T.chain(({ path }) => c.currentId(path)),
      T.chain((id) =>
        T.forever(
          // master-slave loop
          pipe(
            c.getChildren(electionPath), // get members
            T.chain((children) => c.currentId(children.paths[0])), // check if I am master
            T.chain(
              (masterId) =>
                id.id === masterId.id
                  ? T.asUnit<unknown, R, E | ZooError, A>(run) // I'm master
                  : T.asUnit(c.waitDelete(`${electionPath}/${masterId.id}`)) // I'm slave waiting for master to drop
            )
          )
        )
      )
    )

    // wait for connection dropped event
    const waitDisconnected = T.async<never, void>((retD) => {
      const disp = c.listen((s) => {
        if (
          // tslint:disable-next-line: prefer-switch
          s.code === State.DISCONNECTED.code ||
          s.code === State.EXPIRED.code
        ) {
          disp()
          retD(E.right(undefined))
        }
      })

      return (cb) => {
        disp()
        cb()
      }
    })

    // fork the process while listening for connection drop,
    // in case of drop interrupt the process
    return pipe(
      proc,
      T.fork,
      T.chain((f) =>
        T.parSequenceT(
          T.fork(
            pipe(
              waitDisconnected,
              T.chain((_) => f.interrupt),
              T.chain((_) =>
                T.raiseError(
                  error<ConnectionDroppedError>({
                    _tag: "ConnectionDroppedError",
                    message: "connection dropped"
                  })
                )
              )
            )
          ),
          T.pure(f)
        )
      ),
      T.chain((_) =>
        T.parSequenceT(
          T.async(() => (cb) => {
            T.run(T.parSequenceT(_[0].interrupt, _[1].interrupt), () => {
              cb()
            })
          }),
          _[0].join,
          _[1].join
        )
      ),
      T.map((_) => _[1])
    )
  })
