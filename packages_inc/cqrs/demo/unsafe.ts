import { T } from "@matechs/prelude";
import { liveMain } from "./program";

T.run(liveMain, (exit) => {
  // the program shall not exit as the reads are polling
  console.error(exit);
});
