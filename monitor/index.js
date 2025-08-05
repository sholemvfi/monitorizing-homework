const express = require("express");
const app = express();
const httpServer = require("http").Server(app);
const { Server } = require("socket.io");
const { io } = require("socket.io-client");
const axios = require("axios");

app.use(express.static("www"));

// TODO: update these if you used different ports!
const servers = [
  {
    name: "server-01",
    url: `http://localhost`,
    port: 4001,
    status: "#cccccc",
    scoreTrend: [0],
    latency: 0,
    statusCode: 200,
    cpuLoad: 0,
    memoryLoad: 0,
    diskUsage: 0,
    requestsPerSecond: 0,
  },
  {
    name: "server-02",
    url: `http://localhost`,
    port: 4002,
    status: "#cccccc",
    scoreTrend: [0],
    latency: 0,
    statusCode: 200,
    cpuLoad: 0,
    memoryLoad: 0,
    diskUsage: 0,
    requestsPerSecond: 0,
  },
  {
    name: "server-03",
    url: `http://localhost`,
    port: 4003,
    status: "#cccccc",
    scoreTrend: [0],
    latency: 0,
    statusCode: 200,
    cpuLoad: 0,
    memoryLoad: 0,
    diskUsage: 0,
    requestsPerSecond: 0,
  },
];

// Agent connections for metrics collection
const agents = [
  { name: "agent-01", url: `http://localhost`, port: 5001 },
  { name: "agent-02", url: `http://localhost`, port: 5002 },
  { name: "agent-03", url: `http://localhost`, port: 5003 },
];

// ==================================================
// Connect to the Agent websocket servers
// ==================================================

for (let i = 0; i < agents.length; i++) {
  const agent = agents[i];
  const server = servers[i];

  const agentSocket = io(agent.url + ":" + agent.port, {
    transports: ["websocket"],
  });
  console.log("Agent connected:", agent.name);

  agentSocket.on("monitoring-stats", async (data) => {
    console.log("monitoring-stats from", agent.name, data);

    // Update server metrics from agent
    server.memoryLoad = data.memoryLoad || 0;
    server.cpuLoad = data.cpuLoad || 0;
    server.diskUsage = data.diskUsage || 0;
    server.requestsPerSecond = data.requestsPerSecond || 0;

    updateHealth(server);
  });

  agentSocket.on("connect_error", (error) => {
    console.error(`Failed to connect to agent ${agent.name}:`, error.message);
    server.status = "#ff0000"; // Red for connection error
  });
}

// ==================================================
// Monitor socket to send data to the dashboard front-end
// ==================================================

const monitorSocket = new Server(httpServer, {
  transports: ["websocket"],
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

monitorSocket.on("connection", (socket) => {
  console.log("Monitoring dashboard connected");
  const heartbeatInterval = setInterval(() => {
    socket.emit("heartbeat", { servers });
  }, 1000);

  socket.on("disconnect", () => {
    clearInterval(heartbeatInterval);
  });
});

// ==================================================
// Latency calculation and status code monitoring
// ==================================================

async function checkLatencyAndStatus(server) {
  try {
    const startTime = Date.now();
    const response = await axios.get(`${server.url}:${server.port}`, {
      timeout: 5000,
    });
    const endTime = Date.now();

    server.latency = endTime - startTime;
    server.statusCode = response.status;
  } catch (error) {
    console.error(`Error checking ${server.name}:`, error.message);
    server.latency = 9999; // High latency for timeout/error
    server.statusCode = error.response?.status || 0;
  }
}

// TODO:
// Check latency and status for all servers every 5 seconds
setInterval(async () => {
  // check latency
  // set server.latency
  // set server.statusCode
  for (const server of servers) {
    await checkLatencyAndStatus(server);
    updateHealth(server);
  }
}, 5000);

// Initial latency check
setTimeout(async () => {
  for (const server of servers) {
    await checkLatencyAndStatus(server);
    updateHealth(server);
  }
}, 1000);

// ==================================================
// Health scoring algorithm
// ==================================================

// TODO:
function updateHealth(server) {
  let score = 0;
  // Update score calculation.

  // Base scoring (1 point each for critical issues)
  if (server.cpuLoad > 80) score += 1;
  if (server.memoryLoad > 80) score += 1;
  if (server.latency > 200) score += 1;
  if (server.statusCode !== 200) score += 1;
  if (server.diskUsage > 80) score += 1;
  if (server.requestsPerSecond > 100) score += 1;

  // Severity scoring (0.5 points each for severe issues)
  if (server.cpuLoad > 95) score += 0.5;
  if (server.memoryLoad > 95) score += 0.5;
  if (server.latency > 1000) score += 0.5;
  if (server.statusCode >= 500) score += 0.5;
  if (server.diskUsage > 95) score += 0.5;
  if (server.requestsPerSecond > 500) score += 0.5;

  // Normalize score to 0-1 range (max possible score is 9)
  const normalizedScore = Math.min(1, score / 9);

  server.status = score2color(normalizedScore);

  console.log(
    `${server.name} - Score: ${score.toFixed(2)} (${normalizedScore.toFixed(
      2
    )}) - Status: ${server.status}`
  );

  // Add score to trend data (inverted for display - higher is better)
  server.scoreTrend.push(1 - normalizedScore);
  if (server.scoreTrend.length > 100) {
    server.scoreTrend.shift();
  }
}

function score2color(score) {
  if (score <= 0.25) return "#00ff00"; // Green - Healthy
  if (score <= 0.5) return "#00cc00"; // Light Green - Warning
  if (score <= 0.75) return "#ffcc00"; // Yellow - Critical
  return "#ff0000"; // Red - Failed
}

// ==================================================

httpServer.listen(3000, () => {
  console.log("Monitor dashboard listening on port 3000!");
});
