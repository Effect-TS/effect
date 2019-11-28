import { effect as T, exit as E } from "@matechs/effect";
import * as L from "@matechs/effect/lib/list";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";
import { Lazy, Predicate } from "fp-ts/lib/function";
import { left, toError, Either } from "fp-ts/lib/Either";
import * as Z from "./zookeeper";

export enum ClusterTag {
  LeaderTask,
  MemberTask,
  Merge,
  New
}

export interface New {
  readonly _tag: ClusterTag.New;
}

export type LeaderTask<E> = {
  readonly _tag: ClusterTag.LeaderTask;
  readonly processId: string;
  readonly task: T.Effect<T.NoEnv, E, never>;
  readonly where: boolean;
};

export type MemberTask<E> = {
  readonly _tag: ClusterTag.MemberTask;
  readonly task: T.Effect<T.NoEnv, E, never>;
  readonly where: boolean;
};

export interface Merge<E> {
  readonly _tag: ClusterTag.Merge;
  readonly left: Cluster<T.NoEnv, E>;
  readonly right: Cluster<T.NoEnv, E>;
}

export type ClusterOp<E> = LeaderTask<E> | MemberTask<E> | Merge<E> | New;

export type Cluster<R, E> = (_: R) => ClusterOp<E>;

export function leaderTask<R, E, R2>(
  task: T.Effect<R, E, never>,
  processId: string,
  where: Predicate<R2>
): Cluster<R & R2, E> {
  return (r: R & R2) => ({
    _tag: ClusterTag.LeaderTask,
    task: T.provideAll(r)(task),
    processId,
    where: where(r)
  });
}

export function memberTask<R, E, R2>(
  task: T.Effect<R, E, never>,
  where: Predicate<R2>
): Cluster<R & R2, E> {
  return (r: R & R2) => ({
    _tag: ClusterTag.MemberTask,
    task: T.provideAll(r)(task),
    where: where(r)
  });
}

export function merge<R, E, R2, E2>(
  left: Cluster<R, E>,
  right: Cluster<R2, E2>
): Cluster<R & R2, E | E2> {
  return (r: R & R2) => ({
    _tag: ClusterTag.Merge,
    left: provideAll(r)(left as Cluster<R & R2, E | E2>),
    right: provideAll(r)(right as Cluster<R & R2, E | E2>)
  });
}

export function onLeader<R1 = T.NoEnv>(config: {
  processId: string;
  where?: Predicate<R1>;
}): <R, E>(
  task: T.Effect<R, E, never>
) => <R2, E2>(
  cluster: Cluster<R2, E2>
) => Cluster<R & R1 & R2 & Z.Zookeeper & Z.ZookeeperConfig, E | E2> {
  return task => c =>
    merge(
      c,
      leaderTask(
        task,
        config.processId,
        config.where ? config.where : () => true
      )
    );
}

export function onAnyMember<R, E>(
  task: T.Effect<R, E, never>
): <R2, E2>(cluster: Cluster<R2, E2>) => Cluster<R & R2, E | E2> {
  return c =>
    merge(
      c,
      memberTask(task, () => true)
    );
}

export function onMember<R>(
  predicate: Predicate<R>
): <R2, E>(
  task: T.Effect<R2, E, never>
) => <R3, E2>(cluster: Cluster<R3, E2>) => Cluster<R & R2 & R3, E | E2> {
  return task => c => r => merge(c, memberTask(task, predicate))(r);
}

export function of<R = T.NoEnv, E = never>(): Cluster<R, E> {
  return () => ({ _tag: ClusterTag.New });
}

export function provideAll<R>(
  r: R
): <E>(ma: Cluster<R, E>) => Cluster<T.NoEnv, E> {
  return ma => () => ma(r);
}

function runTasks<E>(
  tasks: L.List<MemberTask<E>>,
  interruptors: L.List<Lazy<void>>,
  interrupt: Lazy<void>,
  cb: (r: Either<E | Error, never>) => void
) {
  let task = L.popUnsafe(tasks);

  while (task != null) {
    L.push(
      interruptors,
      T.run(task.task, e => {
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

function hasZookeeper(r: any): r is Z.Zookeeper & Z.ZookeeperConfig {
  return "zookeeper" in r;
}

export function run<R, E>(
  cluster: Cluster<R, E>
): T.Effect<R, E | Error, never> {
  return T.accessM((r: R) =>
    T.async(cb => {
      const tasks = L.empty<MemberTask<E>>();
      const leaderTasks = L.empty<LeaderTask<E>>();
      const queue = L.empty<Cluster<T.NoEnv, E>>();

      let current: ClusterOp<E> | undefined = cluster(r);

      while (current) {
        switch (current._tag) {
          case ClusterTag.New:
            current = undefined;
            break;
          case ClusterTag.Merge:
            L.push(queue, current.right);
            current = current.left({});
            break;
          case ClusterTag.LeaderTask:
            if (current.where) {
              L.push(leaderTasks, current);
            }
            current = undefined;
            break;
          case ClusterTag.MemberTask:
            if (current.where) {
              L.push(tasks, current);
            }
            current = undefined;
            break;
        }

        if (!current) {
          pipe(
            L.pop(queue),
            O.fold(
              () => {},
              op => {
                current = op({});
              }
            )
          );
        }
      }

      const interruptors = L.empty<Lazy<void>>();

      function interrupt() {
        let i = L.popUnsafe(interruptors);

        while (i != null) {
          i();

          i = L.popUnsafe(interruptors);
        }
      }

      runTasks(tasks, interruptors, interrupt, cb);

      if (L.isNotEmpty(leaderTasks)) {
        if (hasZookeeper(r)) {
          // casted to Z.Zookeeper & Z.ZookeeperConfig
          T.run(
            T.provideAll(r)(
              r.zookeeper.runTasks(leaderTasks, interruptors, interrupt, cb)
            )
          );
        } else {
          cb(
            left(new Error("you must have zookeeper in scope to use onLeader"))
          );

          return () => {};
        }
      }

      return () => {
        interrupt();
      };
    })
  );
}

export function provide<R>(
  r: R
): <R2, E2, R3, E3>(
  f: (cluster: Cluster<R2, E2>) => Cluster<R & R3, E3>
) => (cluster: Cluster<R2, E2>) => Cluster<R3, E3> {
  return f => cluster => r3 => f(cluster)(pipe(r, T.mergeEnv(r3)));
}
