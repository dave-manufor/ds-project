import express from "express";
import axios from "axios";
import GlobalHashMap from "./lib/GlobalHashMap.js";
import {
  spawnServer,
  removeServer,
  initDockerNetwork,
  recoverState,
} from "./services/docker.js";
import balancerConfig from "./config/balancerConfig.js";
import generateRandomHostname from "./util/generateRandomHostname.js";
import getServerIdFromHostname from "./util/getServerIdFromHostname.js";

const app = express();
app.use(express.json());
const spawningServers = new Set(); // Track servers being spawned
const hashMap = new GlobalHashMap();
// Initialize Docker network
initDockerNetwork(balancerConfig.networkName);

// GET /rep: Get replica status
app.get("/rep", (req, res) => {
  const replicas = hashMap.getReplicas();
  res.status(200).json({
    message: {
      N: replicas.length,
      replicas: replicas,
    },
    status: "successful",
  });
});

// POST /add: Add new server instances
app.post("/add", async (req, res) => {
  const { n, hostnames } = req.body || {};
  if (!n || !hostnames) {
    return res
      .status(400)
      .json({ message: "<Error> Invalid payload", status: "failure" });
  }

  if (n < hostnames.length) {
    return res.status(400).json({
      message:
        "<Error> Length of hostname list is more than newly added instances",
      status: "failure",
    });
  }

  const newHostnames = [...hostnames];
  // Generate random hostnames if not enough are provided
  for (let i = 0; i < n - hostnames.length; i++) {
    newHostnames.push(generateRandomHostname());
  }

  await Promise.all(
    newHostnames.map((hostname) =>
      (async () => {
        spawningServers.add(hostname);
        try {
          await spawnServer(hostname);
        } finally {
          spawningServers.delete(hostname);
        }
      })()
    )
  );

  const replicas = hashMap.getReplicas();
  res.status(200).json({
    message: {
      N: replicas.length,
      replicas: replicas,
    },
    status: "successful",
  });
});

// DELETE /rm: Remove server instances
app.delete("/rm", async (req, res) => {
  const { n, hostnames } = req.body || {};
  if (!n || !hostnames) {
    return res
      .status(400)
      .json({ message: "<Error> Invalid payload", status: "failure" });
  }

  if (n < hostnames.length) {
    return res.status(400).json({
      message:
        "<Error> Length of hostname list is more than number of instances to remove",
      status: "failure",
    });
  }

  const currentReplicas = hashMap.getReplicas();

  if (n > currentReplicas.length) {
    return res.status(400).json({
      message:
        "<Error> Length of hostname list is more than removable instances",
      status: "failure",
    });
  }

  const toRemove = new Set(hostnames); // Using a Set to avoid duplicates

  // Randomly select other servers if necessary
  while (toRemove.size < n) {
    const randomIndex = Math.floor(Math.random() * currentReplicas.length);
    const randomReplica = currentReplicas[randomIndex];
    if (!toRemove.has(randomReplica)) {
      toRemove.add(randomReplica);
    }
  }

  await Promise.all(
    Array.from(toRemove).map((hostname) => removeServer(hostname))
  );

  const replicas = hashMap.getReplicas();
  res.status(200).json({
    message: {
      N: replicas.length,
      replicas: replicas,
    },
    status: "successful",
  });
});

// Post /function: Utility to change hash function for tests (A4)
app.post("/function", (req, res) => {
  const { useDefault } = req.body || {};
  if (useDefault === undefined) {
    return res
      .status(400)
      .json({ message: "<Error> Invalid payload", status: "failure" });
  }

  if (typeof useDefault !== "boolean") {
    return res.status(400).json({
      message: "<Error> 'useDefault' must be a boolean",
      status: "failure",
    });
  }

  hashMap.setUseDefaultHashFunction(useDefault);

  // Redistribute the servers if the hash function is changed
  const currentReplicas = hashMap.getReplicas();
  if (currentReplicas.length !== 0) {
    currentReplicas.forEach((hostname) => {
      const serverId = getServerIdFromHostname(hostname);
      hashMap.removeServer(hostname);
      hashMap.addServer(hostname, serverId);
    });
  }

  res.status(200).json({
    message: `Hash function set to ${useDefault ? "default" : "custom"}`,
    status: "successful",
  });
});

// GET /<path>: Route requests to a server
app.get(/.*/, async (req, res) => {
  console.log(req.path);
  const path = req.path;
  if (path === "/home") {
    const requestId = Math.floor(Math.random() * 100000); // 6-digit random ID
    const serverHostname = hashMap.getServer(requestId);
    if (!serverHostname) {
      return res
        .status(500)
        .json({ message: "No available servers", status: "failure" });
    }
    try {
      // Forward request to the chosen server
      const serverUrl = `http://${serverHostname}:5000${path}`;
      const response = await axios.get(serverUrl);
      res.status(response.status).json(response.data);
    } catch (err) {
      res.status(500).json({
        message: `Error forwarding request to ${serverHostname}`,
        status: "failure",
      });
    }
  } else {
    res.status(400).json({
      message: `<Error> '${path}' endpoint does not exist in server replicas`,
      status: "failure",
    });
  }
});

// Health Check Logic
setInterval(async () => {
  console.log("Replicas health check started...");
  const replicas = hashMap.getReplicas();
  console.log(`Replicas: ${replicas}`);
  for (const hostname of replicas) {
    if (!spawningServers.has(hostname)) {
      try {
        await axios.get(`http://${hostname}:5000/heartbeat`, {
          timeout: balancerConfig.healthCheckTimeout,
        });
      } catch (error) {
        console.log(`Server ${hostname} is down. Respawning...`);
        await removeServer(hostname);
        spawningServers.add(hostname);
        await spawnServer(hostname);
        spawningServers.delete(hostname);
      }
    }
  }
}, balancerConfig.healthCheckInterval);

(async () => {
  // Recover state from Docker containers
  await recoverState();
  if (hashMap.getReplicas().length !== 0) {
    console.log(
      `Load Balancer restored with ${hashMap.getReplicas().length} replicas`
    );
  } else {
    // Initial server spawns
    const initialReplicas = balancerConfig.initialReplicaCount;
    for (let i = 0; i < initialReplicas; i++) {
      const hostname = `server-${i}`;
      spawningServers.add(hostname);
      await spawnServer(hostname);
      spawningServers.delete(hostname);
    }
  }
})()
  .then(() => {
    app.listen(5000, "0.0.0.0", () => {
      console.log("Load Balancer listening on port 5000");
    });
  })
  .catch((err) => {
    console.error("Error initializing Load Balancer:", err.message);
    process.exit(1);
  });
