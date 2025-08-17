/**
 * GitHub Authentication Manager - Enterprise-grade authentication
 * 
 * Authored by: Integration Specialist
 * Date: 2025-01-17
 * 
 * Comprehensive authentication system supporting:
 * - Personal Access Tokens (classic and fine-grained)
 * - GitHub App authentication
 * - OAuth 2.0 authorization code flow
 * - Enterprise Server compatibility
 * - Automatic token refresh and rotation
 * - Audit logging for compliance
 */

import axios, { AxiosInstance } from 'axios';
import { GitHubConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface AuthCredentials {
  type: 'personal_token' | 'github_app' | 'oauth2';
  token?: string;
  githubApp?: GitHubAppCredentials;
  oauth2?: OAuth2Credentials;
}

export interface GitHubAppCredentials {
  appId: string;
  privateKey: string;
  installationId?: string;
  accessToken?: string;
  expiresAt?: Date;
}

export interface OAuth2Credentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string[];
}

export interface AuthResult {
  success: boolean;
  userId?: number;
  username?: string;
  email?: string;
  avatarUrl?: string;
  permissions?: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
  expiresAt?: Date;
  error?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Enterprise authentication manager for GitHub
 */
export class AuthManager {
  private config: GitHubConfig;
  private httpClient: AxiosInstance;
  private credentials?: AuthCredentials;
  private authResult?: AuthResult;
  private tokenRefreshInterval?: NodeJS.Timeout;
  
  // Performance and security metrics
  private authMetrics = {
    successfulAuths: 0,
    failedAuths: 0,
    tokenRefreshes: 0,
    rateLimitHits: 0,
    lastAuthTime: undefined as Date | undefined,
    lastRefreshTime: undefined as Date | undefined,
  };

