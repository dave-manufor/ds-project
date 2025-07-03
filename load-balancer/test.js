import GlobalHashMap from "./lib/GlobalHashMap.js";
import generateRandomHostname from "./util/generateRandomHostname.js";
import getServerIdFromHostname from "./util/getServerIdFromHostname.js";

const hostname = generateRandomHostname();
const serverId = getServerIdFromHostname(hostname);

console.log(`Generated hostname: ${hostname}`);
console.log(`Generated server ID: ${serverId}`);

const hashMap = new GlobalHashMap();

hashMap.addServer(hostname, serverId);
console.log(`Added server ${hostname} with ID ${serverId} to the hash map.`);
console.log("Current state of the hash map:", hashMap.servers);
