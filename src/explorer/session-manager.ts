/**
 * Session Management Module for Enhanced MCP Tool Explorer
 * 
 * Authored by: Backend Technical Lead Agent
 * Date: 2025-08-15
 * 
 * Manages command history, favorites, and session persistence with
 * intelligent storage and retrieval capabilities.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Favorite {
  id: string;
  toolName: string;
  parameters: any;
  timestamp: Date;
  nickname?: string;
  description?: string;
  tags?: string[];
  usageCount: number;
  lastUsed: Date;
}

interface SessionData {
  history: string[];
  favorites: Favorite[];
  settings: SessionSettings;
  analytics: SessionAnalytics;
  version: string;
  lastSaved: Date;
}

interface SessionSettings {
  maxHistorySize: number;
  maxFavorites: number;
  autoSave: boolean;
  showTips: boolean;
  defaultView: 'list' | 'table' | 'compact';
}

interface SessionAnalytics {
  totalSessions: number;
  totalCommands: number;
  averageSessionDuration: number;
  mostUsedTools: Record<string, number>;
  sessionStartTime: Date;
}

/**
 * Session management with persistence and intelligent organization
 */
export class SessionManager {
  private sessionData: SessionData;
  private sessionFile: string;
  private sessionStartTime: Date;

  constructor() {
    this.sessionStartTime = new Date();
    this.sessionFile = path.join(__dirname, '../../.session', 'explorer-session.json');
    this.sessionData = this.getDefaultSessionData();
  }

