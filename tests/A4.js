//how the balancer tests back to back using hash function
import A1 from "./A1.js";
import A2 from "./A2.js";
import {
  ensureReplicas,
  runLoadTest,
  plotResults,
  setDefaultHashFunction,
} from "./utils.js";

export default async () => {
  let testName = "A4-A1";

  await setDefaultHashFunction(false); // Set to custom hash function

  console.log("===== A4-A1 Test =====");
  const targetN = 3;
  await ensureReplicas(targetN); // Ensure 3 replicas for the test
  console.log("Launching 10,000 async requests...");
  const counts = await runLoadTest();
  console.log("Load test complete. Generating chart...");
  await plotResults({ counts, testName, targetN, subfolder: "A4" });

  console.log("===== A4-A2 Test =====");
  testName = "A4-A2";
  const START_N = 2;
  const END_N = 6;
  for (let targetN = START_N; targetN <= END_N; targetN++) {
    console.log(`\n=========== Testing with ${targetN} Replicas ===========`);
    await ensureReplicas(targetN);
    console.log("Launching 10,000 async requests...");
    const counts = await runLoadTest();
    console.log("Load test complete. Generating chart...");
    await plotResults({ counts, testName, targetN, subfolder: "A4" });
  }
};
