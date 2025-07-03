import axios from "axios";
import pLimit from "p-limit";
import fs from "fs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const LOADBALANCER_URL = "http://localhost:5000";
const TOTAL_REQUESTS = 10000;
const HOME_ENDPOINT = `${LOADBALANCER_URL}/home`;
const GET_REPLICA_ENDPOINT = `${LOADBALANCER_URL}/rep`;
const ADD_REPLICA_ENDPOINT = `${LOADBALANCER_URL}/add`;
const REMOVE_REPLICA_ENDPOINT = `${LOADBALANCER_URL}/rm`;
const IMG_FOLDER = "./img/";

// Ensure exactly 3 replicas
async function ensureReplicas(target) {
  try {
    const res = await axios.get(GET_REPLICA_ENDPOINT);
    console.log(res.data);
    const current_N = res.data.message.N;
    const diff = Math.abs(target - current_N);
    if (current_N !== target) {
      console.log(`Adjusting replicas from ${current_N} to ${target}...`);
      const payload = { n: diff, hostnames: [] };
      if (current_N < target) {
        await axios.post(ADD_REPLICA_ENDPOINT, payload);
      } else {
        await axios.delete(REMOVE_REPLICA_ENDPOINT, {
          data: payload,
        });
      }
      console.log("Replicas adjusted.");
    }
  } catch (err) {
    console.error("Error ensuring replicas:", err.message);
    process.exit(1);
  }
}

// Async request to /home
async function fetchServerId() {
  try {
    const res = await axios.get(HOME_ENDPOINT);
    const { data } = res;
    return data.message.split(":").pop().trim();
  } catch {
    return "error";
  }
}

// Run 10,000 requests
async function runLoadTest() {
  const counts = {};
  const limit = pLimit(50); // Limit to 50 concurrent requests

  const tasks = Array.from({ length: TOTAL_REQUESTS }, (_, i) =>
    limit(async () => {
      const id = await fetchServerId();
      return id;
    })
  );

  const results = await Promise.all(tasks);
  console.log("Request batching complete");
  console.log("Waiting for responses...");

  results.forEach((id, i) => {
    counts[id] = (counts[id] || 0) + 1;
    if ((i + 1) % 1000 === 0)
      console.log(`Progress: ${i + 1}/${TOTAL_REQUESTS}`);
  });

  return counts;
}

// Plot chart
async function plotResults(counts, targetN) {
  const width = 800;
  const height = 600;
  const chart = new ChartJSNodeCanvas({ width, height });

  const labels = Object.keys(counts);
  const data = Object.values(counts);

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Requests Handled",
          data,
          backgroundColor: "skyblue",
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: `Load Distribution Across ${targetN} Servers`,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 100 },
        },
      },
    },
  };

  const buffer = await chart.renderToBuffer(config);
  fs.mkdirSync("img", { recursive: true });
  const IMG_PATH = `${IMG_FOLDER}A-2_${targetN}.png`;
  fs.writeFileSync(IMG_PATH, buffer);
  console.log(`Chart saved to ${IMG_PATH}`);
}

export default async () => {
  const START_N = 2;
  const END_N = 6;
  for (let targetN = START_N; targetN <= END_N; targetN++) {
    console.log(`\n=========== Testing with ${targetN} Replicas ===========`);
    await ensureReplicas(targetN);
    console.log("Launching 10,000 async requests...");
    const counts = await runLoadTest();
    console.log("Load test complete. Generating chart...");
    await plotResults(counts, targetN);
  }
};
