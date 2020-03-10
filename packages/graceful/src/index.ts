import { effect as T } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";

export const gracefulURI = "@matechs/graceful/gracefulURI";

export interface Graceful {
  [gracefulURI]: {
    state: Array<T.Effect<T.NoEnv, T.NoErr, void>>;
    onExit(
      op: T.Effect<T.NoEnv, T.NoErr, void>
    ): T.Effect<Graceful, T.NoErr, void>;
    trigger(): T.Effect<Graceful, T.NoErr, void>;
  };
}

export const graceful: () => Graceful = () => ({
  [gracefulURI]: {
    state: [],
    onExit(
      op: T.Effect<T.NoEnv, T.NoErr, void>
    ): T.Effect<Graceful, T.NoErr, void> {
      return T.accessM(({ [gracefulURI]: graceful }: Graceful) =>
        T.sync(() => {
          graceful.state.push(op);
        })
      );
    },
    trigger(): T.Effect<Graceful, T.NoErr, void> {
      return T.accessM(({ [gracefulURI]: graceful }: Graceful) =>
        pipe(
          graceful.state,
          T.sequenceP(graceful.state.length),
          // tslint:disable-next-line: no-empty
          T.map(() => {})
        )
      );
    }
  }
});

export function onExit(
  op: T.Effect<T.NoEnv, T.NoErr, void>
): T.Effect<Graceful, T.NoErr, void> {
  return T.accessM(({ [gracefulURI]: graceful }: Graceful) =>
    graceful.onExit(op)
  );
}

export function trigger(): T.Effect<Graceful, T.NoErr, void> {
  return T.accessM(({ [gracefulURI]: graceful }: Graceful) =>
    graceful.trigger()
  );
}
