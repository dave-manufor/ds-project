import A1 from "./A1.js";
import A2 from "./A2.js";
import A4 from "./A4.js";

(async () => {
  console.log("=========== A1 Test ===========");
  await A1();
  console.log("=========== A2 Test ===========");
  await A2();
  console.log("=========== A4 Test ===========");
  await A4();
})();
