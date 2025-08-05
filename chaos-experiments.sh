#!/bin/bash

# Chaos Testing Script for Monitoring System
# This script implements various chaos experiments to test the monitoring system

echo "🚀 Starting Chaos Testing Experiments..."
echo "========================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for user confirmation
wait_for_confirmation() {
    echo ""
    read -p "Press Enter to continue to the next experiment..."
    echo ""
}

# Function to cleanup chaos experiments
cleanup_chaos() {
    echo "🧹 Cleaning up chaos experiments..."
    
    # Kill any running stress processes
    pkill -f "stress-ng" 2>/dev/null || true
    pkill -f "openssl" 2>/dev/null || true
    pkill -f "dd" 2>/dev/null || true
    
    # Remove temporary files
    rm -f /tmp/fillfile* 2>/dev/null || true
    rm -f /tmp/infiniteburn.sh 2>/dev/null || true
    
    # Reset network conditions
    if command_exists tc; then
        tc qdisc del dev eth0 root 2>/dev/null || true
    fi
    
    # Reset iptables
    if command_exists iptables; then
        iptables -D INPUT -m statistic --mode random --probability 0.1 -j DROP 2>/dev/null || true
    fi
    
    echo "✅ Cleanup completed"
}

# Set up cleanup on script exit
trap cleanup_chaos EXIT

echo "1️⃣ CPU Chaos Experiment - Infinite OpenSSL Speed Loops"
echo "--------------------------------------------------------"
echo "This experiment will create high CPU load using openssl speed loops"

# Create infinite burn script
cat > /tmp/infiniteburn.sh << 'EOF'
#!/bin/bash
while true; do
    openssl speed -multi 4 > /dev/null 2>&1
done
EOF

chmod +x /tmp/infiniteburn.sh

echo "Starting 32 openssl speed loops..."
for i in $(seq 1 32); do
    nohup /bin/sh /tmp/infiniteburn.sh > /dev/null 2>&1 &
done

echo "✅ CPU chaos started - Check dashboard for CPU spikes"
wait_for_confirmation

# Cleanup CPU chaos
pkill -f "infiniteburn.sh" 2>/dev/null || true

echo "2️⃣ Network Corruption Experiment - 50% Packet Corruption"
echo "-----------------------------------------------------------"
echo "This experiment will corrupt 50% of network packets"

if command_exists tc; then
    tc qdisc add dev eth0 root netem corrupt 50%
    echo "✅ Network corruption started - Check dashboard for latency increases"
else
    echo "⚠️  tc command not available, skipping network corruption"
fi

wait_for_confirmation

# Cleanup network corruption
if command_exists tc; then
    tc qdisc del dev eth0 root 2>/dev/null || true
fi

echo "3️⃣ Disk Fill Experiment - Rapid Disk Space Consumption"
echo "--------------------------------------------------------"
echo "This experiment will rapidly consume disk space"

echo "Starting disk fill with dd command..."
nohup dd if=/dev/zero of=/tmp/fillfile bs=4k count=1000000 > /dev/null 2>&1 &
echo "✅ Disk fill started - Check dashboard for disk usage increases"
wait_for_confirmation

# Cleanup disk fill
pkill -f "dd.*fillfile" 2>/dev/null || true
rm -f /tmp/fillfile* 2>/dev/null || true

echo "4️⃣ Bandwidth Issues Experiment - Rate Limiting and Packet Loss"
echo "----------------------------------------------------------------"
echo "This experiment will limit bandwidth and add packet loss"

if command_exists tc; then
    tc qdisc add dev eth0 root netem delay 250ms loss 10% rate 1mbps
    echo "✅ Bandwidth issues started - Check dashboard for latency and throughput issues"
else
    echo "⚠️  tc command not available, skipping bandwidth issues"
fi

wait_for_confirmation

# Cleanup bandwidth issues
if command_exists tc; then
    tc qdisc del dev eth0 root 2>/dev/null || true
fi

echo "5️⃣ Random Network Loss Experiment - 10% Packet Drop"
echo "----------------------------------------------------"
echo "This experiment will randomly drop 10% of incoming packets"

if command_exists iptables; then
    iptables -A INPUT -m statistic --mode random --probability 0.1 -j DROP
    echo "✅ Random network loss started - Check dashboard for connection issues"
else
    echo "⚠️  iptables not available, skipping random network loss"
fi

wait_for_confirmation

# Cleanup random network loss
if command_exists iptables; then
    iptables -D INPUT -m statistic --mode random --probability 0.1 -j DROP 2>/dev/null || true
fi

echo "6️⃣ Server Killing Experiment - Process Termination"
echo "---------------------------------------------------"
echo "This experiment will kill one of the server processes"

echo "Current running server processes:"
ps aux | grep -E "(node.*server|pm2)" | grep -v grep || echo "No server processes found"

echo "Killing server processes..."
pkill -f "node.*server" 2>/dev/null || true
pkill -f "pm2.*server" 2>/dev/null || true

echo "✅ Server killing completed - Check dashboard for server status changes"
wait_for_confirmation

echo "🎯 Chaos Testing Experiments Completed!"
echo "========================================"
echo ""
echo "📊 Dashboard Summary:"
echo "- CPU Chaos: Should show high CPU usage spikes"
echo "- Network Corruption: Should show increased latency"
echo "- Disk Fill: Should show high disk usage"
echo "- Bandwidth Issues: Should show network performance degradation"
echo "- Random Network Loss: Should show connection failures"
echo "- Server Killing: Should show server status as failed"
echo ""
echo "🔍 Check the monitoring dashboard at http://localhost:3000"
echo "to see how the system responded to these chaos experiments."
echo ""
echo "🧹 Cleanup will be performed automatically when this script exits." 