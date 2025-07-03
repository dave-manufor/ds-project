export default {
  serverImage: process.env.SERVER_IMAGE,
  networkName: process.env.DOCKER_NETWORK_NAME,
  initialReplicaCount: process.env.INITIAL_REPLICA_COUNT || 3, // Default to 3 replicas if not set
  healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL || 20000, // Default to 20 seconds
  healthCheckTimeout: process.env.HEALTH_CHECK_TIMEOUT || 10000, // Default to 10 seconds
};
