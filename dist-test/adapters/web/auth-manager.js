import axios from 'axios';
export class AuthManager {
    logger;
    config;
    httpClient;
    cachedCredentials = new Map();
    refreshTimers = new Map();
    oauthTokens = new Map();
    tokenRefreshPromises = new Map();
    constructor(config, logger) {
        this.config = config;
        this.logger = logger.child({ component: 'AuthManager' });
        this.httpClient = axios.create({
            timeout: 10000,
            headers: {
                'User-Agent': 'PersonalPipeline-WebAdapter/1.0',
                'Content-Type': 'application/json'
            }
        });
    }
    async initialize() {
        this.logger.info('Initializing authentication manager', {
            authType: this.config.type
        });
        try {
            switch (this.config.type) {
                case 'oauth2':
                    await this.initializeOAuth2();
                    break;
                case 'bearer_token':
                    await this.initializeBearerToken();
                    break;
                case 'api_key':
                case 'basic_auth':
                case 'custom':
                case 'none':
                    break;
                default:
                    throw new Error(`Unsupported authentication type: ${this.config.type}`);
            }
            this.logger.info('Authentication manager initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize authentication manager', {
                error: error.message,
                authType: this.config.type
            });
            throw error;
        }
    }
    async getAuthHeaders(authOverride) {
        const authConfig = authOverride ? { ...this.config, ...authOverride } : this.config;
        const configKey = this.getConfigKey(authConfig);
        const cached = this.cachedCredentials.get(configKey);
        if (cached && this.isCredentialValid(cached)) {
            return cached.headers;
        }
        const result = await this.authenticate(authConfig);
        if (!result.success || !result.credentials) {
            throw new Error(`Authentication failed: ${result.error}`);
        }
        this.cachedCredentials.set(configKey, result.credentials);
        if (result.expiresAt) {
            this.scheduleTokenRefresh(configKey, authConfig, result.expiresAt);
        }
        return result.credentials.headers;
    }
    async healthCheck() {
        try {
            const result = await this.authenticate(this.config);
            return result.success;
        }
        catch (error) {
            this.logger.warn('Authentication health check failed', {
                error: error.message
            });
            return false;
        }
    }
    async cleanup() {
        this.logger.info('Cleaning up authentication manager');
        this.refreshTimers.forEach(timer => clearTimeout(timer));
        this.refreshTimers.clear();
        this.cachedCredentials.clear();
        this.oauthTokens.clear();
        this.tokenRefreshPromises.clear();
        this.logger.info('Authentication manager cleanup completed');
    }
    async authenticate(config) {
        try {
            switch (config.type) {
                case 'none':
                    return { success: true, credentials: { type: 'none', headers: {}, queryParams: {} } };
                case 'api_key':
                    return this.authenticateApiKey(config);
                case 'bearer_token':
                    return this.authenticateBearerToken(config);
                case 'basic_auth':
                    return this.authenticateBasicAuth(config);
                case 'oauth2':
                    return await this.authenticateOAuth2(config);
                case 'custom':
                    return this.authenticateCustom(config);
                default:
                    return {
                        success: false,
                        error: `Unsupported authentication type: ${config.type}`
                    };
            }
        }
        catch (error) {
            this.logger.error('Authentication failed', {
                authType: config.type,
                error: error.message
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    authenticateApiKey(config) {
        if (!config.api_key) {
            return { success: false, error: 'API key configuration missing' };
        }
        const { location, name, env_var, prefix } = config.api_key;
        const apiKey = process.env[env_var];
        if (!apiKey) {
            return { success: false, error: `Environment variable ${env_var} not found` };
        }
        const keyValue = prefix ? `${prefix} ${apiKey}` : apiKey;
        const credentials = {
            type: 'api_key',
            headers: {},
            queryParams: {}
        };
        switch (location) {
            case 'header':
                credentials.headers[name] = keyValue;
                break;
            case 'query':
                credentials.queryParams[name] = keyValue;
                break;
            case 'body':
                credentials.headers['X-API-Key-Body'] = JSON.stringify({ [name]: keyValue });
                break;
            default:
                return { success: false, error: `Invalid API key location: ${location}` };
        }
        return { success: true, credentials };
    }
    authenticateBearerToken(config) {
        if (!config.bearer_token) {
            return { success: false, error: 'Bearer token configuration missing' };
        }
        const token = process.env[config.bearer_token.env_var];
        if (!token) {
            return { success: false, error: `Environment variable ${config.bearer_token.env_var} not found` };
        }
        const credentials = {
            type: 'bearer_token',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            queryParams: {}
        };
        let expiresAt;
        if (config.bearer_token.refresh_interval_minutes) {
            expiresAt = Date.now() + (config.bearer_token.refresh_interval_minutes * 60 * 1000);
            credentials.expiresAt = expiresAt;
        }
        return {
            success: true,
            credentials,
            expiresAt
        };
    }
    authenticateBasicAuth(config) {
        if (!config.basic_auth) {
            return { success: false, error: 'Basic auth configuration missing' };
        }
        const username = process.env[config.basic_auth.username_env];
        const password = process.env[config.basic_auth.password_env];
        if (!username || !password) {
            return {
                success: false,
                error: `Environment variables ${config.basic_auth.username_env} or ${config.basic_auth.password_env} not found`
            };
        }
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');
        return {
            success: true,
            credentials: {
                type: 'basic_auth',
                headers: {
                    'Authorization': `Basic ${credentials}`
                },
                queryParams: {}
            }
        };
    }
    async authenticateOAuth2(config) {
        if (!config.oauth2) {
            return { success: false, error: 'OAuth2 configuration missing' };
        }
        const configKey = this.getConfigKey(config);
        const cachedToken = this.oauthTokens.get(configKey);
        if (cachedToken && this.isOAuth2TokenValid(cachedToken)) {
            return {
                success: true,
                credentials: {
                    type: 'oauth2',
                    headers: {
                        'Authorization': `${cachedToken.token_type} ${cachedToken.access_token}`
                    },
                    queryParams: {},
                    expiresAt: Date.now() + (cachedToken.expires_in * 1000)
                },
                expiresAt: Date.now() + (cachedToken.expires_in * 1000)
            };
        }
        const existingRefresh = this.tokenRefreshPromises.get(configKey);
        if (existingRefresh) {
            const token = await existingRefresh;
            return this.createOAuth2Credentials(token);
        }
        const refreshPromise = this.requestOAuth2Token(config.oauth2);
        this.tokenRefreshPromises.set(configKey, refreshPromise);
        try {
            const token = await refreshPromise;
            this.oauthTokens.set(configKey, token);
            return this.createOAuth2Credentials(token);
        }
        finally {
            this.tokenRefreshPromises.delete(configKey);
        }
    }
    authenticateCustom(config) {
        if (!config.custom) {
            return { success: false, error: 'Custom auth configuration missing' };
        }
        const credentials = {
            type: 'custom',
            headers: {},
            queryParams: {}
        };
        if (config.custom.headers) {
            Object.assign(credentials.headers, config.custom.headers);
        }
        if (config.custom.header_envs) {
            for (const [headerName, envVar] of Object.entries(config.custom.header_envs)) {
                const value = process.env[envVar];
                if (value) {
                    credentials.headers[headerName] = value;
                }
                else {
                    this.logger.warn('Environment variable not found for custom auth header', {
                        headerName,
                        envVar
                    });
                }
            }
        }
        if (config.custom.query_params) {
            Object.assign(credentials.queryParams, config.custom.query_params);
        }
        if (config.custom.query_envs) {
            for (const [paramName, envVar] of Object.entries(config.custom.query_envs)) {
                const value = process.env[envVar];
                if (value) {
                    credentials.queryParams[paramName] = value;
                }
                else {
                    this.logger.warn('Environment variable not found for custom auth query param', {
                        paramName,
                        envVar
                    });
                }
            }
        }
        return { success: true, credentials };
    }
    async initializeOAuth2() {
        if (!this.config.oauth2) {
            throw new Error('OAuth2 configuration missing');
        }
        try {
            const token = await this.requestOAuth2Token(this.config.oauth2);
            const configKey = this.getConfigKey(this.config);
            this.oauthTokens.set(configKey, token);
            this.logger.info('OAuth2 authentication initialized successfully');
        }
        catch (error) {
            throw new Error(`OAuth2 initialization failed: ${error.message}`);
        }
    }
    async initializeBearerToken() {
        if (!this.config.bearer_token) {
            throw new Error('Bearer token configuration missing');
        }
        const token = process.env[this.config.bearer_token.env_var];
        if (!token) {
            throw new Error(`Environment variable ${this.config.bearer_token.env_var} not found`);
        }
        this.logger.info('Bearer token authentication initialized successfully');
    }
    async requestOAuth2Token(oauth2Config) {
        const clientId = process.env[oauth2Config.client_id_env];
        const clientSecret = process.env[oauth2Config.client_secret_env];
        if (!clientId || !clientSecret) {
            throw new Error(`OAuth2 environment variables ${oauth2Config.client_id_env} or ${oauth2Config.client_secret_env} not found`);
        }
        const tokenRequest = {
            grant_type: oauth2Config.grant_type,
            client_id: clientId,
            client_secret: clientSecret,
            scope: oauth2Config.scope
        };
        this.logger.debug('Requesting OAuth2 token', {
            endpoint: oauth2Config.token_endpoint,
            grantType: oauth2Config.grant_type,
            scope: oauth2Config.scope
        });
        try {
            const response = await this.httpClient.post(oauth2Config.token_endpoint, tokenRequest);
            if (response.status !== 200) {
                throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
            }
            const token = response.data;
            if (!token.access_token) {
                throw new Error('OAuth2 response missing access_token');
            }
            this.logger.debug('OAuth2 token obtained successfully', {
                tokenType: token.token_type,
                expiresIn: token.expires_in
            });
            return token;
        }
        catch (error) {
            if (error.response) {
                this.logger.error('OAuth2 token request failed', {
                    status: error.response.status,
                    data: error.response.data
                });
                throw new Error(`OAuth2 token request failed: ${error.response.status} ${error.response.statusText}`);
            }
            throw error;
        }
    }
    createOAuth2Credentials(token) {
        const expiresAt = Date.now() + (token.expires_in * 1000);
        return {
            success: true,
            credentials: {
                type: 'oauth2',
                headers: {
                    'Authorization': `${token.token_type} ${token.access_token}`
                },
                queryParams: {},
                expiresAt
            },
            expiresAt
        };
    }
    isCredentialValid(credentials) {
        if (!credentials.expiresAt) {
            return true;
        }
        return Date.now() < credentials.expiresAt;
    }
    isOAuth2TokenValid(token) {
        const expiryBuffer = 5 * 60 * 1000;
        const expiresAt = Date.now() + (token.expires_in * 1000);
        return Date.now() < (expiresAt - expiryBuffer);
    }
    scheduleTokenRefresh(configKey, config, expiresAt) {
        const existingTimer = this.refreshTimers.get(configKey);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        const refreshTime = expiresAt - Date.now() - (5 * 60 * 1000);
        if (refreshTime > 0) {
            const timer = setTimeout(async () => {
                try {
                    this.logger.info('Refreshing authentication credentials', {
                        configKey,
                        authType: config.type
                    });
                    const result = await this.authenticate(config);
                    if (result.success && result.credentials) {
                        this.cachedCredentials.set(configKey, result.credentials);
                        if (result.expiresAt) {
                            this.scheduleTokenRefresh(configKey, config, result.expiresAt);
                        }
                    }
                    else {
                        this.logger.error('Failed to refresh authentication credentials', {
                            configKey,
                            error: result.error
                        });
                    }
                }
                catch (error) {
                    this.logger.error('Error during credential refresh', {
                        configKey,
                        error: error.message
                    });
                }
            }, refreshTime);
            this.refreshTimers.set(configKey, timer);
        }
    }
    getConfigKey(config) {
        const keyParts = [config.type];
        switch (config.type) {
            case 'api_key':
                if (config.api_key) {
                    keyParts.push(config.api_key.env_var, config.api_key.location, config.api_key.name);
                }
                break;
            case 'bearer_token':
                if (config.bearer_token) {
                    keyParts.push(config.bearer_token.env_var);
                }
                break;
            case 'basic_auth':
                if (config.basic_auth) {
                    keyParts.push(config.basic_auth.username_env, config.basic_auth.password_env);
                }
                break;
            case 'oauth2':
                if (config.oauth2) {
                    keyParts.push(config.oauth2.client_id_env, config.oauth2.token_endpoint);
                }
                break;
            case 'custom':
                if (config.custom) {
                    keyParts.push(JSON.stringify(config.custom));
                }
                break;
        }
        return keyParts.join(':');
    }
}
//# sourceMappingURL=auth-manager.js.map