import{_ as n,c as a,o as l,ag as o}from"./chunks/framework.DV2-evBA.js";const u=JSON.parse('{"title":"Installation Guide","description":"","frontmatter":{},"headers":[],"relativePath":"guides/installation.md","filePath":"guides/installation.md"}'),p={name:"guides/installation.md"};function e(t,s,c,r,i,y){return l(),a("div",null,s[0]||(s[0]=[o(`<h1 id="installation-guide" tabindex="-1">Installation Guide <a class="header-anchor" href="#installation-guide" aria-label="Permalink to &quot;Installation Guide&quot;">​</a></h1><p>Get Personal Pipeline running in your environment with this comprehensive installation guide.</p><h2 id="quick-start" tabindex="-1">Quick Start <a class="header-anchor" href="#quick-start" aria-label="Permalink to &quot;Quick Start&quot;">​</a></h2><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Install from local registry</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> install</span><span style="color:#032F62;"> @personal-pipeline/mcp-server</span><span style="color:#005CC5;"> --registry</span><span style="color:#032F62;"> http://localhost:4873</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or using Docker</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 3000:3000</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h2 id="prerequisites" tabindex="-1">Prerequisites <a class="header-anchor" href="#prerequisites" aria-label="Permalink to &quot;Prerequisites&quot;">​</a></h2><h3 id="system-requirements" tabindex="-1">System Requirements <a class="header-anchor" href="#system-requirements" aria-label="Permalink to &quot;System Requirements&quot;">​</a></h3><ul><li><strong>Node.js</strong>: 18.0+ (LTS recommended)</li><li><strong>npm</strong>: 8.0+ or yarn 1.22+</li><li><strong>Memory</strong>: 512MB minimum, 2GB recommended</li><li><strong>Disk</strong>: 1GB free space for installation</li><li><strong>Network</strong>: Internet access for initial setup</li></ul><h3 id="optional-dependencies" tabindex="-1">Optional Dependencies <a class="header-anchor" href="#optional-dependencies" aria-label="Permalink to &quot;Optional Dependencies&quot;">​</a></h3><ul><li><strong>Docker</strong>: 20.10+ for container deployment</li><li><strong>Redis</strong>: 6.0+ for enhanced caching (optional)</li><li><strong>Git</strong>: For source code installation</li></ul><h2 id="installation-methods" tabindex="-1">Installation Methods <a class="header-anchor" href="#installation-methods" aria-label="Permalink to &quot;Installation Methods&quot;">​</a></h2><h3 id="method-1-npm-package-recommended" tabindex="-1">Method 1: npm Package (Recommended) <a class="header-anchor" href="#method-1-npm-package-recommended" aria-label="Permalink to &quot;Method 1: npm Package (Recommended)&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Install from local registry</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> install</span><span style="color:#032F62;"> @personal-pipeline/mcp-server</span><span style="color:#005CC5;"> --registry</span><span style="color:#032F62;"> http://localhost:4873</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or install globally</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> install</span><span style="color:#005CC5;"> -g</span><span style="color:#032F62;"> @personal-pipeline/mcp-server</span><span style="color:#005CC5;"> --registry</span><span style="color:#032F62;"> http://localhost:4873</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Verify installation</span></span>
<span class="line"><span style="color:#6F42C1;">personal-pipeline</span><span style="color:#005CC5;"> --version</span></span></code></pre></div><h3 id="method-2-docker-container" tabindex="-1">Method 2: Docker Container <a class="header-anchor" href="#method-2-docker-container" aria-label="Permalink to &quot;Method 2: Docker Container&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Pull latest image</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> pull</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Run with default configuration</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 3000:3000</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Run with custom configuration</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 3000:3000</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -v</span><span style="color:#24292E;"> $(</span><span style="color:#005CC5;">pwd</span><span style="color:#24292E;">)</span><span style="color:#032F62;">/config:/app/config</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#032F62;">  localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h3 id="method-3-source-code" tabindex="-1">Method 3: Source Code <a class="header-anchor" href="#method-3-source-code" aria-label="Permalink to &quot;Method 3: Source Code&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Clone repository</span></span>
<span class="line"><span style="color:#6F42C1;">git</span><span style="color:#032F62;"> clone</span><span style="color:#032F62;"> https://github.com/your-username/personal-pipeline-mcp.git</span></span>
<span class="line"><span style="color:#005CC5;">cd</span><span style="color:#032F62;"> personal-pipeline-mcp</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Install dependencies</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> install</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Build application</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> build</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Start server</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> start</span></span></code></pre></div><h2 id="configuration" tabindex="-1">Configuration <a class="header-anchor" href="#configuration" aria-label="Permalink to &quot;Configuration&quot;">​</a></h2><h3 id="basic-configuration" tabindex="-1">Basic Configuration <a class="header-anchor" href="#basic-configuration" aria-label="Permalink to &quot;Basic Configuration&quot;">​</a></h3><p>Create a configuration file at <code>config/config.yaml</code>:</p><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">server</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  port</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3000</span></span>
<span class="line"><span style="color:#22863A;">  host</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;0.0.0.0&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;local-docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;filesystem&quot;</span></span>
<span class="line"><span style="color:#22863A;">    path</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;./docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;5m&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;memory&quot;</span></span>
<span class="line"><span style="color:#22863A;">  ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">300</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;info&quot;</span></span>
<span class="line"><span style="color:#22863A;">  format</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;json&quot;</span></span></code></pre></div><h3 id="environment-variables" tabindex="-1">Environment Variables <a class="header-anchor" href="#environment-variables" aria-label="Permalink to &quot;Environment Variables&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Server configuration</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> PORT</span><span style="color:#D73A49;">=</span><span style="color:#005CC5;">3000</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> HOST</span><span style="color:#D73A49;">=</span><span style="color:#005CC5;">0.0.0.0</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> NODE_ENV</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">production</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Configuration file</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> CONFIG_FILE</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">./config/config.yaml</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Logging</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> LOG_LEVEL</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">info</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> LOG_FORMAT</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">json</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Redis (optional)</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> REDIS_URL</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">redis://localhost:6379</span></span></code></pre></div><h2 id="verification" tabindex="-1">Verification <a class="header-anchor" href="#verification" aria-label="Permalink to &quot;Verification&quot;">​</a></h2><h3 id="health-check" tabindex="-1">Health Check <a class="header-anchor" href="#health-check" aria-label="Permalink to &quot;Health Check&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Check server health</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:3000/health</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Expected response:</span></span>
<span class="line"><span style="color:#24292E;">{</span></span>
<span class="line"><span style="color:#6F42C1;">  &quot;status&quot;</span><span style="color:#005CC5;">:</span><span style="color:#032F62;"> &quot;healthy&quot;,</span></span>
<span class="line"><span style="color:#6F42C1;">  &quot;version&quot;</span><span style="color:#005CC5;">:</span><span style="color:#032F62;"> &quot;0.1.0&quot;,</span></span>
<span class="line"><span style="color:#6F42C1;">  &quot;uptime&quot;</span><span style="color:#005CC5;">:</span><span style="color:#032F62;"> 123.45,</span></span>
<span class="line"><span style="color:#6F42C1;">  &quot;timestamp&quot;</span><span style="color:#005CC5;">:</span><span style="color:#032F62;"> &quot;2025-08-16T10:30:00.000Z&quot;</span></span>
<span class="line"><span style="color:#24292E;">}</span></span></code></pre></div><h3 id="mcp-tools-test" tabindex="-1">MCP Tools Test <a class="header-anchor" href="#mcp-tools-test" aria-label="Permalink to &quot;MCP Tools Test&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Test MCP tools</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> test-mcp</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or manually test search</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -X</span><span style="color:#032F62;"> POST</span><span style="color:#032F62;"> http://localhost:3000/api/search</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -H</span><span style="color:#032F62;"> &quot;Content-Type: application/json&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -d</span><span style="color:#032F62;"> &#39;{&quot;query&quot;: &quot;runbook&quot;, &quot;limit&quot;: 5}&#39;</span></span></code></pre></div><h2 id="post-installation-setup" tabindex="-1">Post-Installation Setup <a class="header-anchor" href="#post-installation-setup" aria-label="Permalink to &quot;Post-Installation Setup&quot;">​</a></h2><h3 id="_1-configure-sources" tabindex="-1">1. Configure Sources <a class="header-anchor" href="#_1-configure-sources" aria-label="Permalink to &quot;1. Configure Sources&quot;">​</a></h3><p>Add your documentation sources to <code>config/config.yaml</code>:</p><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;confluence&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;confluence&quot;</span></span>
<span class="line"><span style="color:#22863A;">    base_url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;https://company.atlassian.net/wiki&quot;</span></span>
<span class="line"><span style="color:#22863A;">    auth</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;bearer_token&quot;</span></span>
<span class="line"><span style="color:#22863A;">      token_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;CONFLUENCE_TOKEN&quot;</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;github-docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;github&quot;</span></span>
<span class="line"><span style="color:#22863A;">    repository</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;company/docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    auth</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;token&quot;</span></span>
<span class="line"><span style="color:#22863A;">      token_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;GITHUB_TOKEN&quot;</span></span></code></pre></div><h3 id="_2-set-up-authentication" tabindex="-1">2. Set Up Authentication <a class="header-anchor" href="#_2-set-up-authentication" aria-label="Permalink to &quot;2. Set Up Authentication&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Set environment variables</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> CONFLUENCE_TOKEN</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">your_confluence_token</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> GITHUB_TOKEN</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">your_github_token</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or create .env file</span></span>
<span class="line"><span style="color:#005CC5;">echo</span><span style="color:#032F62;"> &quot;CONFLUENCE_TOKEN=your_confluence_token&quot;</span><span style="color:#D73A49;"> &gt;</span><span style="color:#032F62;"> .env</span></span>
<span class="line"><span style="color:#005CC5;">echo</span><span style="color:#032F62;"> &quot;GITHUB_TOKEN=your_github_token&quot;</span><span style="color:#D73A49;"> &gt;&gt;</span><span style="color:#032F62;"> .env</span></span></code></pre></div><h3 id="_3-initialize-cache" tabindex="-1">3. Initialize Cache <a class="header-anchor" href="#_3-initialize-cache" aria-label="Permalink to &quot;3. Initialize Cache&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Start with Redis for better performance</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -d</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 6379:6379</span><span style="color:#032F62;"> redis:alpine</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Update configuration for Redis</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> REDIS_URL</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">redis://localhost:6379</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Restart Personal Pipeline</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> restart</span></span></code></pre></div><h3 id="_4-load-documentation" tabindex="-1">4. Load Documentation <a class="header-anchor" href="#_4-load-documentation" aria-label="Permalink to &quot;4. Load Documentation&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Index existing documentation</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> index-docs</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Verify indexing</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:3000/api/sources</span></span></code></pre></div><h2 id="troubleshooting" tabindex="-1">Troubleshooting <a class="header-anchor" href="#troubleshooting" aria-label="Permalink to &quot;Troubleshooting&quot;">​</a></h2><h3 id="common-issues" tabindex="-1">Common Issues <a class="header-anchor" href="#common-issues" aria-label="Permalink to &quot;Common Issues&quot;">​</a></h3><p><strong>Port already in use:</strong></p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Find process using port 3000</span></span>
<span class="line"><span style="color:#6F42C1;">lsof</span><span style="color:#005CC5;"> -i</span><span style="color:#032F62;"> :3000</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Kill process or change port</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> PORT</span><span style="color:#D73A49;">=</span><span style="color:#005CC5;">3001</span></span></code></pre></div><p><strong>Configuration file not found:</strong></p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Verify file exists</span></span>
<span class="line"><span style="color:#6F42C1;">ls</span><span style="color:#005CC5;"> -la</span><span style="color:#032F62;"> config/config.yaml</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Use absolute path</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> CONFIG_FILE</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">/full/path/to/config.yaml</span></span></code></pre></div><p><strong>Permission errors:</strong></p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Fix file permissions</span></span>
<span class="line"><span style="color:#6F42C1;">chmod</span><span style="color:#005CC5;"> 644</span><span style="color:#032F62;"> config/config.yaml</span></span>
<span class="line"><span style="color:#6F42C1;">chmod</span><span style="color:#005CC5;"> 755</span><span style="color:#24292E;"> $(</span><span style="color:#005CC5;">which</span><span style="color:#032F62;"> personal-pipeline</span><span style="color:#24292E;">)</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or run with specific user</span></span>
<span class="line"><span style="color:#6F42C1;">sudo</span><span style="color:#005CC5;"> -u</span><span style="color:#032F62;"> nodejs</span><span style="color:#032F62;"> personal-pipeline</span></span></code></pre></div><p><strong>Memory issues:</strong></p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Increase Node.js memory limit</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> NODE_OPTIONS</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;--max-old-space-size=2048&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or use Docker with memory limit</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> --memory=1g</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h3 id="getting-help" tabindex="-1">Getting Help <a class="header-anchor" href="#getting-help" aria-label="Permalink to &quot;Getting Help&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># View help</span></span>
<span class="line"><span style="color:#6F42C1;">personal-pipeline</span><span style="color:#005CC5;"> --help</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Check logs</span></span>
<span class="line"><span style="color:#6F42C1;">tail</span><span style="color:#005CC5;"> -f</span><span style="color:#032F62;"> logs/app.log</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Enable debug logging</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> DEBUG</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">personal-pipeline:</span><span style="color:#D73A49;">*</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> LOG_LEVEL</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">debug</span></span></code></pre></div><h2 id="production-deployment" tabindex="-1">Production Deployment <a class="header-anchor" href="#production-deployment" aria-label="Permalink to &quot;Production Deployment&quot;">​</a></h2><h3 id="docker-compose" tabindex="-1">Docker Compose <a class="header-anchor" href="#docker-compose" aria-label="Permalink to &quot;Docker Compose&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">version</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;3.8&#39;</span></span>
<span class="line"><span style="color:#22863A;">services</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  personal-pipeline</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;3000:3000&quot;</span></span>
<span class="line"><span style="color:#22863A;">    environment</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      NODE_ENV</span><span style="color:#24292E;">: </span><span style="color:#032F62;">production</span></span>
<span class="line"><span style="color:#22863A;">      REDIS_URL</span><span style="color:#24292E;">: </span><span style="color:#032F62;">redis://redis:6379</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./config:/app/config:ro</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">logs:/app/logs</span></span>
<span class="line"><span style="color:#22863A;">    depends_on</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">redis</span></span>
<span class="line"><span style="color:#22863A;">    restart</span><span style="color:#24292E;">: </span><span style="color:#032F62;">unless-stopped</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">  redis</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">redis:alpine</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">redis-data:/data</span></span>
<span class="line"><span style="color:#22863A;">    restart</span><span style="color:#24292E;">: </span><span style="color:#032F62;">unless-stopped</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  logs</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  redis-data</span><span style="color:#24292E;">:</span></span></code></pre></div><h3 id="systemd-service" tabindex="-1">Systemd Service <a class="header-anchor" href="#systemd-service" aria-label="Permalink to &quot;Systemd Service&quot;">​</a></h3><div class="language-ini"><button title="Copy Code" class="copy"></button><span class="lang">ini</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># /etc/systemd/system/personal-pipeline.service</span></span>
<span class="line"><span style="color:#6F42C1;">[Unit]</span></span>
<span class="line"><span style="color:#D73A49;">Description</span><span style="color:#24292E;">=Personal Pipeline MCP Server</span></span>
<span class="line"><span style="color:#D73A49;">After</span><span style="color:#24292E;">=network.target</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6F42C1;">[Service]</span></span>
<span class="line"><span style="color:#D73A49;">Type</span><span style="color:#24292E;">=simple</span></span>
<span class="line"><span style="color:#D73A49;">User</span><span style="color:#24292E;">=nodejs</span></span>
<span class="line"><span style="color:#D73A49;">WorkingDirectory</span><span style="color:#24292E;">=/opt/personal-pipeline</span></span>
<span class="line"><span style="color:#D73A49;">ExecStart</span><span style="color:#24292E;">=/usr/bin/node dist/index.js</span></span>
<span class="line"><span style="color:#D73A49;">Restart</span><span style="color:#24292E;">=always</span></span>
<span class="line"><span style="color:#D73A49;">RestartSec</span><span style="color:#24292E;">=10</span></span>
<span class="line"><span style="color:#D73A49;">Environment</span><span style="color:#24292E;">=</span><span style="color:#D73A49;">NODE_ENV</span><span style="color:#24292E;">=production</span></span>
<span class="line"><span style="color:#D73A49;">Environment</span><span style="color:#24292E;">=</span><span style="color:#D73A49;">CONFIG_FILE</span><span style="color:#24292E;">=/opt/personal-pipeline/config/config.yaml</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6F42C1;">[Install]</span></span>
<span class="line"><span style="color:#D73A49;">WantedBy</span><span style="color:#24292E;">=multi-user.target</span></span></code></pre></div><h3 id="process-manager-pm2" tabindex="-1">Process Manager (PM2) <a class="header-anchor" href="#process-manager-pm2" aria-label="Permalink to &quot;Process Manager (PM2)&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Install PM2</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> install</span><span style="color:#005CC5;"> -g</span><span style="color:#032F62;"> pm2</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Create ecosystem file</span></span>
<span class="line"><span style="color:#6F42C1;">cat</span><span style="color:#D73A49;"> &gt;</span><span style="color:#032F62;"> ecosystem.config.js</span><span style="color:#D73A49;"> &lt;&lt;</span><span style="color:#032F62;"> EOF</span></span>
<span class="line"><span style="color:#032F62;">module.exports = {</span></span>
<span class="line"><span style="color:#032F62;">  apps: [{</span></span>
<span class="line"><span style="color:#032F62;">    name: &#39;personal-pipeline&#39;,</span></span>
<span class="line"><span style="color:#032F62;">    script: &#39;dist/index.js&#39;,</span></span>
<span class="line"><span style="color:#032F62;">    instances: &#39;max&#39;,</span></span>
<span class="line"><span style="color:#032F62;">    exec_mode: &#39;cluster&#39;,</span></span>
<span class="line"><span style="color:#032F62;">    env: {</span></span>
<span class="line"><span style="color:#032F62;">      NODE_ENV: &#39;production&#39;,</span></span>
<span class="line"><span style="color:#032F62;">      PORT: 3000</span></span>
<span class="line"><span style="color:#032F62;">    }</span></span>
<span class="line"><span style="color:#032F62;">  }]</span></span>
<span class="line"><span style="color:#032F62;">}</span></span>
<span class="line"><span style="color:#032F62;">EOF</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Start with PM2</span></span>
<span class="line"><span style="color:#6F42C1;">pm2</span><span style="color:#032F62;"> start</span><span style="color:#032F62;"> ecosystem.config.js</span></span>
<span class="line"><span style="color:#6F42C1;">pm2</span><span style="color:#032F62;"> save</span></span>
<span class="line"><span style="color:#6F42C1;">pm2</span><span style="color:#032F62;"> startup</span></span></code></pre></div><h2 id="security-considerations" tabindex="-1">Security Considerations <a class="header-anchor" href="#security-considerations" aria-label="Permalink to &quot;Security Considerations&quot;">​</a></h2><h3 id="file-permissions" tabindex="-1">File Permissions <a class="header-anchor" href="#file-permissions" aria-label="Permalink to &quot;File Permissions&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Secure configuration files</span></span>
<span class="line"><span style="color:#6F42C1;">chmod</span><span style="color:#005CC5;"> 600</span><span style="color:#032F62;"> config/config.yaml</span></span>
<span class="line"><span style="color:#6F42C1;">chmod</span><span style="color:#005CC5;"> 600</span><span style="color:#032F62;"> .env</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Secure log directory</span></span>
<span class="line"><span style="color:#6F42C1;">chmod</span><span style="color:#005CC5;"> 755</span><span style="color:#032F62;"> logs/</span></span>
<span class="line"><span style="color:#6F42C1;">chmod</span><span style="color:#005CC5;"> 644</span><span style="color:#032F62;"> logs/</span><span style="color:#005CC5;">*</span><span style="color:#032F62;">.log</span></span></code></pre></div><h3 id="network-security" tabindex="-1">Network Security <a class="header-anchor" href="#network-security" aria-label="Permalink to &quot;Network Security&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Bind to localhost only (for reverse proxy)</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> HOST</span><span style="color:#D73A49;">=</span><span style="color:#005CC5;">127.0.0.1</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Use HTTPS in production</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> HTTPS_CERT</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">/path/to/cert.pem</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> HTTPS_KEY</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">/path/to/key.pem</span></span></code></pre></div><h3 id="environment-isolation" tabindex="-1">Environment Isolation <a class="header-anchor" href="#environment-isolation" aria-label="Permalink to &quot;Environment Isolation&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Run as non-root user</span></span>
<span class="line"><span style="color:#6F42C1;">useradd</span><span style="color:#005CC5;"> -r</span><span style="color:#005CC5;"> -s</span><span style="color:#032F62;"> /bin/</span><span style="color:#005CC5;">false</span><span style="color:#032F62;"> nodejs</span></span>
<span class="line"><span style="color:#6F42C1;">su</span><span style="color:#032F62;"> nodejs</span><span style="color:#005CC5;"> -c</span><span style="color:#032F62;"> &quot;personal-pipeline&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Use Docker user namespace</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> --user</span><span style="color:#032F62;"> 1001:1001</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h2 id="performance-tuning" tabindex="-1">Performance Tuning <a class="header-anchor" href="#performance-tuning" aria-label="Permalink to &quot;Performance Tuning&quot;">​</a></h2><h3 id="node-js-optimization" tabindex="-1">Node.js Optimization <a class="header-anchor" href="#node-js-optimization" aria-label="Permalink to &quot;Node.js Optimization&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Increase memory limit</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> NODE_OPTIONS</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;--max-old-space-size=4096&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Optimize garbage collection</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> NODE_OPTIONS</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;--max-old-space-size=4096 --optimize-for-size&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Enable V8 optimizations</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> NODE_OPTIONS</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;--max-old-space-size=4096 --optimize-for-size --gc-interval=100&quot;</span></span></code></pre></div><h3 id="caching-configuration" tabindex="-1">Caching Configuration <a class="header-anchor" href="#caching-configuration" aria-label="Permalink to &quot;Caching Configuration&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># config/config.yaml</span></span>
<span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis&quot;</span></span>
<span class="line"><span style="color:#22863A;">  url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis://localhost:6379&quot;</span></span>
<span class="line"><span style="color:#22863A;">  ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3600</span></span>
<span class="line"><span style="color:#22863A;">  max_size</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;100mb&quot;</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#6A737D;">  # Memory fallback</span></span>
<span class="line"><span style="color:#22863A;">  memory</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    max_size</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;50mb&quot;</span></span>
<span class="line"><span style="color:#22863A;">    ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">300</span></span></code></pre></div><h2 id="next-steps" tabindex="-1">Next Steps <a class="header-anchor" href="#next-steps" aria-label="Permalink to &quot;Next Steps&quot;">​</a></h2><ul><li><a href="./configuration">Configuration Guide</a> - Detailed configuration options</li><li><a href="./architecture">Architecture Overview</a> - Understanding the system design</li><li><a href="./../api/mcp-tools">API Reference</a> - Using the MCP tools and REST API</li><li><a href="./../registry/setup">Registry Setup</a> - Setting up local registries</li></ul>`,70)]))}const h=n(p,[["render",e]]);export{u as __pageData,h as default};
