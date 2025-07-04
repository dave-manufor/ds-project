//the hash function that converts hostnames to server ids for balancing.
import crypto from "crypto";

const getServerIdFromHostname = (hostname) => {
  const hash = crypto.createHash("md5").update(hostname).digest("hex");
  return parseInt(hash.slice(0, 8), 16); // full 32-bit integer
};

export default getServerIdFromHostname;
