import express from "express";
const app = express();
const port = 5000;

// A unique ID for each server instance, passed as an environment variabl
const serverId = process.env.SERVER_ID || "Unknown";

// Endpoint to identify the server
// GET /home
app.get("/home", (req, res) => {
  console.log(`[Server ${serverId}] Request received for /home`);
  res.status(200).json({
    message: `Hello from Server: ${serverId}`,
    status: "successful",
  });
});

// Endpoint for the load balancer's health check
// GET /heartbeat
app.get("/heartbeat", (req, res) => {
  // Responds with a 200 OK to indicate it's alive.
  res.status(200).send();
});

app.listen(port, () => {
  console.log(`Server ${serverId} listening on port ${port}`);
});
