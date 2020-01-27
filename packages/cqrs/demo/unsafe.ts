import { effect as T } from "@matechs/effect";
import { liveMain } from "./program";

T.run(liveMain, exit => {
  // the program shall not exit as the 2 reads are looping
  console.error(exit);
});
