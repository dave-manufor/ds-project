import GlobalHashMap from "./lib/GlobalHashMap.js";
import generateRandomHostname from "./util/generateRandomHostname.js";
import getServerIdFromHostname from "./util/getServerIdFromHostname.js";

const hashMap = new GlobalHashMap();

const hostnames = [];

for (let i = 0; i < 10; i++) {
  const hostname = generateRandomHostname();
  hostnames.push(hostname);
  const serverId = getServerIdFromHostname(hostname);
  try {
    hashMap.addServer(hostname, serverId);
    console.log(`Added server: ${hostname} with ID: ${serverId}`);
  } catch (error) {
    console.error(`Failed to add server ${hostname}:`, error.message);
  }
}

console.log("State of the hash map using default function:");
hashMap.visualizeRing();

for (const hostname of hostnames) {
  hashMap.removeServer(hostname);
  console.log(`Removed server: ${hostname}`);
}

hashMap.setUseDefaultHashFunction(false);

for (let i = 0; i < 10; i++) {
  const hostname = generateRandomHostname();
  hostnames.push(hostname);
  const serverId = getServerIdFromHostname(hostname);
  try {
    hashMap.addServer(hostname, serverId);
    console.log(`Added server: ${hostname} with ID: ${serverId}`);
  } catch (error) {
    console.error(`Failed to add server ${hostname}:`, error.message);
  }
}

console.log("State of the hash map using new function:");
hashMap.visualizeRing();
