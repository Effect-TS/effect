import * as S from "./stream";
import * as T from "../";

type Config = { initial: number };

const a = S.encaseEffect(T.access(({ initial }: Config) => initial));
const s = S.chain(a, n => S.fromRange(n, 1, 10));
const m = S.map(s, n => n + 1);
const g = S.chain(m, n => S.fromRange(0, 1, n));
const r = S.collectArray(g);

T.promise(T.provide<Config>({initial: 1})(r))
  .then(r => {
    console.log(r);
  })
  .catch(e => {
    console.log(e);
  });
