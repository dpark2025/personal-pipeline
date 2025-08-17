import{_ as n,c as a,o as l,ag as p}from"./chunks/framework.DV2-evBA.js";const d=JSON.parse('{"title":"Configuration Guide","description":"","frontmatter":{},"headers":[],"relativePath":"guides/configuration.md","filePath":"guides/configuration.md"}'),o={name:"guides/configuration.md"};function e(t,s,c,r,i,y){return l(),a("div",null,s[0]||(s[0]=[p(`<h1 id="configuration-guide" tabindex="-1">Configuration Guide <a class="header-anchor" href="#configuration-guide" aria-label="Permalink to &quot;Configuration Guide&quot;">​</a></h1><p>Comprehensive guide to configuring Personal Pipeline for your environment, including source adapters, caching, security, and performance optimization.</p><h2 id="overview" tabindex="-1">Overview <a class="header-anchor" href="#overview" aria-label="Permalink to &quot;Overview&quot;">​</a></h2><p>Personal Pipeline uses YAML configuration files with environment variable support for secure credential management. This guide covers all configuration options and best practices.</p><h2 id="configuration-file-structure" tabindex="-1">Configuration File Structure <a class="header-anchor" href="#configuration-file-structure" aria-label="Permalink to &quot;Configuration File Structure&quot;">​</a></h2><h3 id="basic-structure" tabindex="-1">Basic Structure <a class="header-anchor" href="#basic-structure" aria-label="Permalink to &quot;Basic Structure&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># config/config.yaml</span></span>
<span class="line"><span style="color:#22863A;">server</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  port</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3000</span></span>
<span class="line"><span style="color:#22863A;">  host</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;0.0.0.0&#39;</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;source-name&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;adapter-type&quot;</span></span>
<span class="line"><span style="color:#6A737D;">    # adapter-specific configuration</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;memory|redis&quot;</span></span>
<span class="line"><span style="color:#6A737D;">  # cache-specific configuration</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#22863A;">logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;debug|info|warn|error&quot;</span></span>
<span class="line"><span style="color:#22863A;">  format</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;json|text&quot;</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#22863A;">performance</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#6A737D;">  # performance monitoring settings</span></span></code></pre></div><h2 id="server-configuration" tabindex="-1">Server Configuration <a class="header-anchor" href="#server-configuration" aria-label="Permalink to &quot;Server Configuration&quot;">​</a></h2><h3 id="basic-server-settings" tabindex="-1">Basic Server Settings <a class="header-anchor" href="#basic-server-settings" aria-label="Permalink to &quot;Basic Server Settings&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">server</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  port</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3000</span><span style="color:#6A737D;">                    # Server port</span></span>
<span class="line"><span style="color:#22863A;">  host</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;0.0.0.0&#39;</span><span style="color:#6A737D;">              # Bind address</span></span>
<span class="line"><span style="color:#22863A;">  max_request_size</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;10mb&#39;</span><span style="color:#6A737D;">      # Maximum request size</span></span>
<span class="line"><span style="color:#22863A;">  timeout</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">30000</span><span style="color:#6A737D;">               # Request timeout (ms)</span></span>
<span class="line"><span style="color:#22863A;">  keep_alive</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">             # HTTP keep-alive</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#6A737D;">  # HTTPS configuration (optional)</span></span>
<span class="line"><span style="color:#22863A;">  https</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span></span>
<span class="line"><span style="color:#22863A;">    cert_file</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;/path/to/cert.pem&#39;</span></span>
<span class="line"><span style="color:#22863A;">    key_file</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;/path/to/key.pem&#39;</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Security headers</span></span>
<span class="line"><span style="color:#22863A;">  security</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    cors</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">      origins</span><span style="color:#24292E;">: [</span><span style="color:#032F62;">&#39;http://localhost:3000&#39;</span><span style="color:#24292E;">]</span></span>
<span class="line"><span style="color:#22863A;">    helmet</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">      content_security_policy</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span></code></pre></div><h3 id="advanced-server-settings" tabindex="-1">Advanced Server Settings <a class="header-anchor" href="#advanced-server-settings" aria-label="Permalink to &quot;Advanced Server Settings&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">server</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#6A737D;">  # Process management</span></span>
<span class="line"><span style="color:#22863A;">  cluster</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span><span style="color:#6A737D;">             # Enable cluster mode</span></span>
<span class="line"><span style="color:#22863A;">    workers</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;auto&#39;</span><span style="color:#6A737D;">           # Number of workers (&#39;auto&#39; = CPU cores)</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Rate limiting</span></span>
<span class="line"><span style="color:#22863A;">  rate_limiting</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    window_ms</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">60000</span><span style="color:#6A737D;">          # 1 minute window</span></span>
<span class="line"><span style="color:#22863A;">    max_requests</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">100</span><span style="color:#6A737D;">         # Max requests per window</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Request logging</span></span>
<span class="line"><span style="color:#22863A;">  request_logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    format</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;combined&#39;</span><span style="color:#6A737D;">        # &#39;combined&#39;, &#39;common&#39;, &#39;dev&#39;</span></span>
<span class="line"><span style="color:#22863A;">    exclude_paths</span><span style="color:#24292E;">: [</span><span style="color:#032F62;">&#39;/health&#39;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&#39;/metrics&#39;</span><span style="color:#24292E;">]</span></span></code></pre></div><h2 id="source-adapter-configuration" tabindex="-1">Source Adapter Configuration <a class="header-anchor" href="#source-adapter-configuration" aria-label="Permalink to &quot;Source Adapter Configuration&quot;">​</a></h2><h3 id="file-system-adapter" tabindex="-1">File System Adapter <a class="header-anchor" href="#file-system-adapter" aria-label="Permalink to &quot;File System Adapter&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;local-docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;filesystem&quot;</span></span>
<span class="line"><span style="color:#22863A;">    path</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;./docs&quot;</span><span style="color:#6A737D;">                    # Directory path</span></span>
<span class="line"><span style="color:#22863A;">    recursive</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">                   # Scan subdirectories</span></span>
<span class="line"><span style="color:#22863A;">    file_patterns</span><span style="color:#24292E;">:                    </span><span style="color:#6A737D;"># File patterns to include</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;*.md&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;*.json&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;*.yaml&quot;</span></span>
<span class="line"><span style="color:#22863A;">    exclude_patterns</span><span style="color:#24292E;">:                 </span><span style="color:#6A737D;"># Patterns to exclude</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;node_modules/**&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;.git/**&quot;</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;5m&quot;</span><span style="color:#6A737D;">            # Auto-refresh interval</span></span>
<span class="line"><span style="color:#22863A;">    priority</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1</span><span style="color:#6A737D;">                       # Source priority (1 = highest)</span></span>
<span class="line"><span style="color:#22863A;">    encoding</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;utf-8&quot;</span><span style="color:#6A737D;">                # File encoding</span></span>
<span class="line"><span style="color:#22863A;">    max_file_size</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;10mb&quot;</span><span style="color:#6A737D;">            # Maximum file size</span></span></code></pre></div><h3 id="confluence-adapter" tabindex="-1">Confluence Adapter <a class="header-anchor" href="#confluence-adapter" aria-label="Permalink to &quot;Confluence Adapter&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;company-confluence&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;confluence&quot;</span></span>
<span class="line"><span style="color:#22863A;">    base_url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;https://company.atlassian.net/wiki&quot;</span></span>
<span class="line"><span style="color:#22863A;">    auth</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;bearer_token&quot;</span><span style="color:#6A737D;">            # or &quot;basic_auth&quot;</span></span>
<span class="line"><span style="color:#22863A;">      token_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;CONFLUENCE_TOKEN&quot;</span><span style="color:#6A737D;">   # Environment variable</span></span>
<span class="line"><span style="color:#6A737D;">      # For basic auth:</span></span>
<span class="line"><span style="color:#6A737D;">      # username_env: &quot;CONFLUENCE_USER&quot;</span></span>
<span class="line"><span style="color:#6A737D;">      # password_env: &quot;CONFLUENCE_PASS&quot;</span></span>
<span class="line"><span style="color:#22863A;">    spaces</span><span style="color:#24292E;">:                           </span><span style="color:#6A737D;"># Specific spaces to index</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;OPS&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;RUNBOOKS&quot;</span></span>
<span class="line"><span style="color:#22863A;">    page_filters</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      labels</span><span style="color:#24292E;">: [</span><span style="color:#032F62;">&quot;runbook&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;procedure&quot;</span><span style="color:#24292E;">] </span><span style="color:#6A737D;"># Only pages with these labels</span></span>
<span class="line"><span style="color:#22863A;">      status</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;current&quot;</span><span style="color:#6A737D;">               # Only current versions</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;1h&quot;</span></span>
<span class="line"><span style="color:#22863A;">    priority</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">2</span></span>
<span class="line"><span style="color:#22863A;">    rate_limit</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      requests_per_minute</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">60</span></span>
<span class="line"><span style="color:#22863A;">      burst_size</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">10</span></span></code></pre></div><h3 id="github-adapter" tabindex="-1">GitHub Adapter <a class="header-anchor" href="#github-adapter" aria-label="Permalink to &quot;GitHub Adapter&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;github-docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;github&quot;</span></span>
<span class="line"><span style="color:#22863A;">    repository</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;company/documentation&quot;</span></span>
<span class="line"><span style="color:#22863A;">    auth</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;token&quot;</span></span>
<span class="line"><span style="color:#22863A;">      token_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;GITHUB_TOKEN&quot;</span></span>
<span class="line"><span style="color:#22863A;">    paths</span><span style="color:#24292E;">:                            </span><span style="color:#6A737D;"># Paths to include</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;runbooks/&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;procedures/&quot;</span></span>
<span class="line"><span style="color:#22863A;">    file_patterns</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;*.md&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;*.json&quot;</span></span>
<span class="line"><span style="color:#22863A;">    branch</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;main&quot;</span><span style="color:#6A737D;">                    # Default branch</span></span>
<span class="line"><span style="color:#22863A;">    include_releases</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span><span style="color:#6A737D;">           # Include release notes</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;30m&quot;</span></span>
<span class="line"><span style="color:#22863A;">    priority</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3</span></span>
<span class="line"><span style="color:#22863A;">    api_version</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;2022-11-28&quot;</span><span style="color:#6A737D;">        # GitHub API version</span></span></code></pre></div><h3 id="database-adapter" tabindex="-1">Database Adapter <a class="header-anchor" href="#database-adapter" aria-label="Permalink to &quot;Database Adapter&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;knowledge-db&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;database&quot;</span></span>
<span class="line"><span style="color:#22863A;">    connection</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;postgresql&quot;</span><span style="color:#6A737D;">              # or &quot;mysql&quot;, &quot;mongodb&quot;</span></span>
<span class="line"><span style="color:#22863A;">      url_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;DATABASE_URL&quot;</span></span>
<span class="line"><span style="color:#6A737D;">      # Or individual settings:</span></span>
<span class="line"><span style="color:#6A737D;">      # host: &quot;localhost&quot;</span></span>
<span class="line"><span style="color:#6A737D;">      # port: 5432</span></span>
<span class="line"><span style="color:#6A737D;">      # database: &quot;knowledge_base&quot;</span></span>
<span class="line"><span style="color:#6A737D;">      # username_env: &quot;DB_USER&quot;</span></span>
<span class="line"><span style="color:#6A737D;">      # password_env: &quot;DB_PASS&quot;</span></span>
<span class="line"><span style="color:#22863A;">    queries</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      runbooks</span><span style="color:#24292E;">: </span><span style="color:#D73A49;">|</span></span>
<span class="line"><span style="color:#032F62;">        SELECT id, title, content, updated_at, tags</span></span>
<span class="line"><span style="color:#032F62;">        FROM runbooks </span></span>
<span class="line"><span style="color:#032F62;">        WHERE status = &#39;active&#39;</span></span>
<span class="line"><span style="color:#22863A;">      procedures</span><span style="color:#24292E;">: </span><span style="color:#D73A49;">|</span></span>
<span class="line"><span style="color:#032F62;">        SELECT id, title, steps, category</span></span>
<span class="line"><span style="color:#032F62;">        FROM procedures</span></span>
<span class="line"><span style="color:#032F62;">        WHERE published = true</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;15m&quot;</span></span>
<span class="line"><span style="color:#22863A;">    priority</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">4</span></span>
<span class="line"><span style="color:#22863A;">    pool_size</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">10</span><span style="color:#6A737D;">                     # Connection pool size</span></span></code></pre></div><h3 id="web-scraping-adapter" tabindex="-1">Web Scraping Adapter <a class="header-anchor" href="#web-scraping-adapter" aria-label="Permalink to &quot;Web Scraping Adapter&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;internal-wiki&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;web&quot;</span></span>
<span class="line"><span style="color:#22863A;">    base_url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;https://wiki.company.com&quot;</span></span>
<span class="line"><span style="color:#22863A;">    auth</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;session_cookie&quot;</span></span>
<span class="line"><span style="color:#22863A;">      cookie_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;WIKI_SESSION&quot;</span></span>
<span class="line"><span style="color:#22863A;">    crawl_config</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      max_depth</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3</span><span style="color:#6A737D;">                    # Maximum crawl depth</span></span>
<span class="line"><span style="color:#22863A;">      max_pages</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1000</span><span style="color:#6A737D;">                # Maximum pages to crawl</span></span>
<span class="line"><span style="color:#22863A;">      delay_ms</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1000</span><span style="color:#6A737D;">                 # Delay between requests</span></span>
<span class="line"><span style="color:#22863A;">      user_agent</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;PersonalPipeline/1.0&quot;</span></span>
<span class="line"><span style="color:#22863A;">    selectors</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      title</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;h1.page-title&quot;</span></span>
<span class="line"><span style="color:#22863A;">      content</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;.page-content&quot;</span></span>
<span class="line"><span style="color:#22863A;">      last_modified</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;.last-updated&quot;</span></span>
<span class="line"><span style="color:#22863A;">    filters</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      include_paths</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">        - </span><span style="color:#032F62;">&quot;/runbooks/&quot;</span></span>
<span class="line"><span style="color:#24292E;">        - </span><span style="color:#032F62;">&quot;/procedures/&quot;</span></span>
<span class="line"><span style="color:#22863A;">      exclude_paths</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">        - </span><span style="color:#032F62;">&quot;/archive/&quot;</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;2h&quot;</span></span>
<span class="line"><span style="color:#22863A;">    priority</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">5</span></span></code></pre></div><h2 id="caching-configuration" tabindex="-1">Caching Configuration <a class="header-anchor" href="#caching-configuration" aria-label="Permalink to &quot;Caching Configuration&quot;">​</a></h2><h3 id="memory-cache" tabindex="-1">Memory Cache <a class="header-anchor" href="#memory-cache" aria-label="Permalink to &quot;Memory Cache&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;memory&quot;</span></span>
<span class="line"><span style="color:#22863A;">  max_size</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;100mb&quot;</span><span style="color:#6A737D;">                  # Maximum memory usage</span></span>
<span class="line"><span style="color:#22863A;">  ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">300</span><span style="color:#6A737D;">                          # Time to live (seconds)</span></span>
<span class="line"><span style="color:#22863A;">  max_items</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">10000</span><span style="color:#6A737D;">                  # Maximum cached items</span></span>
<span class="line"><span style="color:#22863A;">  update_age_on_get</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">           # Update age when accessed</span></span>
<span class="line"><span style="color:#22863A;">  check_period</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">60</span><span style="color:#6A737D;">                  # Cleanup interval (seconds)</span></span></code></pre></div><h3 id="redis-cache" tabindex="-1">Redis Cache <a class="header-anchor" href="#redis-cache" aria-label="Permalink to &quot;Redis Cache&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis&quot;</span></span>
<span class="line"><span style="color:#22863A;">  url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis://localhost:6379&quot;</span><span style="color:#6A737D;">     # Redis URL</span></span>
<span class="line"><span style="color:#6A737D;">  # Or individual settings:</span></span>
<span class="line"><span style="color:#6A737D;">  # host: &quot;localhost&quot;</span></span>
<span class="line"><span style="color:#6A737D;">  # port: 6379</span></span>
<span class="line"><span style="color:#6A737D;">  # password_env: &quot;REDIS_PASSWORD&quot;</span></span>
<span class="line"><span style="color:#6A737D;">  # database: 0</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#22863A;">  ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3600</span><span style="color:#6A737D;">                         # Default TTL (seconds)</span></span>
<span class="line"><span style="color:#22863A;">  key_prefix</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;pp:&quot;</span><span style="color:#6A737D;">                 # Key prefix</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#6A737D;">  # Connection options</span></span>
<span class="line"><span style="color:#22863A;">  connection</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    max_retries</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3</span></span>
<span class="line"><span style="color:#22863A;">    retry_delay_ms</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1000</span></span>
<span class="line"><span style="color:#22863A;">    connect_timeout</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">5000</span></span>
<span class="line"><span style="color:#22863A;">    command_timeout</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3000</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Circuit breaker</span></span>
<span class="line"><span style="color:#22863A;">  circuit_breaker</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    failure_threshold</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">5</span><span style="color:#6A737D;">            # Failures before opening</span></span>
<span class="line"><span style="color:#22863A;">    reset_timeout</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">30000</span><span style="color:#6A737D;">           # Reset attempt interval (ms)</span></span>
<span class="line"><span style="color:#22863A;">    monitor_timeout</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">5000</span><span style="color:#6A737D;">          # Health check interval (ms)</span></span></code></pre></div><h3 id="hybrid-cache" tabindex="-1">Hybrid Cache <a class="header-anchor" href="#hybrid-cache" aria-label="Permalink to &quot;Hybrid Cache&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;hybrid&quot;</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#6A737D;">  # Primary cache (Redis)</span></span>
<span class="line"><span style="color:#22863A;">  primary</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis&quot;</span></span>
<span class="line"><span style="color:#22863A;">    url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis://localhost:6379&quot;</span></span>
<span class="line"><span style="color:#22863A;">    ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3600</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Fallback cache (Memory)</span></span>
<span class="line"><span style="color:#22863A;">  fallback</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;memory&quot;</span></span>
<span class="line"><span style="color:#22863A;">    max_size</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;50mb&quot;</span></span>
<span class="line"><span style="color:#22863A;">    ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">300</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Cache warming</span></span>
<span class="line"><span style="color:#22863A;">  warming</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    strategies</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;most_accessed&quot;</span><span style="color:#6A737D;">             # Warm most accessed items</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;recent_searches&quot;</span><span style="color:#6A737D;">           # Warm recent search results</span></span>
<span class="line"><span style="color:#22863A;">    interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;1h&quot;</span><span style="color:#6A737D;">                  # Warming interval</span></span></code></pre></div><h2 id="performance-configuration" tabindex="-1">Performance Configuration <a class="header-anchor" href="#performance-configuration" aria-label="Permalink to &quot;Performance Configuration&quot;">​</a></h2><h3 id="response-time-optimization" tabindex="-1">Response Time Optimization <a class="header-anchor" href="#response-time-optimization" aria-label="Permalink to &quot;Response Time Optimization&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">performance</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#6A737D;">  # Response time targets</span></span>
<span class="line"><span style="color:#22863A;">  targets</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    critical_operations</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">150</span><span style="color:#6A737D;">        # ms - runbook searches</span></span>
<span class="line"><span style="color:#22863A;">    standard_operations</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">200</span><span style="color:#6A737D;">        # ms - general searches</span></span>
<span class="line"><span style="color:#22863A;">    management_operations</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">100</span><span style="color:#6A737D;">      # ms - health checks</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Monitoring</span></span>
<span class="line"><span style="color:#22863A;">  monitoring</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    metrics_endpoint</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;/metrics&quot;</span></span>
<span class="line"><span style="color:#22863A;">    detailed_logging</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span></span>
<span class="line"><span style="color:#22863A;">    alert_thresholds</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      response_time_p95</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">500</span><span style="color:#6A737D;">       # 95th percentile threshold</span></span>
<span class="line"><span style="color:#22863A;">      error_rate</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">0.01</span><span style="color:#6A737D;">             # 1% error rate threshold</span></span>
<span class="line"><span style="color:#24292E;">      </span></span>
<span class="line"><span style="color:#6A737D;">  # Optimization settings</span></span>
<span class="line"><span style="color:#22863A;">  optimization</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    parallel_searches</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">         # Enable parallel source searches</span></span>
<span class="line"><span style="color:#22863A;">    result_streaming</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">          # Stream results as available</span></span>
<span class="line"><span style="color:#22863A;">    adaptive_timeouts</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">         # Adjust timeouts based on source performance</span></span>
<span class="line"><span style="color:#22863A;">    connection_pooling</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">        # Enable connection pooling</span></span></code></pre></div><h3 id="concurrency-settings" tabindex="-1">Concurrency Settings <a class="header-anchor" href="#concurrency-settings" aria-label="Permalink to &quot;Concurrency Settings&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">performance</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  concurrency</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    max_concurrent_requests</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">100</span><span style="color:#6A737D;">    # Maximum concurrent requests</span></span>
<span class="line"><span style="color:#22863A;">    max_concurrent_searches</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">10</span><span style="color:#6A737D;">     # Maximum concurrent source searches</span></span>
<span class="line"><span style="color:#22863A;">    queue_size</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1000</span><span style="color:#6A737D;">               # Request queue size</span></span>
<span class="line"><span style="color:#22863A;">    worker_threads</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">4</span><span style="color:#6A737D;">              # Worker thread pool size</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Resource limits</span></span>
<span class="line"><span style="color:#22863A;">  limits</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    max_memory_usage</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;1gb&quot;</span><span style="color:#6A737D;">        # Maximum memory usage</span></span>
<span class="line"><span style="color:#22863A;">    max_cpu_usage</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">80</span><span style="color:#6A737D;">              # Maximum CPU usage (%)</span></span>
<span class="line"><span style="color:#22863A;">    max_file_descriptors</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1024</span><span style="color:#6A737D;">     # Maximum open files</span></span></code></pre></div><h2 id="logging-configuration" tabindex="-1">Logging Configuration <a class="header-anchor" href="#logging-configuration" aria-label="Permalink to &quot;Logging Configuration&quot;">​</a></h2><h3 id="basic-logging" tabindex="-1">Basic Logging <a class="header-anchor" href="#basic-logging" aria-label="Permalink to &quot;Basic Logging&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;info&quot;</span><span style="color:#6A737D;">                     # debug, info, warn, error</span></span>
<span class="line"><span style="color:#22863A;">  format</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;json&quot;</span><span style="color:#6A737D;">                    # json, text</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#6A737D;">  # Output destinations</span></span>
<span class="line"><span style="color:#22863A;">  destinations</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">    - </span><span style="color:#22863A;">type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;console&quot;</span></span>
<span class="line"><span style="color:#22863A;">      level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;info&quot;</span></span>
<span class="line"><span style="color:#24292E;">    - </span><span style="color:#22863A;">type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;file&quot;</span></span>
<span class="line"><span style="color:#22863A;">      filename</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;logs/app.log&quot;</span></span>
<span class="line"><span style="color:#22863A;">      level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;info&quot;</span></span>
<span class="line"><span style="color:#22863A;">      max_size</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;10mb&quot;</span></span>
<span class="line"><span style="color:#22863A;">      max_files</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">5</span></span>
<span class="line"><span style="color:#24292E;">      </span></span>
<span class="line"><span style="color:#6A737D;">  # Structured logging</span></span>
<span class="line"><span style="color:#22863A;">  structured</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    include_timestamp</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    include_hostname</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    include_pid</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    include_trace_id</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span></code></pre></div><h3 id="advanced-logging" tabindex="-1">Advanced Logging <a class="header-anchor" href="#advanced-logging" aria-label="Permalink to &quot;Advanced Logging&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#6A737D;">  # Request logging</span></span>
<span class="line"><span style="color:#22863A;">  requests</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    include_body</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span><span style="color:#6A737D;">             # Include request/response bodies</span></span>
<span class="line"><span style="color:#22863A;">    include_headers</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span><span style="color:#6A737D;">          # Include headers</span></span>
<span class="line"><span style="color:#22863A;">    exclude_paths</span><span style="color:#24292E;">: [</span><span style="color:#032F62;">&quot;/health&quot;</span><span style="color:#24292E;">]      </span><span style="color:#6A737D;"># Paths to exclude</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Performance logging</span></span>
<span class="line"><span style="color:#22863A;">  performance</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    slow_query_threshold</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1000</span><span style="color:#6A737D;">      # Log queries slower than 1s</span></span>
<span class="line"><span style="color:#22863A;">    include_stack_traces</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span><span style="color:#6A737D;">     # Include stack traces</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">  # Security logging</span></span>
<span class="line"><span style="color:#22863A;">  security</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    log_authentication</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">        # Log auth attempts</span></span>
<span class="line"><span style="color:#22863A;">    log_authorization</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">         # Log access denials</span></span>
<span class="line"><span style="color:#22863A;">    log_rate_limiting</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span><span style="color:#6A737D;">         # Log rate limit hits</span></span></code></pre></div><h2 id="security-configuration" tabindex="-1">Security Configuration <a class="header-anchor" href="#security-configuration" aria-label="Permalink to &quot;Security Configuration&quot;">​</a></h2><h3 id="authentication" tabindex="-1">Authentication <a class="header-anchor" href="#authentication" aria-label="Permalink to &quot;Authentication&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">security</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  authentication</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span><span style="color:#6A737D;">                  # Enable authentication</span></span>
<span class="line"><span style="color:#22863A;">    provider</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;jwt&quot;</span><span style="color:#6A737D;">                 # jwt, basic, apikey</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#6A737D;">    # JWT configuration</span></span>
<span class="line"><span style="color:#22863A;">    jwt</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      secret_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;JWT_SECRET&quot;</span></span>
<span class="line"><span style="color:#22863A;">      algorithm</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;HS256&quot;</span></span>
<span class="line"><span style="color:#22863A;">      expires_in</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;1h&quot;</span></span>
<span class="line"><span style="color:#24292E;">      </span></span>
<span class="line"><span style="color:#6A737D;">    # API key configuration</span></span>
<span class="line"><span style="color:#22863A;">    apikey</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      header_name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;X-API-Key&quot;</span></span>
<span class="line"><span style="color:#22863A;">      keys_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;API_KEYS&quot;</span><span style="color:#6A737D;">          # Comma-separated keys</span></span>
<span class="line"><span style="color:#24292E;">      </span></span>
<span class="line"><span style="color:#6A737D;">  # Authorization</span></span>
<span class="line"><span style="color:#22863A;">  authorization</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">false</span></span>
<span class="line"><span style="color:#22863A;">    roles</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      admin</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">        permissions</span><span style="color:#24292E;">: [</span><span style="color:#032F62;">&quot;*&quot;</span><span style="color:#24292E;">]</span></span>
<span class="line"><span style="color:#22863A;">      operator</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">        permissions</span><span style="color:#24292E;">: [</span><span style="color:#032F62;">&quot;search:*&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;read:*&quot;</span><span style="color:#24292E;">]</span></span>
<span class="line"><span style="color:#22863A;">      viewer</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">        permissions</span><span style="color:#24292E;">: [</span><span style="color:#032F62;">&quot;read:*&quot;</span><span style="color:#24292E;">]</span></span></code></pre></div><h3 id="network-security" tabindex="-1">Network Security <a class="header-anchor" href="#network-security" aria-label="Permalink to &quot;Network Security&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#22863A;">security</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#6A737D;">  # Network access control</span></span>
<span class="line"><span style="color:#22863A;">  network</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    allowed_ips</span><span style="color:#24292E;">:                    </span><span style="color:#6A737D;"># IP whitelist</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;127.0.0.1&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;10.0.0.0/8&quot;</span></span>
<span class="line"><span style="color:#22863A;">    blocked_ips</span><span style="color:#24292E;">:                    </span><span style="color:#6A737D;"># IP blacklist</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;192.168.1.100&quot;</span></span>
<span class="line"><span style="color:#24292E;">      </span></span>
<span class="line"><span style="color:#6A737D;">  # TLS configuration</span></span>
<span class="line"><span style="color:#22863A;">  tls</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    min_version</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;1.2&quot;</span><span style="color:#6A737D;">             # Minimum TLS version</span></span>
<span class="line"><span style="color:#22863A;">    ciphers</span><span style="color:#24292E;">:                        </span><span style="color:#6A737D;"># Allowed cipher suites</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;ECDHE-RSA-AES128-GCM-SHA256&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;ECDHE-RSA-AES256-GCM-SHA384&quot;</span></span></code></pre></div><h2 id="environment-variables" tabindex="-1">Environment Variables <a class="header-anchor" href="#environment-variables" aria-label="Permalink to &quot;Environment Variables&quot;">​</a></h2><h3 id="required-variables" tabindex="-1">Required Variables <a class="header-anchor" href="#required-variables" aria-label="Permalink to &quot;Required Variables&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Source authentication</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> CONFLUENCE_TOKEN</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;your_confluence_token&quot;</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> GITHUB_TOKEN</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;your_github_token&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Database connection</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> DATABASE_URL</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;postgresql://user:pass@localhost:5432/db&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Redis connection</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> REDIS_URL</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;redis://localhost:6379&quot;</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> REDIS_PASSWORD</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;your_redis_password&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Security</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> JWT_SECRET</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;your_jwt_secret&quot;</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> API_KEYS</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;key1,key2,key3&quot;</span></span></code></pre></div><h3 id="optional-variables" tabindex="-1">Optional Variables <a class="header-anchor" href="#optional-variables" aria-label="Permalink to &quot;Optional Variables&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Server configuration</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> PORT</span><span style="color:#D73A49;">=</span><span style="color:#005CC5;">3000</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> HOST</span><span style="color:#D73A49;">=</span><span style="color:#005CC5;">0.0.0.0</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> NODE_ENV</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">production</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Logging</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> LOG_LEVEL</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">info</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> LOG_FORMAT</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">json</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Performance</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> MAX_MEMORY_USAGE</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">1gb</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> MAX_CONCURRENT_REQUESTS</span><span style="color:#D73A49;">=</span><span style="color:#005CC5;">100</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Development</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> DEBUG</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">personal-pipeline:</span><span style="color:#D73A49;">*</span></span></code></pre></div><h2 id="configuration-validation" tabindex="-1">Configuration Validation <a class="header-anchor" href="#configuration-validation" aria-label="Permalink to &quot;Configuration Validation&quot;">​</a></h2><h3 id="schema-validation" tabindex="-1">Schema Validation <a class="header-anchor" href="#schema-validation" aria-label="Permalink to &quot;Schema Validation&quot;">​</a></h3><p>Personal Pipeline validates configuration using JSON Schema:</p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Validate configuration</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> validate-config</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Output shows validation results:</span></span>
<span class="line"><span style="color:#6A737D;"># ✅ Configuration valid</span></span>
<span class="line"><span style="color:#6A737D;"># ⚠️  Optional field missing: cache.circuit_breaker</span></span>
<span class="line"><span style="color:#6A737D;"># ❌ Invalid value: server.port must be a number</span></span></code></pre></div><h3 id="environment-specific-configs" tabindex="-1">Environment-Specific Configs <a class="header-anchor" href="#environment-specific-configs" aria-label="Permalink to &quot;Environment-Specific Configs&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Development configuration</span></span>
<span class="line"><span style="color:#6F42C1;">config/</span></span>
<span class="line"><span style="color:#6F42C1;">├──</span><span style="color:#032F62;"> config.yaml</span><span style="color:#6A737D;">              # Default configuration</span></span>
<span class="line"><span style="color:#6F42C1;">├──</span><span style="color:#032F62;"> config.development.yaml</span><span style="color:#6A737D;">  # Development overrides</span></span>
<span class="line"><span style="color:#6F42C1;">├──</span><span style="color:#032F62;"> config.staging.yaml</span><span style="color:#6A737D;">      # Staging overrides</span></span>
<span class="line"><span style="color:#6F42C1;">└──</span><span style="color:#032F62;"> config.production.yaml</span><span style="color:#6A737D;">   # Production overrides</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Set environment</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> NODE_ENV</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">production</span></span></code></pre></div><h2 id="configuration-examples" tabindex="-1">Configuration Examples <a class="header-anchor" href="#configuration-examples" aria-label="Permalink to &quot;Configuration Examples&quot;">​</a></h2><h3 id="development-setup" tabindex="-1">Development Setup <a class="header-anchor" href="#development-setup" aria-label="Permalink to &quot;Development Setup&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># config/config.development.yaml</span></span>
<span class="line"><span style="color:#22863A;">server</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  port</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3000</span></span>
<span class="line"><span style="color:#22863A;">  host</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;localhost&#39;</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;local-docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;filesystem&quot;</span></span>
<span class="line"><span style="color:#22863A;">    path</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;./test-data&quot;</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;1m&quot;</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;memory&quot;</span></span>
<span class="line"><span style="color:#22863A;">  ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">60</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#22863A;">logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;debug&quot;</span></span>
<span class="line"><span style="color:#22863A;">  format</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;text&quot;</span></span></code></pre></div><h3 id="production-setup" tabindex="-1">Production Setup <a class="header-anchor" href="#production-setup" aria-label="Permalink to &quot;Production Setup&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># config/config.production.yaml</span></span>
<span class="line"><span style="color:#22863A;">server</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  port</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3000</span></span>
<span class="line"><span style="color:#22863A;">  host</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;0.0.0.0&#39;</span></span>
<span class="line"><span style="color:#22863A;">  cluster</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    workers</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;auto&#39;</span></span>
<span class="line"><span style="color:#22863A;">  rate_limiting</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;confluence&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;confluence&quot;</span></span>
<span class="line"><span style="color:#22863A;">    base_url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;https://company.atlassian.net/wiki&quot;</span></span>
<span class="line"><span style="color:#22863A;">    auth</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;bearer_token&quot;</span></span>
<span class="line"><span style="color:#22863A;">      token_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;CONFLUENCE_TOKEN&quot;</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;1h&quot;</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis&quot;</span></span>
<span class="line"><span style="color:#22863A;">  url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis://redis-cluster:6379&quot;</span></span>
<span class="line"><span style="color:#22863A;">  ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3600</span></span>
<span class="line"><span style="color:#22863A;">  circuit_breaker</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#24292E;">    </span></span>
<span class="line"><span style="color:#22863A;">logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;info&quot;</span></span>
<span class="line"><span style="color:#22863A;">  format</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;json&quot;</span></span>
<span class="line"><span style="color:#22863A;">  destinations</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">    - </span><span style="color:#22863A;">type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;file&quot;</span></span>
<span class="line"><span style="color:#22863A;">      filename</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;/var/log/personal-pipeline/app.log&quot;</span></span>
<span class="line"><span style="color:#24292E;">    - </span><span style="color:#22863A;">type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;console&quot;</span></span>
<span class="line"><span style="color:#24292E;">      </span></span>
<span class="line"><span style="color:#22863A;">performance</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  monitoring</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    alert_thresholds</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      response_time_p95</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">200</span></span>
<span class="line"><span style="color:#22863A;">      error_rate</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">0.001</span></span></code></pre></div><h2 id="troubleshooting-configuration" tabindex="-1">Troubleshooting Configuration <a class="header-anchor" href="#troubleshooting-configuration" aria-label="Permalink to &quot;Troubleshooting Configuration&quot;">​</a></h2><h3 id="common-issues" tabindex="-1">Common Issues <a class="header-anchor" href="#common-issues" aria-label="Permalink to &quot;Common Issues&quot;">​</a></h3><p><strong>Invalid YAML syntax:</strong></p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Check YAML syntax</span></span>
<span class="line"><span style="color:#6F42C1;">yamllint</span><span style="color:#032F62;"> config/config.yaml</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or use online validator</span></span>
<span class="line"><span style="color:#6F42C1;">cat</span><span style="color:#032F62;"> config/config.yaml</span><span style="color:#D73A49;"> |</span><span style="color:#6F42C1;"> python</span><span style="color:#005CC5;"> -c</span><span style="color:#032F62;"> &quot;import yaml; yaml.safe_load(input())&quot;</span></span></code></pre></div><p><strong>Environment variables not found:</strong></p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Check if variables are set</span></span>
<span class="line"><span style="color:#6F42C1;">env</span><span style="color:#D73A49;"> |</span><span style="color:#6F42C1;"> grep</span><span style="color:#005CC5;"> -E</span><span style="color:#032F62;"> &quot;(CONFLUENCE|GITHUB|REDIS)&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Test variable substitution</span></span>
<span class="line"><span style="color:#6F42C1;">node</span><span style="color:#005CC5;"> -e</span><span style="color:#032F62;"> &quot;console.log(process.env.CONFLUENCE_TOKEN || &#39;NOT_SET&#39;)&quot;</span></span></code></pre></div><p><strong>Source connection failures:</strong></p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Test source connectivity</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -H</span><span style="color:#032F62;"> &quot;Authorization: Bearer </span><span style="color:#24292E;">$CONFLUENCE_TOKEN</span><span style="color:#032F62;">&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#032F62;">  &quot;https://company.atlassian.net/wiki/rest/api/space&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Check Redis connection</span></span>
<span class="line"><span style="color:#6F42C1;">redis-cli</span><span style="color:#005CC5;"> -u</span><span style="color:#24292E;"> $REDIS_URL </span><span style="color:#032F62;">ping</span></span></code></pre></div><h2 id="next-steps" tabindex="-1">Next Steps <a class="header-anchor" href="#next-steps" aria-label="Permalink to &quot;Next Steps&quot;">​</a></h2><ul><li><a href="./installation">Installation Guide</a> - Getting Personal Pipeline running</li><li><a href="./../api/mcp-tools">API Reference</a> - Using the configured system</li><li><a href="./../api/adapters">Source Adapters</a> - Detailed adapter configuration</li><li><a href="./security">Security Guide</a> - Advanced security configuration</li></ul>`,71)]))}const A=n(o,[["render",e]]);export{d as __pageData,A as default};
