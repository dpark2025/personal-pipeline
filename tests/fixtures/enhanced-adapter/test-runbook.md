---
author: SRE Team
tags: [disk-space, critical, linux]
created: 2024-01-15
updated: 2024-07-28
---

# Disk Space Emergency Response

This runbook provides step-by-step procedures for handling critical disk space alerts.

## Overview

When disk usage exceeds 95%, immediate action is required to prevent system instability.

## Immediate Actions

1. **Check disk usage**: `df -h`
2. **Identify large files**: `du -sh /* | sort -hr | head -10`
3. **Clean temporary files**: `rm -rf /tmp/*`
4. **Rotate logs**: `logrotate -f /etc/logrotate.conf`

## Escalation

If disk usage remains above 90% after cleanup, escalate to Level 2 support.