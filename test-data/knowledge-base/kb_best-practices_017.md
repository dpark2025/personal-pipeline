# Best Practices: Database Slow

## Overview
This document provides best practices guidance for database slow issues in our infrastructure.

## Common Symptoms
- query timeout
- connection pool full
- lock timeout

## Affected Systems
- mysql
- postgres
- redis
- mongodb

## Best Practices
1. Monitor database slow metrics continuously
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
- `mysql`
- `psql`
- `redis-cli`
- `mongo`
- `htop`

## Contact Information
For escalation: sre-oncall@company.com

---
*Last updated: 7/29/2025*
*Maintained by: DevOps Team*
