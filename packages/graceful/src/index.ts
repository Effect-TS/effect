import { effect as T, freeEnv as F, ref as R } from "@matechs/effect";
import { pipe } from "fp-ts/lib/pipeable";
import { array } from "fp-ts/lib/Array";

export const gracefulURI = "@matechs/graceful/gracefulURI";

const gracefulF_ = F.define({
  [gracefulURI]: {
    onExit: F.fn<(op: T.UIO<void>) => T.UIO<void>>(),
    trigger: F.cn<T.UIO<void>>()
  }
});

export interface Graceful extends F.TypeOf<typeof gracefulF_> {}

export const gracefulF = F.opaque<Graceful>()(gracefulF_);

export const { onExit, trigger } = F.access(gracefulF)[gracefulURI];

export const provideGraceful = F.implementWith(R.makeRef<T.UIO<void>[]>([]))(
  gracefulF_
)(_ => ({
  [gracefulURI]: {
    onExit: op =>
      pipe(
        _.update(_ => [..._, op]),
        T.chain(() => T.unit)
      ),
    trigger: pipe(
      _.get,
      T.chain(array.sequence(T.effect)),
      T.chain(() => T.unit)
    )
  }
}));
