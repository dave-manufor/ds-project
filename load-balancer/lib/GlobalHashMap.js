import hashmapConfig from "../config/hashmapConfig.js";
import crypto from "crypto";

class GlobalHashMap {
  constructor(
    numSlots = hashmapConfig.numSlots,
    numVirtualServers = hashmapConfig.numVirtualServers
  ) {
    if (GlobalHashMap.instance) {
      return GlobalHashMap.instance; // Singleton pattern to ensure only one instance
    }

    // Total number of slots in the hash ring
    this.numSlots = numSlots;
    // Number of virtual servers per physical server
    this.numVirtualServers = numVirtualServers;
    // Initialize the hash ring with null values
    this.ring = Array.from({ length: this.numSlots }, () => null);
    // Stores server hostnames and their IDs
    this.servers = new Map();
    this.useDefaultHashFunction = true; // Flag to use default hash functions

    GlobalHashMap.instance = this; // Store the instance for singleton access
  }

  setUseDefaultHashFunction(useDefault) {
    this.useDefaultHashFunction = useDefault;
  }

  // Hash function for virtual server mapping (i, j) => i + j + 2j + 25
  _serverHash(serverId, virtualId) {
    if (this.useDefaultHashFunction) {
      return (serverId + virtualId + 2 * virtualId + 25) % this.numSlots;
    } else {
      const key = `${serverId}-${virtualId}`;
      const hash = crypto.createHash("md5").update(key).digest("hex");
      // Convert first 8 hex chars to an integer, then mod slots
      return parseInt(hash.substring(0, 8), 16) % this.numSlots;
    }
  }

  // Hash function for request mapping H(i) => i + 2(i^2) + 17
  _requestHash(requestId) {
    if (this.useDefaultHashFunction) {
      return (requestId + 2 * requestId ** 2 + 17) % this.numSlots;
    } else {
      const key = `${serverId}-${virtualId}`;
      const hash = crypto.createHash("md5").update(key).digest("hex");
      // Convert first 8 hex chars to an integer, then mod slots
      return parseInt(hash.substring(0, 8), 16) % this.numSlots;
    }
  }

  isFull() {
    return this.ring.every((slot) => slot !== null);
  }

  // Adds a new server to the hash ring
  addServer(hostname, serverId) {
    if (this.servers.has(hostname)) return; // Check if server already exists and return early if true
    if (this.isFull()) {
      throw new Error("Hash ring is full, cannot add more servers");
    }
    this.servers.set(hostname, { id: serverId });

    for (let j = 0; j < this.numVirtualServers; j++) {
      let slot = this._serverHash(serverId, j);

      // Checks for collisions and finds the next available slot
      while (this.ring[slot] !== null) {
        slot = (slot + 1) % this.numSlots;
      }
      this.ring[slot] = { hostname, serverId };
    }
  }

  // Remove a server from the hash ring
  removeServer(hostname) {
    if (!this.servers.has(hostname)) return;

    this.servers.delete(hostname);

    // Remove all virtual instances from the ring
    this.ring = this.ring.map((slot) =>
      slot && slot.hostname === hostname ? null : slot
    );
  }

  // Get the server responsible for a request
  getServer(requestId) {
    const requestSlot = this._requestHash(requestId);
    let currentSlot = requestSlot;

    // Find the next server clockwise
    while (this.ring[currentSlot] === null) {
      currentSlot = (currentSlot + 1) % this.numSlots;
    }
    return this.ring[currentSlot].hostname;
  }

  getReplicas() {
    return Array.from(this.servers.keys());
  }

  visualizeRing() {
    console.log("Hash Ring Visualization:");
    const dict = {};
    for (let i = 0; i < this.numSlots; i++) {
      if (this.ring[i] !== null) {
        const { hostname, serverId } = this.ring[i];
        if (!dict[hostname]) {
          dict[hostname] = [];
        }
        dict[hostname].push({ slot: i });
      }
    }
    for (const [hostname, slots] of Object.entries(dict)) {
      console.log(`Server: ${hostname}`);
      console.log("Slots:", slots.map((slot) => slot.slot).join(", "));
      console.log("=========================");
    }
  }
}

export default GlobalHashMap;
