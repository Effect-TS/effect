import { effect as T, freeEnv as F, ref as R } from "@matechs/effect";
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

const insert = (_: T.UIO<void>) => (a: T.UIO<void>[]) => [...a, _];

export const provideGraceful = F.implementWith(R.makeRef<T.UIO<void>[]>([]))(
  gracefulF
)(_ => ({
  [gracefulURI]: {
    onExit: op => T.asUnit(_.update(insert(op))),
    trigger: T.asUnit(T.effect.chain(_.get, array.sequence(T.parEffect)))
  }
}));
