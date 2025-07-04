import Docker from "dockerode";
import balancerConfig from "../config/balancerConfig.js";
import getServerIdFromHostname from "../util/getServerIdFromHostname.js";
import GlobalHashMap from "../lib/GlobalHashMap.js";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });
const hashMap = new GlobalHashMap();
const serverImage = balancerConfig.serverImage;
const networkName = balancerConfig.networkName;

// Helper to spawn a new server container
export const spawnServer = async (hostname) => {
  if (hashMap.isFull()) {
    console.warn(
      `Cannot spawn server ${hostname}: HashMap is full with ${hashMap.numSlots} servers`
    );
    return;
  }
  try {
    console.log(`Spawning server with hostname: ${hostname}`);
    const container = await docker.createContainer({
      Image: serverImage,
      name: hostname,
      Hostname: hostname,
      Labels: {
        // Used later to restore loadbalancers state in case of failure
        role: "server-replica",
        managedBy: "load-balancer",
      },
      Env: [`SERVER_ID=${hostname}`],
      NetworkingConfig: {
        EndpointsConfig: {
          [networkName]: {},
        },
      },
    });
    await container.start();
    const serverId = getServerIdFromHostname(hostname);
    hashMap.addServer(hostname, serverId);
    const inspect = await container.inspect();
    console.log(
      `Successfully spawned and added server ${hostname} with ID ${serverId} (Network: ${Object.keys(
        inspect.NetworkSettings.Networks
      )})`
    );
  } catch (err) {
    console.error(`Error spawning server ${hostname}:`, err.message);
  }
};

// Helper to remove a server container
export const removeServer = async (hostname) => {
  try {
    console.log(`Removing server with hostname: ${hostname}`);
    hashMap.removeServer(hostname);
    const container = docker.getContainer(hostname); // Get container by hostname
    const inspect = await container.inspect();
    if (inspect.State.Running) {
      await container.stop();
    }
    await container.remove();
    console.log(`Successfully removed server: ${hostname}`);
  } catch (err) {
    console.error(`Error removing server ${hostname}:`, err.message);
  }
};

// Helper to recover server state from Docker
export const recoverState = async () => {
  const containers = await docker.listContainers({
    filters: {
      label: ["role=server-replica", "managedBy=load-balancer"], // Filter for containers managed by the load balancer
    },
  });

  if (containers.length === 0) {
    console.log("No server replicas found to recover.");
    return;
  }

  console.log(`Found ${containers.length} server replicas`);
  console.log("Updating HashMap...");

  containers.forEach(async (container, index) => {
    console.log(`Recovering server ${index + 1}/${containers.length}`);
    const hostname = container.Names[0].replace("/", ""); // remove leading slash
    console.log(`Hostname: ${hostname}`);
    const serverId = getServerIdFromHostname(hostname);
    console.log(`Server ID: ${serverId}`);
    hashMap.addServer(hostname, serverId);
    console.log(
      `Added server ${hostname} with ID ${serverId} to the HashMap (Network: ${Object.keys(
        container.NetworkSettings.Networks
      )})`
    );
  });
};

// Helper to initialize Docker network if it doesn't exist
export const initDockerNetwork = async (networkName) => {
  console.log(`Checking if Docker network '${networkName}' exists...`);
  try {
    const networks = await docker.listNetworks();
    const exists = networks.some((n) => n.Name === networkName);

    if (!exists) {
      await docker.createNetwork({
        Name: networkName,
        Driver: "bridge",
      });
      console.log(`Network '${networkName}' created.`);
    } else {
      console.log(`Network '${networkName}' already exists.`);
    }
  } catch (error) {
    console.error(
      `Error checking/creating network '${networkName}':`,
      error.message
    );
  }
};
