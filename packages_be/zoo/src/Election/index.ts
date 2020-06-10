import { State } from "node-zookeeper-client"

import {
  accessClient,
  Client,
  ConnectionDroppedError,
  CreateError,
  error,
  GetChildrenError,
  MkdirpError,
  WaitDeleteError
} from "../Client"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import { pipe } from "@matechs/core/Function"
import { fromProvider } from "@matechs/core/Layer"
import * as O from "@matechs/core/Option"

// work in progress
/* istanbul ignore file */

export const loop = <S, R, E, A>(
  _: T.Effect<S, R, E, O.Option<A>>
): T.Effect<S, R, E, A> =>
  T.chain_(_, (o) => (O.isSome(o) ? T.pure(o.value) : T.suspended(() => loop(_))))

export const Election = (electionPath: string) =>
  fromProvider<
    unknown,
    Client,
    | MkdirpError
    | CreateError
    | GetChildrenError
    | WaitDeleteError
    | ConnectionDroppedError,
    unknown
  >((run) =>
    T.chain_(accessClient, (c) => {
      // run election
      const proc = pipe(
        c.mkdirp(electionPath),
        T.chain((_) => c.create(`${electionPath}/p_`, "EPHEMERAL_SEQUENTIAL")),
        T.chain(({ path }) => c.currentId(path)),
        T.chain((id) =>
          loop(
            // master-slave loop
            pipe(
              // get members
              c.getChildren(electionPath),
              // get master id
              T.chain((children) => c.currentId(children.paths[0])),
              T.chain((masterId) =>
                // check if I am master or slave
                T.condWith(id.id === masterId.id)(
                  // I'm the master
                  T.map_(run, O.some)
                )(
                  // I'm a slave waiting for master to drop
                  T.map_(c.waitDelete(`${electionPath}/${masterId.id}`), () => O.none)
                )
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
        T.parFastZip(
          T.chain_(waitDisconnected, () =>
            T.raiseError(
              error<ConnectionDroppedError>({
                _tag: "ConnectionDroppedError",
                message: "connection dropped"
              })
            )
          )
        ),
        T.map(([result, _]) => result)
      )
    })
  )
