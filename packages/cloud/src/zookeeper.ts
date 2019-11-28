import { effect as T, exit as E } from "@matechs/effect";
import * as L from "@matechs/effect/lib/list";
import { Do } from "fp-ts-contrib/lib/Do";
import * as Ei from "fp-ts/lib/Either";
import { Either, left, toError } from "fp-ts/lib/Either";
import { Lazy } from "fp-ts/lib/function";
import * as ZK from "node-zookeeper-client";
import { LeaderTask } from ".";

export interface ZookeeperConfig {
  zookeeper: {
    config: {
      url: string;
      electionPath: string;
    };
  };
}

export interface Zookeeper {
  zookeeper: {
    runTasks<E>(
      tasks: L.List<LeaderTask<E>>,
      interruptors: L.List<Lazy<void>>,
      interruptor: Lazy<void>,
      cb: (r: Either<E | Error, never>) => void
    ): T.Effect<ZookeeperConfig, never, void>;
  };
}

function client(): T.Effect<ZookeeperConfig, never, ZK.Client> {
  return T.accessM(({ zookeeper }: ZookeeperConfig) =>
    T.sync(() => ZK.createClient(zookeeper.config.url))
  );
}

function connect(c: ZK.Client): T.Effect<T.NoEnv, Error, void> {
  return T.async(cb => {
    c.connect();

    c.on("state", s => {
      switch (s) {
        case ZK.State.SYNC_CONNECTED:
          c.removeAllListeners();
          cb(Ei.right(undefined));
          break;
        default:
          c.removeAllListeners();
          cb(Ei.left(new Error(`state: ${s.name}`)));
          break;
      }
    });

    return () => {};
  });
}

function isZkException(a: Error | ZK.Exception): a is ZK.Exception {
  return 'name' in a;
}

function createElectionPath(
  client: ZK.Client,
  path: string
): T.Effect<T.NoEnv, Error, void> {
  return T.async(cb => {
    client.mkdirp(path, e => {
      if (e) {
        if (isZkException(e)) {
          cb(Ei.left(new Error(`zk exception: ${e.toString()}`)));
        } else {
          cb(Ei.left(e));
        }
      } else {
        cb(Ei.right(undefined));
      }
    });
    return () => {};
  });
}

function createEphemeralSequential(
  client: ZK.Client,
  path: string
): T.Effect<T.NoEnv, Error, string> {
  return T.async(cb => {
    client.create(`${path}/p_`, ZK.CreateMode.EPHEMERAL_SEQUENTIAL, (e, p) => {
      if (e) {
        if (isZkException(e)) {
          cb(Ei.left(new Error(`zk exception: ${e.toString()}`)));
        } else {
          cb(Ei.left(e));
        }
      } else {
        const spl = p.split("/");
        cb(Ei.right(spl[spl.length - 1]));
      }
    });
    return () => {};
  });
}

function listCandidates(
  client: ZK.Client,
  path: string
): T.Effect<T.NoEnv, Error, string[]> {
  return T.async(cb => {
    client.getChildren(path, (e, c) => {
      if (e) {
        if (isZkException(e)) {
          cb(Ei.left(new Error(`zk exception: ${e.toString()}`)));
        } else {
          cb(Ei.left(e));
        }
      } else {
        cb(Ei.right(c));
      }
    });

    return () => {};
  });
}

function watchChanges<E>(
  client: ZK.Client,
  path: string,
  basePath: string,
  id: string,
  task: T.Effect<unknown, E, never>,
  interruptors: L.List<Lazy<void>>
): T.Effect<T.NoEnv, Error, never> {
  return T.async(cb => {
    client.exists(
      path,
      event => {
        switch (event.type) {
          case ZK.Event.NODE_DELETED:
            L.push(
              interruptors,
              T.run(listCandidates(client, basePath), e => {
                if (E.isDone(e)) {
                  const candidates = e.value.sort();

                  if (id === candidates[0]) {
                    // I am the master now
                    L.push(
                      interruptors,
                      T.run(task, e => {
                        cb(Ei.left(Ei.toError(e)));
                      })
                    );
                  } else {
                    L.push(
                      interruptors,
                      T.run(
                        watchChanges(
                          client,
                          `${basePath}/${candidates[0]}`,
                          basePath,
                          id,
                          task,
                          interruptors
                        ),
                        ex => {
                          cb(Ei.left(Ei.toError(ex)));
                        }
                      )
                    );
                  }
                } else {
                  cb(Ei.left(Ei.toError(e)));
                }
              })
            );
            break;
        }
      },
      e => {
        if (e) {
          if (isZkException(e)) {
            cb(Ei.left(new Error(`zk exception: ${e.toString()}`)));
          } else {
            cb(Ei.left(e));
          }
        }
      }
    );

    return () => {};
  });
}

function runTasks<E>(
  tasks: L.List<LeaderTask<E>>,
  interruptors: L.List<Lazy<void>>,
  interrupt: Lazy<void>,
  cb: (r: Either<E | Error, never>) => void,
  config: ZookeeperConfig,
  client: ZK.Client
) {
  let task = L.popUnsafe(tasks);

  while (task != null) {
    const path = `${config.zookeeper.config.electionPath}/${task.processId}`;
    const t = task.task;

    const op = Do(T.effect)
      .do(createElectionPath(client, path))
      .bind("id", createEphemeralSequential(client, path))
      .bindL("candidates", () =>
        T.effect.map(listCandidates(client, path), a => a.sort())
      )
      .doL(({ id, candidates }) =>
        T.condWith(id === candidates[0])(t)(
          watchChanges(
            client,
            `${path}/${candidates[0]}`,
            path,
            id,
            t,
            interruptors
          )
        )
      )
      .return(() => {});

    L.push(
      interruptors,
      T.run(op, e => {
        // a process shall never return, if it does we have an error
        // and we need to exit fibers
        interrupt();

        E.exit.fold(
          e,
          () => {
            cb(left(new Error("process returned unexpectedly")));
          },
          e => {
            cb(left(e));
          },
          e => {
            cb(left(toError(e)));
          },
          () => {
            // this is normal if current process is interrupted
          }
        );
      })
    );

    task = L.popUnsafe(tasks);
  }
}

export const zookeeper: Zookeeper = {
  zookeeper: {
    runTasks(tasks, interruptors, interruptor, cb) {
      return T.chainError((e: Error) =>
        T.sync(() => {
          cb(Ei.left(e));
          interruptor();
        })
      )(
        Do(T.effect)
          .bind("client", client())
          .doL(({ client }) =>
            T.sync(() => {
              L.push(interruptors, () => {
                client.close();
              });
            })
          )
          .doL(({ client }) => connect(client))
          .bindL("config", () =>
            T.access(({ zookeeper }: ZookeeperConfig) => zookeeper)
          )
          .doL(({ client, config }) =>
            T.sync(() => {
              runTasks(
                tasks,
                interruptors,
                interruptor,
                cb,
                { zookeeper: config },
                client
              );
            })
          )
          .return(() => {})
      );
    }
  }
};
