# Network Connectivity Troubleshooting

## Overview
Comprehensive network troubleshooting procedures for connectivity issues.

## Alert Criteria
- **Alert Type**: network_down, packet_loss, dns_failure
- **Severity**: Critical (total outage), High (>10% packet loss)
- **Affected Systems**: Network infrastructure, DNS servers, gateways

## Network Diagnostics

### Step 1: Basic Connectivity
```bash
# Test local interface
ping -c 4 127.0.0.1

# Test gateway connectivity
ping -c 4 $(route -n | grep 'UG' | awk '{print $2}')

# Test external connectivity
ping -c 4 8.8.8.8
```

### Step 2: DNS Resolution
```bash
# Test DNS resolution
nslookup google.com
dig @8.8.8.8 google.com

# Check local DNS configuration
cat /etc/resolv.conf
```

### Step 3: Network Path Analysis
```bash
# Trace network path
traceroute google.com

# Check for packet loss
mtr -r -c 10 google.com

# Analyze network interfaces
ip addr show
ip route show
```

## Common Fixes

### DNS Issues
```bash
# Flush DNS cache
sudo systemctl restart systemd-resolved

# Temporary DNS override
echo "nameserver 8.8.8.8" > /etc/resolv.conf
```

### Interface Problems
```bash
# Restart network interface
sudo ifdown eth0 && sudo ifup eth0

# Reset network stack
sudo systemctl restart networking
```

### Routing Issues
```bash
# Add default route
sudo route add default gw 192.168.1.1

# Check routing table
netstat -rn
```

## Escalation Points
- Multiple network paths affected
- ISP-level connectivity issues
- Hardware failure suspected
- Security incident suspected

## Recovery Verification
- [ ] All interfaces operational
- [ ] DNS resolution working
- [ ] Internal connectivity restored
- [ ] External connectivity confirmed
- [ ] Services responding normally

## Prevention Measures
1. Network monitoring enhancement
2. Redundant path configuration
3. DNS server redundancy
4. Regular connectivity testing