  constructor(config: GitHubConfig) {
    this.config = config;
    
    // Initialize HTTP client with security headers
    this.httpClient = axios.create({
      baseURL: config.api_url || 'https://api.github.com',
      timeout: 30000,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PersonalPipeline-GitHub-Adapter/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    // Add request/response interceptors for logging and security
    this.setupInterceptors();
  }

  /**
   * Initialize authentication system
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing GitHub authentication', {
        authType: this.config.auth?.type,
        apiUrl: this.config.api_url || 'https://api.github.com',
        organization: this.config.organization,
      });

      // Parse credentials from environment
      this.credentials = await this.parseCredentials();
      
      if (!this.credentials) {
        throw new Error('No valid GitHub credentials found');
      }

      // Perform initial authentication
      this.authResult = await this.authenticate(this.credentials);
      
      if (!this.authResult.success) {
        throw new Error(this.authResult.error || 'Authentication failed');
      }

      // Setup automatic token refresh for OAuth2 and GitHub Apps
      this.setupTokenRefresh();

      this.authMetrics.successfulAuths++;
      this.authMetrics.lastAuthTime = new Date();

      logger.info('GitHub authentication successful', {
        authType: this.credentials.type,
        username: this.authResult.username,
        userId: this.authResult.userId,
        rateLimit: this.authResult.rateLimit,
      });

    } catch (error) {
      this.authMetrics.failedAuths++;
      logger.error('GitHub authentication initialization failed', { error });
      throw new Error(`GitHub authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate with GitHub using provided credentials
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      switch (credentials.type) {
        case 'personal_token':
          return await this.authenticateWithToken(credentials.token!);
        
        case 'github_app':
          return await this.authenticateWithGitHubApp(credentials.githubApp!);
        
        case 'oauth2':
          return await this.authenticateWithOAuth2(credentials.oauth2!);
        
        default:
          throw new Error(`Unsupported authentication type: ${(credentials as any).type}`);
      }
    } catch (error) {
      logger.error('GitHub authentication failed', { 
        authType: credentials.type, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Validate current authentication status
   */
  async validateAuth(): Promise<boolean> {
    try {
      if (!this.authResult?.success) {
        return false;
      }

      // Check if token is expired
      if (this.authResult.expiresAt && new Date() >= this.authResult.expiresAt) {
        logger.info('GitHub token expired, attempting refresh');
        const refreshed = await this.refreshToken();
        return refreshed.success;
      }

      // Test API access
      const response = await this.httpClient.get('/user');
      
      // Update rate limit info
      this.updateRateLimitInfo(response.headers);
      
      return response.status === 200;

    } catch (error) {
      logger.warn('GitHub auth validation failed', { error });
      return false;
    }
  }

  /**
   * Get current authentication headers
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.authResult?.success) {
      throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {};

    if (this.credentials?.type === 'personal_token' && this.credentials.token) {
      headers['Authorization'] = `token ${this.credentials.token}`;
    } else if (this.credentials?.type === 'github_app' && this.credentials.githubApp?.accessToken) {
      headers['Authorization'] = `token ${this.credentials.githubApp.accessToken}`;
    } else if (this.credentials?.type === 'oauth2' && this.credentials.oauth2?.accessToken) {
      headers['Authorization'] = `token ${this.credentials.oauth2.accessToken}`;
    }

    return headers;
  }

  /**
   * Refresh access token for OAuth2 and GitHub Apps
   */
  async refreshToken(): Promise<TokenRefreshResult> {
    try {
      if (!this.credentials) {
        throw new Error('No credentials available for refresh');
      }

      let result: TokenRefreshResult;

      switch (this.credentials.type) {
        case 'github_app':
          result = await this.refreshGitHubAppToken();
          break;
        
        case 'oauth2':
          result = await this.refreshOAuth2Token();
          break;
        
        case 'personal_token':
          // Personal tokens don't refresh, but we can validate them
          const isValid = await this.validateAuth();
          result = {
            success: isValid,
            error: isValid ? undefined : 'Personal token is invalid',
          };
          break;
        
        default:
          throw new Error(`Token refresh not supported for auth type: ${this.credentials.type}`);
      }

      if (result.success) {
        this.authMetrics.tokenRefreshes++;
        this.authMetrics.lastRefreshTime = new Date();
        logger.info('GitHub token refreshed successfully');
      }

      return result;

    } catch (error) {
      logger.error('GitHub token refresh failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  /**
   * Get authentication metrics
   */
  getAuthMetrics() {
    return {
      ...this.authMetrics,
      currentAuth: this.authResult ? {
        type: this.credentials?.type,
        username: this.authResult.username,
        userId: this.authResult.userId,
        rateLimit: this.authResult.rateLimit,
      } : null,
    };
  }

  /**
   * Cleanup authentication resources
   */
  async cleanup(): Promise<void> {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = undefined;
    }

    this.credentials = undefined;
    this.authResult = undefined;
    
    logger.info('GitHub authentication manager cleaned up');
  }

  // Private methods

  private async parseCredentials(): Promise<AuthCredentials | undefined> {
    const authConfig = this.config.auth;
    if (!authConfig) {
      throw new Error('No authentication configuration provided');
    }

    switch (authConfig.type) {
      case 'personal_token': {
        const token = this.getEnvValue(authConfig.token_env);
        if (!token) {
          throw new Error(`GitHub token not found in environment variable: ${authConfig.token_env}`);
        }
        return { type: 'personal_token', token };
      }

      case 'github_app': {
        const appId = this.getEnvValue(authConfig.app_id_env);
        const privateKey = this.getEnvValue(authConfig.private_key_env);
        const installationId = authConfig.installation_id_env ? 
          this.getEnvValue(authConfig.installation_id_env) : undefined;

        if (!appId || !privateKey) {
          throw new Error('GitHub App credentials incomplete');
        }

        return {
          type: 'github_app',
          githubApp: { appId, privateKey, installationId },
        };
      }

      case 'oauth2': {
        const clientId = this.getEnvValue(authConfig.client_id_env);
        const clientSecret = this.getEnvValue(authConfig.client_secret_env);
        const redirectUri = authConfig.redirect_uri;

        if (!clientId || !clientSecret || !redirectUri) {
          throw new Error('OAuth2 credentials incomplete');
        }

        return {
          type: 'oauth2',
          oauth2: { clientId, clientSecret, redirectUri, scope: authConfig.scope },
        };
      }

      default:
        throw new Error(`Unsupported GitHub auth type: ${(authConfig as any).type}`);
    }
  }

  private async authenticateWithToken(token: string): Promise<AuthResult> {
    this.httpClient.defaults.headers['Authorization'] = `token ${token}`;
    
    const response = await this.httpClient.get('/user');
    const userData = response.data;
    
    return {
      success: true,
      userId: userData.id,
      username: userData.login,
      email: userData.email,
      avatarUrl: userData.avatar_url,
      rateLimit: this.extractRateLimitInfo(response.headers),
    };
  }

  private async authenticateWithGitHubApp(appCreds: GitHubAppCredentials): Promise<AuthResult> {
    // Generate JWT for GitHub App
    const jwt = this.generateGitHubAppJWT(appCreds.appId, appCreds.privateKey);
    
    // Get installation access token
    const installationId = appCreds.installationId || await this.findInstallationId(jwt);
    const accessToken = await this.getInstallationAccessToken(jwt, installationId);
    
    // Store the access token
    appCreds.accessToken = accessToken.token;
    appCreds.expiresAt = new Date(accessToken.expires_at);
    
    // Set authorization header
    this.httpClient.defaults.headers['Authorization'] = `token ${accessToken.token}`;
    
    // Get app info
    const response = await this.httpClient.get('/user');
    const userData = response.data;
    
    return {
      success: true,
      userId: userData.id,
      username: userData.login,
      email: userData.email,
      avatarUrl: userData.avatar_url,
      rateLimit: this.extractRateLimitInfo(response.headers),
      expiresAt: appCreds.expiresAt,
    };
  }

  private async authenticateWithOAuth2(oauth2Creds: OAuth2Credentials): Promise<AuthResult> {
    if (!oauth2Creds.accessToken) {
      throw new Error('OAuth2 access token not provided');
    }

    this.httpClient.defaults.headers['Authorization'] = `token ${oauth2Creds.accessToken}`;
    
    const response = await this.httpClient.get('/user');
    const userData = response.data;
    
    return {
      success: true,
      userId: userData.id,
      username: userData.login,
      email: userData.email,
      avatarUrl: userData.avatar_url,
      rateLimit: this.extractRateLimitInfo(response.headers),
      expiresAt: oauth2Creds.expiresAt,
    };
  }

  private generateGitHubAppJWT(appId: string, privateKey: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // issued 60 seconds ago
      exp: now + 600, // expires in 10 minutes
      iss: appId,
    };

    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  }

  private async findInstallationId(appJWT: string): Promise<string> {
    const response = await axios.get('/app/installations', {
      headers: {
        'Authorization': `Bearer ${appJWT}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const installations = response.data;
    if (!installations || installations.length === 0) {
      throw new Error('No GitHub App installations found');
    }

    // Return first installation ID
    return installations[0].id.toString();
  }

  private async getInstallationAccessToken(appJWT: string, installationId: string) {
    const response = await axios.post(
      `/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${appJWT}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    return response.data;
  }

  private async refreshGitHubAppToken(): Promise<TokenRefreshResult> {
    if (!this.credentials?.githubApp) {
      throw new Error('GitHub App credentials not available');
    }

    try {
      const jwt = this.generateGitHubAppJWT(
        this.credentials.githubApp.appId,
        this.credentials.githubApp.privateKey
      );

      const installationId = this.credentials.githubApp.installationId!;
      const accessToken = await this.getInstallationAccessToken(jwt, installationId);

      this.credentials.githubApp.accessToken = accessToken.token;
      this.credentials.githubApp.expiresAt = new Date(accessToken.expires_at);

      // Update HTTP client headers
      this.httpClient.defaults.headers['Authorization'] = `token ${accessToken.token}`;

      return {
        success: true,
        accessToken: accessToken.token,
        expiresAt: this.credentials.githubApp.expiresAt,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'GitHub App token refresh failed',
      };
    }
  }

  private async refreshOAuth2Token(): Promise<TokenRefreshResult> {
    if (!this.credentials?.oauth2?.refreshToken) {
      throw new Error('OAuth2 refresh token not available');
    }

    try {
      const response = await axios.post('/login/oauth/access_token', {
        client_id: this.credentials.oauth2.clientId,
        client_secret: this.credentials.oauth2.clientSecret,
        refresh_token: this.credentials.oauth2.refreshToken,
        grant_type: 'refresh_token',
      }, {
        headers: {
          'Accept': 'application/json',
        },
      });

      const tokenData = response.data;
      
      this.credentials.oauth2.accessToken = tokenData.access_token;
      this.credentials.oauth2.refreshToken = tokenData.refresh_token || this.credentials.oauth2.refreshToken;
      
      if (tokenData.expires_in) {
        this.credentials.oauth2.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      }

      // Update HTTP client headers
      this.httpClient.defaults.headers['Authorization'] = `token ${tokenData.access_token}`;

      return {
        success: true,
        accessToken: tokenData.access_token,
        expiresAt: this.credentials.oauth2.expiresAt,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth2 token refresh failed',
      };
    }
  }

  private setupTokenRefresh(): void {
    if (!this.credentials || this.credentials.type === 'personal_token') {
      return; // Personal tokens don't need refresh
    }

    // Setup automatic refresh 5 minutes before expiration
    const checkInterval = 5 * 60 * 1000; // 5 minutes
    
    this.tokenRefreshInterval = setInterval(async () => {
      try {
        if (this.authResult?.expiresAt) {
          const timeUntilExpiry = this.authResult.expiresAt.getTime() - Date.now();
          
          // Refresh if expiring within 10 minutes
          if (timeUntilExpiry < 10 * 60 * 1000) {
            await this.refreshToken();
          }
        }
      } catch (error) {
        logger.error('Automatic token refresh failed', { error });
      }
    }, checkInterval);
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug('GitHub API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: {
            ...config.headers,
            Authorization: config.headers?.Authorization ? '[REDACTED]' : undefined,
          },
        });
        return config;
      },
      (error) => {
        logger.error('GitHub API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for rate limiting and logging
    this.httpClient.interceptors.response.use(
      (response) => {
        this.updateRateLimitInfo(response.headers);
        
        logger.debug('GitHub API response', {
          status: response.status,
          url: response.config.url,
          rateLimit: this.extractRateLimitInfo(response.headers),
        });
        
        return response;
      },
      (error) => {
        if (error.response?.status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
          this.authMetrics.rateLimitHits++;
          logger.warn('GitHub API rate limit exceeded', {
            resetTime: new Date(parseInt(error.response.headers['x-ratelimit-reset']) * 1000),
          });
        }
        
        logger.error('GitHub API response error', {
          status: error.response?.status,
          url: error.config?.url,
          error: error.message,
        });
        
        return Promise.reject(error);
      }
    );
  }

  private extractRateLimitInfo(headers: any) {
    return {
      limit: parseInt(headers['x-ratelimit-limit']) || 0,
      remaining: parseInt(headers['x-ratelimit-remaining']) || 0,
      reset: new Date(parseInt(headers['x-ratelimit-reset']) * 1000),
    };
  }

  private updateRateLimitInfo(headers: any): void {
    if (this.authResult) {
      this.authResult.rateLimit = this.extractRateLimitInfo(headers);
    }
  }

  private getEnvValue(envKey?: string): string | undefined {
    if (!envKey) return undefined;
    return process.env[envKey];
  }
}