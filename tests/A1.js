import { ensureReplicas, runLoadTest, plotResults } from "./utils.js";

export default async () => {
  const testName = "A1";
  const targetN = 3;
  await ensureReplicas(targetN); // Ensure 3 replicas for the tests.
  console.log("Launching 10,000 async requests...");
  const counts = await runLoadTest();
  console.log("Load test complete. Generating chart...");
  await plotResults({ counts, testName, targetN });
};
