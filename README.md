# 🚀 Monitoring System Implementation

A comprehensive real-time monitoring system with metrics collection, health scoring, and chaos testing capabilities. This system monitors multiple Docker containers and provides a web-based dashboard for real-time visualization.

## 📋 Features

### ✅ Core Metrics

- **CPU Load**: Real-time CPU usage monitoring using cgroup statistics
- **Memory Load**: Memory usage tracking with cgroup memory limits
- **Latency**: HTTP response time monitoring for all servers
- **Status Code**: HTTP status code monitoring and error detection

### ✅ Additional Metrics

- **Disk Usage**: Real-time disk space monitoring
- **Requests Per Second**: Request rate tracking and analysis

### ✅ Health Scoring

- Comprehensive scoring algorithm with severity levels
- Color-coded status indicators (Green/Yellow/Orange/Red)
- Historical trend analysis and visualization

### ✅ Chaos Testing

- CPU chaos experiments (infinite openssl loops)
- Network corruption and packet loss
- Disk space consumption
- Bandwidth limitations
- Random network loss
- Server process termination

## 🏗️ Architecture

### System Components

1. **Agents** (Ports 5001-5003)

   - Collect system metrics from cgroup files
   - Send data via WebSocket to monitor
   - Run in separate Docker containers

2. **Servers** (Ports 4001-4003)

   - Provide load testing endpoints
   - Use stress-ng for controlled load generation
   - Serve as targets for monitoring

3. **Monitor** (Port 3000)
   - WebSocket server for real-time communication
   - HTTP server for dashboard
   - Health scoring and trend analysis

### Data Flow

```
Agents → WebSocket → Monitor → Dashboard
Servers → HTTP → Monitor → Latency/Status
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker (for containerized deployment)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd monitoring-main
   ```

2. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install agent dependencies
   cd agent && npm install && cd ..

   # Install monitor dependencies
   cd monitor && npm install && cd ..

   # Install server dependencies
   cd server && npm install && cd ..
   ```

3. **Start the system**

   ```bash
   # Start agents (in separate terminals)
   cd agent && npm start
   cd agent && AGENT_PORT=5002 npm start
   cd agent && AGENT_PORT=5003 npm start

   # Start servers (in separate terminals)
   cd server && npm start
   cd server && SERVER_PORT=4002 npm start
   cd server && SERVER_PORT=4003 npm start

   # Start monitor
   cd monitor && node index.js
   ```

4. **Access the dashboard**
   - Open http://localhost:3000 in your browser
   - View real-time metrics and health scores

## 🐳 Docker Deployment

### Automated Setup

```bash
# Run the setup script
./setup-containers.sh
```

### Manual Setup

```bash
# Create Docker network
docker network create monitoring-network

# Build and run agents
docker build -f Dockerfile.agent -t monitoring-agent .
docker run -d --name agent-1 --network monitoring-network -p 5001:5001 monitoring-agent
docker run -d --name agent-2 --network monitoring-network -p 5002:5001 monitoring-agent
docker run -d --name agent-3 --network monitoring-network -p 5003:5001 monitoring-agent

# Build and run servers
docker build -f Dockerfile.server -t monitoring-server .
docker run -d --name server-1 --network monitoring-network -p 4001:4001 monitoring-server
docker run -d --name server-2 --network monitoring-network -p 4002:4001 monitoring-server
docker run -d --name server-3 --network monitoring-network -p 4003:4001 monitoring-server
```

## 🧪 Chaos Testing

### Running Chaos Experiments

```bash
# Make the script executable
chmod +x chaos-experiments.sh

# Run all chaos experiments
./chaos-experiments.sh
```

### Individual Experiments

1. **CPU Chaos**

   ```bash
   # Create infinite openssl loops
   for i in $(seq 1 32); do
       nohup openssl speed -multi 4 > /dev/null 2>&1 &
   done
   ```

2. **Network Corruption**

   ```bash
   # 50% packet corruption
   tc qdisc add dev eth0 root netem corrupt 50%
   ```

3. **Disk Fill**

   ```bash
   # Rapid disk space consumption
   dd if=/dev/zero of=/tmp/fillfile bs=4k count=1000000
   ```

4. **Bandwidth Issues**

   ```bash
   # Rate limiting and packet loss
   tc qdisc add dev eth0 root netem delay 250ms loss 10% rate 1mbps
   ```

5. **Random Network Loss**

   ```bash
   # 10% packet drop
   iptables -A INPUT -m statistic --mode random --probability 0.1 -j DROP
   ```

6. **Server Killing**
   ```bash
   # Process termination
   pkill -f 'node.*server'
   ```

## 📊 Dashboard Features

### Real-time Monitoring

- Live updates via WebSocket
- Multi-metric display (CPU, Memory, Disk, RPS, Latency, Status)
- Color-coded status indicators
- Historical trend graphs

### Health Scoring

- **Green (≤0.25)**: Healthy
- **Yellow (≤0.50)**: Warning
- **Orange (≤0.75)**: Critical
- **Red (>0.75)**: Failed

### Metrics Display

- CPU usage percentage
- Memory usage percentage
- Disk usage percentage
- Requests per second
- Latency in milliseconds
- HTTP status codes

## 🔧 Configuration

### Environment Variables

#### Agent Configuration

- `AGENT_PORT`: Port for agent to listen on (default: 5001)

#### Server Configuration

- `SERVER_PORT`: Port for server to listen on (default: 4001)

#### Monitor Configuration

- Monitor runs on port 3000 by default

### Customization

#### Adding New Metrics

1. Implement metric collection in `agent/index.js`
2. Update the monitoring data structure in `monitor/index.js`
3. Add display logic in `monitor/www/index.html`

#### Modifying Health Scoring

Edit the `updateHealth` function in `monitor/index.js` to adjust scoring thresholds and weights.

## 🐛 Troubleshooting

### Common Issues

1. **Agents not connecting**

   - Check if agents are running on correct ports
   - Verify WebSocket connections in browser console
   - Check firewall settings

2. **Metrics not updating**

   - Ensure cgroup files are accessible
   - Check agent logs for errors
   - Verify network connectivity

3. **Dashboard not loading**
   - Check if monitor is running on port 3000
   - Verify all dependencies are installed
   - Check browser console for errors

### Debug Mode

```bash
# Run with debug logging
DEBUG=* node monitor/index.js
```

## 📈 Performance Characteristics

### Normal Operation

- CPU: 20-30%
- Memory: 20-30%
- Latency: < 200ms
- Status: 200 OK
- Health Score: Green/Yellow

### Under Load

- CPU: 80-100%
- Memory: 80-100%
- Latency: 500ms-5000ms
- Status: 200/500/Timeout
- Health Score: Orange/Red

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with Node.js and Socket.IO
- Dashboard powered by Vue.js and DataTables
- Chaos testing inspired by Netflix Chaos Monkey
- Monitoring patterns from industry best practices # monitorizing-homework
