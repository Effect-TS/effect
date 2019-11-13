import { console } from "fp-ts";
import { main } from "./Main";

main().then(r => {
  console.log(r)();
});
