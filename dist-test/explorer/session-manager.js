import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class SessionManager {
    sessionData;
    sessionFile;
    sessionStartTime;
    constructor() {
        this.sessionStartTime = new Date();
        this.sessionFile = path.join(__dirname, '../../.session', 'explorer-session.json');
        this.sessionData = this.getDefaultSessionData();
    }
    async loadSession() {
        try {
            const sessionDir = path.dirname(this.sessionFile);
            await fs.mkdir(sessionDir, { recursive: true });
            const data = await fs.readFile(this.sessionFile, 'utf-8');
            const parsed = JSON.parse(data);
            this.sessionData = this.migrateSessionData(parsed);
            this.sessionData.analytics.sessionStartTime = this.sessionStartTime;
            this.sessionData.analytics.totalSessions++;
            console.log(chalk.gray(`📂 Session loaded: ${this.sessionData.history.length} commands, ${this.sessionData.favorites.length} favorites`));
        }
        catch (error) {
            this.sessionData = this.getDefaultSessionData();
            console.log(chalk.gray('📂 Starting new session'));
        }
    }
    async saveSession() {
        try {
            this.sessionData.lastSaved = new Date();
            this.updateSessionAnalytics();
            const sessionDir = path.dirname(this.sessionFile);
            await fs.mkdir(sessionDir, { recursive: true });
            await fs.writeFile(this.sessionFile, JSON.stringify(this.sessionData, null, 2));
            console.log(chalk.gray('💾 Session saved'));
        }
        catch (error) {
            console.error(chalk.red('❌ Failed to save session:'), error.message);
        }
    }
    addToHistory(command) {
        if (!command.trim())
            return;
        if (this.sessionData.history.length > 0 &&
            this.sessionData.history[this.sessionData.history.length - 1] === command) {
            return;
        }
        this.sessionData.history.push(command);
        this.sessionData.analytics.totalCommands++;
        if (this.sessionData.history.length > this.sessionData.settings.maxHistorySize) {
            this.sessionData.history = this.sessionData.history.slice(-this.sessionData.settings.maxHistorySize);
        }
        if (this.sessionData.settings.autoSave) {
            this.saveSession().catch(() => { });
        }
    }
    getHistory() {
        return [...this.sessionData.history];
    }
    clearHistory() {
        this.sessionData.history = [];
    }
    addToFavorites(toolName, parameters, nickname, description) {
        const favorite = {
            id: this.generateId(),
            toolName,
            parameters,
            timestamp: new Date(),
            ...(nickname && { nickname }),
            ...(description && { description }),
            tags: this.generateAutoTags(toolName, parameters),
            usageCount: 1,
            lastUsed: new Date(),
        };
        const existingIndex = this.sessionData.favorites.findIndex(fav => fav.toolName === toolName &&
            JSON.stringify(fav.parameters) === JSON.stringify(parameters));
        if (existingIndex >= 0) {
            this.sessionData.favorites[existingIndex].usageCount++;
            this.sessionData.favorites[existingIndex].lastUsed = new Date();
            if (nickname)
                this.sessionData.favorites[existingIndex].nickname = nickname;
            if (description)
                this.sessionData.favorites[existingIndex].description = description;
        }
        else {
            this.sessionData.favorites.push(favorite);
            if (this.sessionData.favorites.length > this.sessionData.settings.maxFavorites) {
                this.sessionData.favorites.sort((a, b) => (a.usageCount + a.lastUsed.getTime() / 1000000) -
                    (b.usageCount + b.lastUsed.getTime() / 1000000));
                this.sessionData.favorites = this.sessionData.favorites.slice(1);
            }
        }
        if (this.sessionData.settings.autoSave) {
            this.saveSession().catch(() => { });
        }
    }
    getFavorites() {
        return this.sessionData.favorites.sort((a, b) => {
            const scoreA = a.usageCount * 1000 + a.lastUsed.getTime() / 1000000;
            const scoreB = b.usageCount * 1000 + b.lastUsed.getTime() / 1000000;
            return scoreB - scoreA;
        });
    }
    removeFavorite(id) {
        const index = this.sessionData.favorites.findIndex(fav => fav.id === id);
        if (index >= 0) {
            this.sessionData.favorites.splice(index, 1);
            return true;
        }
        return false;
    }
    updateFavorite(id, updates) {
        const favorite = this.sessionData.favorites.find(fav => fav.id === id);
        if (favorite) {
            Object.assign(favorite, updates);
            return true;
        }
        return false;
    }
    searchFavorites(query) {
        const searchTerm = query.toLowerCase();
        return this.sessionData.favorites.filter(fav => fav.toolName.toLowerCase().includes(searchTerm) ||
            fav.nickname?.toLowerCase().includes(searchTerm) ||
            fav.description?.toLowerCase().includes(searchTerm) ||
            fav.tags?.some(tag => tag.toLowerCase().includes(searchTerm)));
    }
    getFavoritesByTool(toolName) {
        return this.sessionData.favorites.filter(fav => fav.toolName === toolName);
    }
    getSettings() {
        return { ...this.sessionData.settings };
    }
    updateSettings(updates) {
        Object.assign(this.sessionData.settings, updates);
    }
    getAnalytics() {
        this.updateSessionAnalytics();
        return { ...this.sessionData.analytics };
    }
    async clearSession() {
        this.sessionData = this.getDefaultSessionData();
        try {
            await fs.unlink(this.sessionFile);
        }
        catch (error) {
        }
    }
    async exportSession(filePath) {
        const exportPath = filePath || path.join(__dirname, '../../exports', `session-export-${Date.now()}.json`);
        const exportData = {
            ...this.sessionData,
            exportedAt: new Date(),
            version: this.sessionData.version,
        };
        const exportDir = path.dirname(exportPath);
        await fs.mkdir(exportDir, { recursive: true });
        await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
        return exportPath;
    }
    async importSession(filePath) {
        const data = await fs.readFile(filePath, 'utf-8');
        const importedData = JSON.parse(data);
        this.sessionData.history.push(...(importedData.history || []));
        this.sessionData.favorites.push(...(importedData.favorites || []));
        this.sessionData.history = [...new Set(this.sessionData.history)]
            .slice(-this.sessionData.settings.maxHistorySize);
        this.dedupeFavorites();
        await this.saveSession();
    }
    getToolUsageStats() {
        const stats = {};
        this.sessionData.favorites.forEach(fav => {
            if (!stats[fav.toolName]) {
                stats[fav.toolName] = { count: 0, lastUsed: new Date(0) };
            }
            stats[fav.toolName].count += fav.usageCount;
            if (fav.lastUsed > stats[fav.toolName].lastUsed) {
                stats[fav.toolName].lastUsed = fav.lastUsed;
            }
        });
        return stats;
    }
    generateAutoTags(toolName, parameters) {
        const tags = [toolName];
        Object.entries(parameters).forEach(([key, value]) => {
            if (typeof value === 'string' && value.length < 20) {
                tags.push(value);
            }
            if (typeof value === 'boolean') {
                tags.push(`${key}:${value}`);
            }
        });
        if (toolName.includes('search'))
            tags.push('search');
        if (toolName.includes('get'))
            tags.push('retrieval');
        if (toolName.includes('escalation'))
            tags.push('escalation');
        if (toolName.includes('procedure'))
            tags.push('procedure');
        return tags.slice(0, 10);
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    getDefaultSessionData() {
        return {
            history: [],
            favorites: [],
            settings: {
                maxHistorySize: 1000,
                maxFavorites: 100,
                autoSave: true,
                showTips: true,
                defaultView: 'list',
            },
            analytics: {
                totalSessions: 0,
                totalCommands: 0,
                averageSessionDuration: 0,
                mostUsedTools: {},
                sessionStartTime: this.sessionStartTime,
            },
            version: '2.0.0',
            lastSaved: new Date(),
        };
    }
    migrateSessionData(data) {
        const defaultData = this.getDefaultSessionData();
        const migrated = {
            history: data.history || [],
            favorites: (data.favorites || []).map((fav) => ({
                id: fav.id || this.generateId(),
                toolName: fav.toolName || fav.tool,
                parameters: fav.parameters || {},
                timestamp: new Date(fav.timestamp || Date.now()),
                nickname: fav.nickname,
                description: fav.description,
                tags: fav.tags || [],
                usageCount: fav.usageCount || 1,
                lastUsed: new Date(fav.lastUsed || fav.timestamp || Date.now()),
            })),
            settings: { ...defaultData.settings, ...(data.settings || {}) },
            analytics: { ...defaultData.analytics, ...(data.analytics || {}) },
            version: data.version || '1.0.0',
            lastSaved: new Date(data.lastSaved || Date.now()),
        };
        return migrated;
    }
    updateSessionAnalytics() {
        const sessionDuration = Date.now() - this.sessionStartTime.getTime();
        this.sessionData.analytics.averageSessionDuration =
            (this.sessionData.analytics.averageSessionDuration * (this.sessionData.analytics.totalSessions - 1) + sessionDuration) /
                this.sessionData.analytics.totalSessions;
        this.sessionData.favorites.forEach(fav => {
            this.sessionData.analytics.mostUsedTools[fav.toolName] =
                (this.sessionData.analytics.mostUsedTools[fav.toolName] || 0) + fav.usageCount;
        });
    }
    dedupeFavorites() {
        const seen = new Set();
        this.sessionData.favorites = this.sessionData.favorites.filter(fav => {
            const key = `${fav.toolName}:${JSON.stringify(fav.parameters)}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}
//# sourceMappingURL=session-manager.js.map