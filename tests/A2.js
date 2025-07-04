//testing how the loadbalancer works with different servers
import { ensureReplicas, runLoadTest, plotResults } from "./utils.js";

export default async () => {
  const testName = "A2";
  const START_N = 2;
  const END_N = 6;
  for (let targetN = START_N; targetN <= END_N; targetN++) {
    console.log(`\n=========== Testing with ${targetN} Replicas ===========`);
    await ensureReplicas(targetN);
    console.log("Launching 10,000 async requests...");
    const counts = await runLoadTest();
    console.log("Load test complete. Generating chart...");
    await plotResults({ counts, testName, targetN });
  }
};
