import chalk from 'chalk';
export class PerformanceAnalytics {
    requests = [];
    maxRecords = 10000;
    thresholds = {
        excellent: 100,
        good: 300,
        warning: 500,
        critical: 500
    };
    constructor() {
    }
    recordRequest(tool, responseTime, success, error, parameters) {
        const record = {
            id: this.generateId(),
            tool,
            timestamp: new Date(),
            responseTime,
            success,
            ...(error && { error }),
            ...(parameters && { parameters })
        };
        this.requests.push(record);
        if (this.requests.length > this.maxRecords) {
            this.requests = this.requests.slice(-this.maxRecords);
        }
    }
    getTotalRequests() {
        return this.requests.length;
    }
    getAverageResponseTime() {
        if (this.requests.length === 0)
            return 0;
        const total = this.requests.reduce((sum, req) => sum + req.responseTime, 0);
        return total / this.requests.length;
    }
    getSuccessRate() {
        if (this.requests.length === 0)
            return 1;
        const successful = this.requests.filter(req => req.success).length;
        return successful / this.requests.length;
    }
    getToolStats() {
        const stats = {};
        this.requests.forEach(req => {
            if (!stats[req.tool]) {
                stats[req.tool] = {
                    calls: 0,
                    successfulCalls: 0,
                    failedCalls: 0,
                    totalResponseTime: 0,
                    avgTime: 0,
                    minTime: Infinity,
                    maxTime: 0,
                    successRate: 0,
                    lastUsed: new Date(0),
                    errors: []
                };
            }
            const toolStats = stats[req.tool];
            toolStats.calls++;
            toolStats.totalResponseTime += req.responseTime;
            if (req.success) {
                toolStats.successfulCalls++;
            }
            else {
                toolStats.failedCalls++;
                if (req.error && !toolStats.errors.includes(req.error)) {
                    toolStats.errors.push(req.error);
                }
            }
            toolStats.minTime = Math.min(toolStats.minTime, req.responseTime);
            toolStats.maxTime = Math.max(toolStats.maxTime, req.responseTime);
            if (req.timestamp > toolStats.lastUsed) {
                toolStats.lastUsed = req.timestamp;
            }
        });
        Object.values(stats).forEach(toolStats => {
            toolStats.avgTime = toolStats.totalResponseTime / toolStats.calls;
            toolStats.successRate = toolStats.successfulCalls / toolStats.calls;
            if (toolStats.minTime === Infinity)
                toolStats.minTime = 0;
        });
        return stats;
    }
    getRecentActivity(limit = 20) {
        return this.requests
            .slice(-limit)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    getPerformanceTrends(periodType = 'hour') {
        const trends = [];
        const now = new Date();
        const periods = this.getPeriods(periodType, now);
        periods.forEach(period => {
            const periodRequests = this.requests.filter(req => req.timestamp >= period.start && req.timestamp < period.end);
            if (periodRequests.length > 0) {
                const avgResponseTime = periodRequests.reduce((sum, req) => sum + req.responseTime, 0) / periodRequests.length;
                const successCount = periodRequests.filter(req => req.success).length;
                const successRate = successCount / periodRequests.length;
                trends.push({
                    period: period.label,
                    avgResponseTime,
                    successRate,
                    requestCount: periodRequests.length
                });
            }
        });
        return trends;
    }
    getPerformanceInsights() {
        const insights = [];
        const toolStats = this.getToolStats();
        const recentRequests = this.getRecentActivity(100);
        const avgResponseTime = this.getAverageResponseTime();
        const successRate = this.getSuccessRate();
        if (avgResponseTime > this.thresholds.warning) {
            insights.push(`⚠️  Average response time (${avgResponseTime.toFixed(1)}ms) exceeds warning threshold`);
        }
        else if (avgResponseTime < this.thresholds.excellent) {
            insights.push(`✅ Excellent average response time (${avgResponseTime.toFixed(1)}ms)`);
        }
        if (successRate < 0.9) {
            insights.push(`🚨 Success rate (${(successRate * 100).toFixed(1)}%) is below 90%`);
        }
        else if (successRate >= 0.99) {
            insights.push(`🌟 Outstanding success rate (${(successRate * 100).toFixed(1)}%)`);
        }
        Object.entries(toolStats).forEach(([tool, stats]) => {
            if (stats.avgTime > this.thresholds.critical) {
                insights.push(`🐌 ${tool} is consistently slow (${stats.avgTime.toFixed(1)}ms avg)`);
            }
            if (stats.successRate < 0.8) {
                insights.push(`❌ ${tool} has low success rate (${(stats.successRate * 100).toFixed(1)}%)`);
            }
            if (stats.calls > 50 && stats.avgTime < this.thresholds.excellent) {
                insights.push(`⚡ ${tool} is performing excellently (${stats.avgTime.toFixed(1)}ms avg)`);
            }
        });
        const recentFailures = recentRequests.filter(req => !req.success);
        if (recentFailures.length > recentRequests.length * 0.2) {
            insights.push(`📈 Recent failure rate is elevated (${recentFailures.length}/${recentRequests.length})`);
        }
        Object.entries(toolStats).forEach(([tool, stats]) => {
            const variance = stats.maxTime - stats.minTime;
            if (variance > 1000) {
                insights.push(`📊 ${tool} shows high response time variance (${stats.minTime}ms - ${stats.maxTime}ms)`);
            }
        });
        return insights;
    }
    getPerformanceSummary() {
        const toolStats = this.getToolStats();
        const recentActivity = this.getRecentActivity(50);
        const toolEntries = Object.entries(toolStats);
        const topPerformers = toolEntries
            .filter(([, stats]) => stats.calls >= 5)
            .sort((a, b) => a[1].avgTime - b[1].avgTime)
            .slice(0, 3)
            .map(([tool, stats]) => ({
            tool,
            avgTime: stats.avgTime,
            successRate: stats.successRate,
            calls: stats.calls
        }));
        const slowest = toolEntries
            .sort((a, b) => b[1].avgTime - a[1].avgTime)
            .slice(0, 3)
            .map(([tool, stats]) => ({
            tool,
            avgTime: stats.avgTime,
            maxTime: stats.maxTime,
            calls: stats.calls
        }));
        const mostUsed = toolEntries
            .sort((a, b) => b[1].calls - a[1].calls)
            .slice(0, 5)
            .map(([tool, stats]) => ({
            tool,
            calls: stats.calls,
            avgTime: stats.avgTime,
            successRate: stats.successRate
        }));
        const recentFailures = recentActivity
            .filter(req => !req.success)
            .slice(0, 5)
            .map(req => ({
            tool: req.tool,
            error: req.error,
            timestamp: req.timestamp,
            responseTime: req.responseTime
        }));
        return {
            overview: {
                totalRequests: this.getTotalRequests(),
                avgResponseTime: this.getAverageResponseTime(),
                successRate: this.getSuccessRate(),
                uniqueTools: Object.keys(toolStats).length
            },
            topPerformers,
            slowest,
            mostUsed,
            recentFailures
        };
    }
    exportData() {
        return {
            summary: this.getPerformanceSummary(),
            toolStats: this.getToolStats(),
            recentActivity: this.getRecentActivity(100),
            trends: this.getPerformanceTrends(),
            insights: this.getPerformanceInsights(),
            thresholds: this.thresholds,
            exportedAt: new Date()
        };
    }
    reset() {
        this.requests = [];
    }
    getPerformanceRating(responseTime) {
        if (responseTime < this.thresholds.excellent) {
            return { rating: 'excellent', color: 'green', emoji: '🚀' };
        }
        else if (responseTime < this.thresholds.good) {
            return { rating: 'good', color: 'cyan', emoji: '✅' };
        }
        else if (responseTime < this.thresholds.warning) {
            return { rating: 'warning', color: 'yellow', emoji: '⚠️' };
        }
        else {
            return { rating: 'critical', color: 'red', emoji: '🐌' };
        }
    }
    formatResponseTime(responseTime) {
        const rating = this.getPerformanceRating(responseTime);
        const chalkFunction = chalk[rating.color];
        return chalkFunction(`${responseTime}ms ${rating.emoji}`);
    }
    formatSuccessRate(successRate) {
        if (successRate >= 0.95) {
            return chalk.green(`${(successRate * 100).toFixed(1)}% 🌟`);
        }
        else if (successRate >= 0.9) {
            return chalk.cyan(`${(successRate * 100).toFixed(1)}% ✅`);
        }
        else if (successRate >= 0.8) {
            return chalk.yellow(`${(successRate * 100).toFixed(1)}% ⚠️`);
        }
        else {
            return chalk.red(`${(successRate * 100).toFixed(1)}% ❌`);
        }
    }
    formatRequestCount(count) {
        if (count > 1000) {
            return chalk.cyan(`${(count / 1000).toFixed(1)}K requests`);
        }
        else if (count > 100) {
            return chalk.blue(`${count} requests`);
        }
        else if (count > 10) {
            return chalk.gray(`${count} requests`);
        }
        else {
            return chalk.gray(`${count} request${count === 1 ? '' : 's'}`);
        }
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    getPeriods(periodType, now) {
        const periods = [];
        let maxPeriods = 0;
        let duration = 0;
        let labelFormat = '';
        switch (periodType) {
            case 'hour':
                maxPeriods = 24;
                duration = 60 * 60 * 1000;
                labelFormat = 'HH:00';
                break;
            case 'day':
                maxPeriods = 7;
                duration = 24 * 60 * 60 * 1000;
                labelFormat = 'MMM DD';
                break;
            case 'week':
                maxPeriods = 4;
                duration = 7 * 24 * 60 * 60 * 1000;
                labelFormat = 'Week of MMM DD';
                break;
        }
        for (let i = maxPeriods - 1; i >= 0; i--) {
            const end = new Date(now.getTime() - (i * duration));
            const start = new Date(end.getTime() - duration);
            periods.push({
                start,
                end,
                label: this.formatPeriodLabel(start, labelFormat) || 'Unknown'
            });
        }
        return periods;
    }
    formatPeriodLabel(date, format) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        switch (format) {
            case 'HH:00':
                return `${date.getHours().toString().padStart(2, '0')}:00`;
            case 'MMM DD':
                return `${months[date.getMonth()]} ${date.getDate()}`;
            case 'Week of MMM DD':
                return `Week of ${months[date.getMonth()]} ${date.getDate()}`;
            default:
                return date.toISOString().split('T')[0] || 'Unknown';
        }
    }
}
//# sourceMappingURL=performance-analytics.js.map