const fs = require("fs").promises;
const { createServer } = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

class Agent {
  constructor() {
    this.lastCpuCheck = Date.now();
    this.lastCpuUsage = 0;
    this.requestCount = 0;
    this.lastRequestTime = Date.now();
  }

  async memoryLoad() {
    // TODO: calculate memory load
    // see:
    // /sys/fs/cgroup/memory.current
    // /sys/fs/cgroup/memory.max

    try {
      const memoryCurrent = await fs.readFile(
        "/sys/fs/cgroup/memory.current",
        "utf8"
      );
      const memoryMax = await fs.readFile("/sys/fs/cgroup/memory.max", "utf8");

      const current = parseInt(memoryCurrent.trim());
      const max = parseInt(memoryMax.trim());

      if (max === 0 || max === -1) {
        // If max is 0 or -1, try to get system memory
        const { stdout } = await execAsync(
          "free -m | grep Mem | awk '{print $2}'"
        );
        const totalMemoryMB = parseInt(stdout.trim());
        const maxBytes = totalMemoryMB * 1024 * 1024;
        return Math.round((current / maxBytes) * 100);
      }

      return Math.round((current / max) * 100);
    } catch (error) {
      console.error("Error reading memory stats:", error.message);
      return 20; // fallback
    }
  }

  async cpuLoad() {
    // TODO: calculate cpu load
    // to calculate CPU load:
    // 1. read usage_usec value from /sys/fs/cgroup/cpu.stat this is cpu time in microseconds
    // 2. store usage_usec on each run of cpuLoad() and calculate how much is increased since last run (you can store it in this.lastCpuUsage)
    // 3. store and calculate time since last time cpuLoad() was called (you can store timestamps from Date.now() and calculate the time difference)
    // 4. calculate the cpu load percentage as (usage_usec changes since last run / time since last run in seconds) * 100

    try {
      const cpuStat = await fs.readFile("/sys/fs/cgroup/cpu.stat", "utf8");
      const usageMatch = cpuStat.match(/usage_usec (\d+)/);

      if (!usageMatch) {
        return 20; // fallback
      }

      const currentUsage = parseInt(usageMatch[1]);
      const currentTime = Date.now();
      const timeDiff = (currentTime - this.lastCpuCheck) / 1000; // in seconds

      if (this.lastCpuCheck === 0) {
        this.lastCpuUsage = currentUsage;
        this.lastCpuCheck = currentTime;
        return 20; // first run
      }

      const usageDiff = currentUsage - this.lastCpuUsage;
      const cpuLoad = (usageDiff / (timeDiff * 1000000)) * 100; // convert microseconds to percentage

      this.lastCpuUsage = currentUsage;
      this.lastCpuCheck = currentTime;

      return Math.round(Math.min(100, Math.max(0, cpuLoad)));
    } catch (error) {
      console.error("Error reading CPU stats:", error.message);
      return 20; // fallback
    }
  }

  async diskUsage() {
    try {
      const { stdout } = await execAsync(
        "df / | tail -1 | awk '{print $5}' | sed 's/%//'"
      );
      return parseInt(stdout.trim());
    } catch (error) {
      console.error("Error reading disk usage:", error.message);
      return 20; // fallback
    }
  }

  async requestsPerSecond() {
    const now = Date.now();
    const timeDiff = (now - this.lastRequestTime) / 1000; // in seconds

    if (timeDiff >= 1) {
      const rps = this.requestCount / timeDiff;
      this.requestCount = 0;
      this.lastRequestTime = now;
      return Math.round(rps);
    }

    return 0;
  }

  incrementRequestCount() {
    this.requestCount++;
  }
}

const agent = new Agent();
const httpServer = createServer();
const io = new Server(httpServer, {
  transports: ["websocket"],
});

// Handle incoming requests for RPS calculation
httpServer.on("request", (req, res) => {
  agent.incrementRequestCount();
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

io.on("connection", (socket) => {
  console.log("Agent connected to monitor");
  setInterval(async () => {
    const memoryLoad = await agent.memoryLoad();
    const cpuLoad = await agent.cpuLoad();
    const diskUsage = await agent.diskUsage();
    const requestsPerSecond = await agent.requestsPerSecond();

    console.log({ memoryLoad, cpuLoad, diskUsage, requestsPerSecond });
    socket.emit("monitoring-stats", {
      memoryLoad,
      cpuLoad,
      diskUsage,
      requestsPerSecond,
    });
  }, 1000);
});

const port = process.env.AGENT_PORT || 5001;
httpServer.listen(port, () => {
  console.log(`Agent listening on port ${port}!`);
});
