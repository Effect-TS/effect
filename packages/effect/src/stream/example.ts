import * as S from "./stream";
import * as W from "waveguide/lib/wave";

const s = S.fromRange(0, 1, 10);
const m = S.map(s, n => n + 1);
const g = S.chain(m, n => S.fromRange(0, 1, n));
const r = S.collectArray(g);

W.runToPromise(r)
  .then(r => {
    console.log(r);
  })
  .catch(e => {
    console.log(e);
  });
