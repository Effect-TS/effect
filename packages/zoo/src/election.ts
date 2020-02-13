import { managed as M, effect as T } from "@matechs/effect";
import { managedClient, ZooError } from "./client";
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
    const proc = pipe(
      c.mkdirp(electionPath),
      T.chain(_ => c.create(electionPath, "EPHEMERAL_SEQUENTIAL")),
      T.chain(({ path }) => c.currentId(path)),
      T.chain(id =>
        T.forever(
          pipe(
            c.getChildren(electionPath),
            T.chain(children => c.currentId(children[0])),
            T.chain(masterId =>
              id.id === masterId.id
                ? T.asUnit<R, E | ZooError, A>(run)
                : T.asUnit(c.waitDelete(masterId.id))
            )
          )
        )
      )
    );

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

      return () => {
        disp();
      };
    });

    return pipe(
      proc,
      T.fork,
      T.chain(f =>
        sequenceT(T.effect)(
          T.fork(
            pipe(
              waitDisconnected,
              T.chain(_ => f.interrupt)
            )
          ),
          T.pure(f)
        )
      ),
      T.chain(_ => sequenceT(T.effect)(_[0].join, _[1].join)),
      T.map(_ => _[1])
    );
  });