  /**
   * Load session data from persistent storage
   */
  async loadSession(): Promise<void> {
    try {
      // Ensure session directory exists
      const sessionDir = path.dirname(this.sessionFile);
      await fs.mkdir(sessionDir, { recursive: true });

      // Try to load existing session
      const data = await fs.readFile(this.sessionFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Validate and migrate session data
      this.sessionData = this.migrateSessionData(parsed);
      this.sessionData.analytics.sessionStartTime = this.sessionStartTime;
      this.sessionData.analytics.totalSessions++;
      
      console.log(chalk.gray(`📂 Session loaded: ${this.sessionData.history.length} commands, ${this.sessionData.favorites.length} favorites`));
      
    } catch (error) {
      // First time or corrupted session, start fresh
      this.sessionData = this.getDefaultSessionData();
      console.log(chalk.gray('📂 Starting new session'));
    }
  }

  /**
   * Save session data to persistent storage
   */
  async saveSession(): Promise<void> {
    try {
      this.sessionData.lastSaved = new Date();
      this.updateSessionAnalytics();
      
      const sessionDir = path.dirname(this.sessionFile);
      await fs.mkdir(sessionDir, { recursive: true });
      
      await fs.writeFile(this.sessionFile, JSON.stringify(this.sessionData, null, 2));
      console.log(chalk.gray('💾 Session saved'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to save session:'), (error as Error).message);
    }
  }

  /**
   * Add command to history
   */
  addToHistory(command: string): void {
    if (!command.trim()) return;
    
    // Remove duplicate if it's the same as the last command
    if (this.sessionData.history.length > 0 && 
        this.sessionData.history[this.sessionData.history.length - 1] === command) {
      return;
    }
    
    this.sessionData.history.push(command);
    this.sessionData.analytics.totalCommands++;
    
    // Keep history within limits
    if (this.sessionData.history.length > this.sessionData.settings.maxHistorySize) {
      this.sessionData.history = this.sessionData.history.slice(-this.sessionData.settings.maxHistorySize);
    }
    
    // Auto-save if enabled
    if (this.sessionData.settings.autoSave) {
      this.saveSession().catch(() => {}); // Silent fail for auto-save
    }
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return [...this.sessionData.history];
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.sessionData.history = [];
  }

  /**
   * Add tool call to favorites
   */
  addToFavorites(toolName: string, parameters: any, nickname?: string, description?: string): void {
    const favorite: Favorite = {
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
    
    // Check for duplicates
    const existingIndex = this.sessionData.favorites.findIndex(fav => 
      fav.toolName === toolName && 
      JSON.stringify(fav.parameters) === JSON.stringify(parameters)
    );
    
    if (existingIndex >= 0) {
      // Update existing favorite
      this.sessionData.favorites[existingIndex]!.usageCount++;
      this.sessionData.favorites[existingIndex]!.lastUsed = new Date();
      if (nickname) this.sessionData.favorites[existingIndex]!.nickname = nickname;
      if (description) this.sessionData.favorites[existingIndex]!.description = description;
    } else {
      // Add new favorite
      this.sessionData.favorites.push(favorite);
      
      // Keep favorites within limits (remove oldest least used)
      if (this.sessionData.favorites.length > this.sessionData.settings.maxFavorites) {
        this.sessionData.favorites.sort((a, b) => 
          (a.usageCount + a.lastUsed.getTime() / 1000000) - 
          (b.usageCount + b.lastUsed.getTime() / 1000000)
        );
        this.sessionData.favorites = this.sessionData.favorites.slice(1);
      }
    }
    
    // Auto-save if enabled
    if (this.sessionData.settings.autoSave) {
      this.saveSession().catch(() => {});
    }
  }

  /**
   * Get favorites list
   */
  getFavorites(): Favorite[] {
    // Sort by usage frequency and recency
    return this.sessionData.favorites.sort((a, b) => {
      const scoreA = a.usageCount * 1000 + a.lastUsed.getTime() / 1000000;
      const scoreB = b.usageCount * 1000 + b.lastUsed.getTime() / 1000000;
      return scoreB - scoreA;
    });
  }

  /**
   * Remove favorite by ID
   */
  removeFavorite(id: string): boolean {
    const index = this.sessionData.favorites.findIndex(fav => fav.id === id);
    if (index >= 0) {
      this.sessionData.favorites.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Update favorite nickname/description
   */
  updateFavorite(id: string, updates: Partial<Pick<Favorite, 'nickname' | 'description' | 'tags'>>): boolean {
    const favorite = this.sessionData.favorites.find(fav => fav.id === id);
    if (favorite) {
      Object.assign(favorite, updates);
      return true;
    }
    return false;
  }

  /**
   * Search favorites by tool name, tags, or description
   */
  searchFavorites(query: string): Favorite[] {
    const searchTerm = query.toLowerCase();
    return this.sessionData.favorites.filter(fav => 
      fav.toolName.toLowerCase().includes(searchTerm) ||
      fav.nickname?.toLowerCase().includes(searchTerm) ||
      fav.description?.toLowerCase().includes(searchTerm) ||
      fav.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get favorites by tool name
   */
  getFavoritesByTool(toolName: string): Favorite[] {
    return this.sessionData.favorites.filter(fav => fav.toolName === toolName);
  }

  /**
   * Get session settings
   */
  getSettings(): SessionSettings {
    return { ...this.sessionData.settings };
  }

  /**
   * Update session settings
   */
  updateSettings(updates: Partial<SessionSettings>): void {
    Object.assign(this.sessionData.settings, updates);
  }

  /**
   * Get session analytics
   */
  getAnalytics(): SessionAnalytics {
    this.updateSessionAnalytics();
    return { ...this.sessionData.analytics };
  }

  /**
   * Clear all session data
   */
  async clearSession(): Promise<void> {
    this.sessionData = this.getDefaultSessionData();
    try {
      await fs.unlink(this.sessionFile);
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }

  /**
   * Export session data
   */
  async exportSession(filePath?: string): Promise<string> {
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

  /**
   * Import session data
   */
  async importSession(filePath: string): Promise<void> {
    const data = await fs.readFile(filePath, 'utf-8');
    const importedData = JSON.parse(data);
    
    // Merge with existing data
    this.sessionData.history.push(...(importedData.history || []));
    this.sessionData.favorites.push(...(importedData.favorites || []));
    
    // Remove duplicates and apply limits
    this.sessionData.history = [...new Set(this.sessionData.history)]
      .slice(-this.sessionData.settings.maxHistorySize);
    
    this.dedupeFavorites();
    
    await this.saveSession();
  }

  /**
   * Get usage statistics for tools
   */
  getToolUsageStats(): Record<string, { count: number; lastUsed: Date }> {
    const stats: Record<string, { count: number; lastUsed: Date }> = {};
    
    this.sessionData.favorites.forEach(fav => {
      if (!stats[fav.toolName]) {
        stats[fav.toolName] = { count: 0, lastUsed: new Date(0) };
      }
      stats[fav.toolName]!.count += fav.usageCount;
      if (fav.lastUsed > stats[fav.toolName]!.lastUsed) {
        stats[fav.toolName]!.lastUsed = fav.lastUsed;
      }
    });
    
    return stats;
  }

  /**
   * Generate auto-tags based on tool and parameters
   */
  private generateAutoTags(toolName: string, parameters: any): string[] {
    const tags: string[] = [toolName];
    
    // Add parameter-based tags
    Object.entries(parameters).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length < 20) {
        tags.push(value);
      }
      if (typeof value === 'boolean') {
        tags.push(`${key}:${value}`);
      }
    });
    
    // Add semantic tags
    if (toolName.includes('search')) tags.push('search');
    if (toolName.includes('get')) tags.push('retrieval');
    if (toolName.includes('escalation')) tags.push('escalation');
    if (toolName.includes('procedure')) tags.push('procedure');
    
    return tags.slice(0, 10); // Limit to 10 tags
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get default session data
   */
  private getDefaultSessionData(): SessionData {
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

  /**
   * Migrate session data from older versions
   */
  private migrateSessionData(data: any): SessionData {
    const defaultData = this.getDefaultSessionData();
    
    // Basic structure migration
    const migrated: SessionData = {
      history: data.history || [],
      favorites: (data.favorites || []).map((fav: any) => ({
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

  /**
   * Update session analytics
   */
  private updateSessionAnalytics(): void {
    const sessionDuration = Date.now() - this.sessionStartTime.getTime();
    
    this.sessionData.analytics.averageSessionDuration = 
      (this.sessionData.analytics.averageSessionDuration * (this.sessionData.analytics.totalSessions - 1) + sessionDuration) / 
      this.sessionData.analytics.totalSessions;
    
    // Update most used tools
    this.sessionData.favorites.forEach(fav => {
      this.sessionData.analytics.mostUsedTools[fav.toolName] = 
        (this.sessionData.analytics.mostUsedTools[fav.toolName] || 0) + fav.usageCount;
    });
  }

  /**
   * Remove duplicate favorites
   */
  private dedupeFavorites(): void {
    const seen = new Set<string>();
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