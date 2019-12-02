import { effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";

export interface Graceful {
  graceful: {
    state: Array<T.Effect<T.NoEnv, T.NoErr, void>>;
    onExit(
      op: T.Effect<T.NoEnv, T.NoErr, void>
    ): T.Effect<Graceful, T.NoErr, void>;
    trigger(): T.Effect<Graceful, T.NoErr, void>;
  };
}

export const graceful: () => Graceful = () => ({
  graceful: {
    state: [],
    onExit(
      op: T.Effect<T.NoEnv, T.NoErr, void>
    ): T.Effect<Graceful, T.NoErr, void> {
      return T.accessM(({ graceful }: Graceful) =>
        T.sync(() => {
          graceful.state.push(op);
        })
      );
    },
    trigger(): T.Effect<Graceful, T.NoErr, void> {
      return T.accessM(({ graceful }: Graceful) =>
        pipe(
          graceful.state,
          T.sequenceP(graceful.state.length),
          T.map(() => {})
        )
      );
    }
  }
});

export function onExit(
  op: T.Effect<T.NoEnv, T.NoErr, void>
): T.Effect<Graceful, T.NoErr, void> {
  return T.accessM(({ graceful }: Graceful) => graceful.onExit(op));
}

export function trigger(): T.Effect<Graceful, T.NoErr, void> {
  return T.accessM(({ graceful }: Graceful) => graceful.trigger());
}
