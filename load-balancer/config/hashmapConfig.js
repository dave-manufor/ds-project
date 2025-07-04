export default {
  numSlots: process.env.HASHMAP_SLOTS || 512, // Number of slots in the hash rin
  numVirtualServers: process.env.VIRTUAL_SERVER_COUNT || 9, // Number of virtual servers per physical server
};
