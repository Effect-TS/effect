import { managed as M, effect as T } from "@matechs/effect";
import {
  managedClient,
  ZooError,
  error,
  ConnectionDroppedError
} from "./client";
import { pipe } from "fp-ts/lib/pipeable";
import { State } from "node-zookeeper-client";
import { right } from "fp-ts/lib/Either";
import { sequenceT } from "fp-ts/lib/Apply";

// work in progress
/* istanbul ignore file */

export const election = (electionPath: string) => <R, E, A>(
  run: T.Effect<R, E, A>
) =>
  M.use(managedClient, c => {
    // run election
    const proc = pipe(
      c.mkdirp(electionPath),
      T.chain(_ => c.create(`${electionPath}/p_`, "EPHEMERAL_SEQUENTIAL")),
      T.chain(({ path }) => c.currentId(path)),
      T.chain(id =>
        T.forever(
          // master-slave loop
          pipe(
            c.getChildren(electionPath), // get members
            T.chain(children => c.currentId(children.paths[0])), // check if I am master
            T.chain(
              masterId =>
                id.id === masterId.id
                  ? T.asUnit<R, E | ZooError, A>(run) // I'm master
                  : T.asUnit(c.waitDelete(`${electionPath}/${masterId.id}`)) // I'm slave waiting for master to drop
            )
          )
        )
      )
    );

    // wait for connection dropped event
    const waitDisconnected = T.async<never, void>(retD => {
      const disp = c.listen(s => {
        if (
          // tslint:disable-next-line: prefer-switch
          s.code === State.DISCONNECTED.code ||
          s.code === State.EXPIRED.code
        ) {
          disp();
          retD(right(undefined));
        }
      });

      return cb => {
        disp();
        cb(T.interruptSuccess());
      };
    });

    // fork the process while listening for connection drop,
    // in case of drop interrupt the process
    return pipe(
      proc,
      T.fork,
      T.chain(f =>
        sequenceT(T.parEffect)(
          T.fork(
            pipe(
              waitDisconnected,
              T.chain(_ => f.interrupt),
              T.chain(_ =>
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
      T.chain(_ => sequenceT(T.parEffect)(_[0].join, _[1].join)),
      T.map(_ => _[1])
    );
  });
