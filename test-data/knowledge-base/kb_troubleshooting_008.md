# Troubleshooting: Memory Leak

## Overview
This document provides troubleshooting guidance for memory leak issues in our infrastructure.

## Common Symptoms
- memory usage high
- oom killer
- gc pressure

## Affected Systems
- java app
- nodejs app
- python app
- container

## Best Practices
1. Monitor memory leak metrics continuously
2. Set up appropriate alerting thresholds
3. Maintain documentation for common scenarios
4. Regular system health checks
5. Proactive capacity planning

## Troubleshooting Steps
1. Check system metrics and logs
2. Identify root cause using diagnostic tools
3. Apply appropriate resolution procedure
4. Verify fix and monitor for recurrence
5. Document lessons learned

## Related Procedures
- Emergency response for critical alerts
- Standard resolution procedures
- Escalation guidelines
- Post-incident review process

## Tools and Commands
- `htop`
- `iostat`
- `netstat`
- `ss`
- `lsof`

## Contact Information
For escalation: sre-oncall@company.com

---
*Last updated: 7/31/2025*
*Maintained by: DevOps Team*
