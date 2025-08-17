import{_ as a,c as n,o as l,ag as o}from"./chunks/framework.tHMypX-2.js";const d=JSON.parse('{"title":"Quick Start Guide","description":"","frontmatter":{},"headers":[],"relativePath":"examples/quickstart.md","filePath":"examples/quickstart.md"}'),e={name:"examples/quickstart.md"};function p(t,s,c,r,i,y){return l(),n("div",null,s[0]||(s[0]=[o(`<h1 id="quick-start-guide" tabindex="-1">Quick Start Guide <a class="header-anchor" href="#quick-start-guide" aria-label="Permalink to &quot;Quick Start Guide&quot;">​</a></h1><p>Get Personal Pipeline running in under 5 minutes with this step-by-step guide.</p><h2 id="prerequisites-check" tabindex="-1">Prerequisites Check <a class="header-anchor" href="#prerequisites-check" aria-label="Permalink to &quot;Prerequisites Check&quot;">​</a></h2><p>Before starting, verify you have:</p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Check Node.js version (18+ required)</span></span>
<span class="line"><span style="color:#6F42C1;">node</span><span style="color:#005CC5;"> --version</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Check npm version (8+ required)</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#005CC5;"> --version</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Check Docker (optional, for registry)</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#005CC5;"> --version</span></span></code></pre></div><h2 id="method-1-npm-package-recommended" tabindex="-1">Method 1: npm Package (Recommended) <a class="header-anchor" href="#method-1-npm-package-recommended" aria-label="Permalink to &quot;Method 1: npm Package (Recommended)&quot;">​</a></h2><h3 id="step-1-set-up-local-registry" tabindex="-1">Step 1: Set up Local Registry <a class="header-anchor" href="#step-1-set-up-local-registry" aria-label="Permalink to &quot;Step 1: Set up Local Registry&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Start the local npm registry</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> registry:start</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Verify registry is running</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:4873/-/ping</span></span></code></pre></div><h3 id="step-2-install-personal-pipeline" tabindex="-1">Step 2: Install Personal Pipeline <a class="header-anchor" href="#step-2-install-personal-pipeline" aria-label="Permalink to &quot;Step 2: Install Personal Pipeline&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Install from local registry</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> install</span><span style="color:#032F62;"> @personal-pipeline/mcp-server</span><span style="color:#005CC5;"> --registry</span><span style="color:#032F62;"> http://localhost:4873</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or install globally</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> install</span><span style="color:#005CC5;"> -g</span><span style="color:#032F62;"> @personal-pipeline/mcp-server</span><span style="color:#005CC5;"> --registry</span><span style="color:#032F62;"> http://localhost:4873</span></span></code></pre></div><h3 id="step-3-basic-configuration" tabindex="-1">Step 3: Basic Configuration <a class="header-anchor" href="#step-3-basic-configuration" aria-label="Permalink to &quot;Step 3: Basic Configuration&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Create config directory</span></span>
<span class="line"><span style="color:#6F42C1;">mkdir</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> config</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Copy sample configuration</span></span>
<span class="line"><span style="color:#6F42C1;">cp</span><span style="color:#032F62;"> node_modules/@personal-pipeline/mcp-server/config/config.sample.yaml</span><span style="color:#032F62;"> config/config.yaml</span></span></code></pre></div><h3 id="step-4-start-the-server" tabindex="-1">Step 4: Start the Server <a class="header-anchor" href="#step-4-start-the-server" aria-label="Permalink to &quot;Step 4: Start the Server&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Start Personal Pipeline</span></span>
<span class="line"><span style="color:#6F42C1;">personal-pipeline</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or with npm script</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> start</span></span></code></pre></div><h3 id="step-5-verify-installation" tabindex="-1">Step 5: Verify Installation <a class="header-anchor" href="#step-5-verify-installation" aria-label="Permalink to &quot;Step 5: Verify Installation&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Check server health</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:3000/health</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Expected response:</span></span>
<span class="line"><span style="color:#6A737D;"># {</span></span>
<span class="line"><span style="color:#6A737D;">#   &quot;status&quot;: &quot;healthy&quot;,</span></span>
<span class="line"><span style="color:#6A737D;">#   &quot;version&quot;: &quot;0.1.0&quot;,</span></span>
<span class="line"><span style="color:#6A737D;">#   &quot;uptime&quot;: 12.34</span></span>
<span class="line"><span style="color:#6A737D;"># }</span></span></code></pre></div><h2 id="method-2-docker-container" tabindex="-1">Method 2: Docker Container <a class="header-anchor" href="#method-2-docker-container" aria-label="Permalink to &quot;Method 2: Docker Container&quot;">​</a></h2><h3 id="step-1-pull-and-run" tabindex="-1">Step 1: Pull and Run <a class="header-anchor" href="#step-1-pull-and-run" aria-label="Permalink to &quot;Step 1: Pull and Run&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Pull latest image</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> pull</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Run with default configuration</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 3000:3000</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h3 id="step-2-run-with-custom-configuration" tabindex="-1">Step 2: Run with Custom Configuration <a class="header-anchor" href="#step-2-run-with-custom-configuration" aria-label="Permalink to &quot;Step 2: Run with Custom Configuration&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Create config directory</span></span>
<span class="line"><span style="color:#6F42C1;">mkdir</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> config</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Create basic configuration</span></span>
<span class="line"><span style="color:#6F42C1;">cat</span><span style="color:#D73A49;"> &gt;</span><span style="color:#032F62;"> config/config.yaml</span><span style="color:#D73A49;"> &lt;&lt;</span><span style="color:#032F62;"> EOF</span></span>
<span class="line"><span style="color:#032F62;">server:</span></span>
<span class="line"><span style="color:#032F62;">  port: 3000</span></span>
<span class="line"><span style="color:#032F62;">  host: &#39;0.0.0.0&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#032F62;">sources:</span></span>
<span class="line"><span style="color:#032F62;">  - name: &quot;local-docs&quot;</span></span>
<span class="line"><span style="color:#032F62;">    type: &quot;filesystem&quot;</span></span>
<span class="line"><span style="color:#032F62;">    path: &quot;./docs&quot;</span></span>
<span class="line"><span style="color:#032F62;">    refresh_interval: &quot;5m&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#032F62;">cache:</span></span>
<span class="line"><span style="color:#032F62;">  type: &quot;memory&quot;</span></span>
<span class="line"><span style="color:#032F62;">  ttl: 300</span></span>
<span class="line"></span>
<span class="line"><span style="color:#032F62;">logging:</span></span>
<span class="line"><span style="color:#032F62;">  level: &quot;info&quot;</span></span>
<span class="line"><span style="color:#032F62;">EOF</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Run with custom config</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 3000:3000</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -v</span><span style="color:#24292E;"> $(</span><span style="color:#005CC5;">pwd</span><span style="color:#24292E;">)</span><span style="color:#032F62;">/config:/app/config</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#032F62;">  localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h2 id="method-3-source-code" tabindex="-1">Method 3: Source Code <a class="header-anchor" href="#method-3-source-code" aria-label="Permalink to &quot;Method 3: Source Code&quot;">​</a></h2><h3 id="step-1-clone-and-install" tabindex="-1">Step 1: Clone and Install <a class="header-anchor" href="#step-1-clone-and-install" aria-label="Permalink to &quot;Step 1: Clone and Install&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Clone repository</span></span>
<span class="line"><span style="color:#6F42C1;">git</span><span style="color:#032F62;"> clone</span><span style="color:#032F62;"> https://github.com/your-username/personal-pipeline-mcp.git</span></span>
<span class="line"><span style="color:#005CC5;">cd</span><span style="color:#032F62;"> personal-pipeline-mcp</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Install dependencies</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> install</span></span></code></pre></div><h3 id="step-2-development-setup" tabindex="-1">Step 2: Development Setup <a class="header-anchor" href="#step-2-development-setup" aria-label="Permalink to &quot;Step 2: Development Setup&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Set up demo environment</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> demo:start</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># This will:</span></span>
<span class="line"><span style="color:#6A737D;"># - Start Redis for caching</span></span>
<span class="line"><span style="color:#6A737D;"># - Generate sample data</span></span>
<span class="line"><span style="color:#6A737D;"># - Configure demo sources</span></span>
<span class="line"><span style="color:#6A737D;"># - Start the server</span></span></code></pre></div><h3 id="step-3-development-mode" tabindex="-1">Step 3: Development Mode <a class="header-anchor" href="#step-3-development-mode" aria-label="Permalink to &quot;Step 3: Development Mode&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Start in development mode with hot reload</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> dev</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or run tests</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> test</span></span></code></pre></div><h2 id="testing-your-installation" tabindex="-1">Testing Your Installation <a class="header-anchor" href="#testing-your-installation" aria-label="Permalink to &quot;Testing Your Installation&quot;">​</a></h2><h3 id="_1-health-check" tabindex="-1">1. Health Check <a class="header-anchor" href="#_1-health-check" aria-label="Permalink to &quot;1. Health Check&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Basic health check</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:3000/health</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Detailed health information</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:3000/health/detailed</span><span style="color:#D73A49;"> |</span><span style="color:#6F42C1;"> jq</span></span></code></pre></div><h3 id="_2-test-mcp-tools" tabindex="-1">2. Test MCP Tools <a class="header-anchor" href="#_2-test-mcp-tools" aria-label="Permalink to &quot;2. Test MCP Tools&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Search for runbooks</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -X</span><span style="color:#032F62;"> POST</span><span style="color:#032F62;"> http://localhost:3000/api/runbooks/search</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -H</span><span style="color:#032F62;"> &quot;Content-Type: application/json&quot;</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -d</span><span style="color:#032F62;"> &#39;{</span></span>
<span class="line"><span style="color:#032F62;">    &quot;alert_type&quot;: &quot;disk_space&quot;,</span></span>
<span class="line"><span style="color:#032F62;">    &quot;severity&quot;: &quot;high&quot;,</span></span>
<span class="line"><span style="color:#032F62;">    &quot;limit&quot;: 3</span></span>
<span class="line"><span style="color:#032F62;">  }&#39;</span><span style="color:#D73A49;"> |</span><span style="color:#6F42C1;"> jq</span></span></code></pre></div><h3 id="_3-list-available-sources" tabindex="-1">3. List Available Sources <a class="header-anchor" href="#_3-list-available-sources" aria-label="Permalink to &quot;3. List Available Sources&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># View configured sources</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:3000/api/sources</span><span style="color:#D73A49;"> |</span><span style="color:#6F42C1;"> jq</span></span></code></pre></div><h3 id="_4-interactive-mcp-explorer" tabindex="-1">4. Interactive MCP Explorer <a class="header-anchor" href="#_4-interactive-mcp-explorer" aria-label="Permalink to &quot;4. Interactive MCP Explorer&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Start interactive MCP client</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> mcp-explorer</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># This provides:</span></span>
<span class="line"><span style="color:#6A737D;"># - Interactive tool testing</span></span>
<span class="line"><span style="color:#6A737D;"># - Performance analytics</span></span>
<span class="line"><span style="color:#6A737D;"># - Automated test suite</span></span></code></pre></div><h2 id="sample-configuration" tabindex="-1">Sample Configuration <a class="header-anchor" href="#sample-configuration" aria-label="Permalink to &quot;Sample Configuration&quot;">​</a></h2><h3 id="basic-setup" tabindex="-1">Basic Setup <a class="header-anchor" href="#basic-setup" aria-label="Permalink to &quot;Basic Setup&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># config/config.yaml</span></span>
<span class="line"><span style="color:#22863A;">server</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  port</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3000</span></span>
<span class="line"><span style="color:#22863A;">  host</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;0.0.0.0&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;local-docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;filesystem&quot;</span></span>
<span class="line"><span style="color:#22863A;">    path</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;./docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;5m&quot;</span></span>
<span class="line"><span style="color:#22863A;">    priority</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;memory&quot;</span></span>
<span class="line"><span style="color:#22863A;">  ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">300</span></span>
<span class="line"><span style="color:#22863A;">  max_size</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;100mb&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;info&quot;</span></span>
<span class="line"><span style="color:#22863A;">  format</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;json&quot;</span></span></code></pre></div><h3 id="with-redis-caching" tabindex="-1">With Redis Caching <a class="header-anchor" href="#with-redis-caching" aria-label="Permalink to &quot;With Redis Caching&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># config/config.yaml</span></span>
<span class="line"><span style="color:#22863A;">server</span><span style="color:#24292E;">:</span></span>
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
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis&quot;</span></span>
<span class="line"><span style="color:#22863A;">  url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis://localhost:6379&quot;</span></span>
<span class="line"><span style="color:#22863A;">  ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3600</span></span>
<span class="line"><span style="color:#22863A;">  fallback</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;memory&quot;</span></span>
<span class="line"><span style="color:#22863A;">    ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">300</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;info&quot;</span></span>
<span class="line"><span style="color:#22863A;">  format</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;json&quot;</span></span></code></pre></div><h3 id="production-configuration" tabindex="-1">Production Configuration <a class="header-anchor" href="#production-configuration" aria-label="Permalink to &quot;Production Configuration&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># config/config.yaml</span></span>
<span class="line"><span style="color:#22863A;">server</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  port</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3000</span></span>
<span class="line"><span style="color:#22863A;">  host</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;0.0.0.0&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">sources</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;confluence&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;confluence&quot;</span></span>
<span class="line"><span style="color:#22863A;">    base_url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;https://company.atlassian.net/wiki&quot;</span></span>
<span class="line"><span style="color:#22863A;">    auth</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;bearer_token&quot;</span></span>
<span class="line"><span style="color:#22863A;">      token_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;CONFLUENCE_TOKEN&quot;</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;1h&quot;</span></span>
<span class="line"><span style="color:#22863A;">    priority</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1</span></span>
<span class="line"></span>
<span class="line"><span style="color:#24292E;">  - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;github-docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;github&quot;</span></span>
<span class="line"><span style="color:#22863A;">    repository</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;company/docs&quot;</span></span>
<span class="line"><span style="color:#22863A;">    path</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;runbooks/&quot;</span></span>
<span class="line"><span style="color:#22863A;">    auth</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;token&quot;</span></span>
<span class="line"><span style="color:#22863A;">      token_env</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;GITHUB_TOKEN&quot;</span></span>
<span class="line"><span style="color:#22863A;">    refresh_interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;30m&quot;</span></span>
<span class="line"><span style="color:#22863A;">    priority</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">2</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">cache</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis&quot;</span></span>
<span class="line"><span style="color:#22863A;">  url</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;redis://localhost:6379&quot;</span></span>
<span class="line"><span style="color:#22863A;">  ttl</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3600</span></span>
<span class="line"><span style="color:#22863A;">  circuit_breaker</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    failure_threshold</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">5</span></span>
<span class="line"><span style="color:#22863A;">    reset_timeout</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">30000</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">performance</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  monitoring</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    enabled</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    metrics_endpoint</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;/metrics&quot;</span></span>
<span class="line"><span style="color:#24292E;">  </span></span>
<span class="line"><span style="color:#22863A;">logging</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  level</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;info&quot;</span></span>
<span class="line"><span style="color:#22863A;">  format</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;json&quot;</span></span>
<span class="line"><span style="color:#22863A;">  destinations</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">    - </span><span style="color:#22863A;">type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;file&quot;</span></span>
<span class="line"><span style="color:#22863A;">      filename</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;logs/app.log&quot;</span></span>
<span class="line"><span style="color:#24292E;">    - </span><span style="color:#22863A;">type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;console&quot;</span></span></code></pre></div><h2 id="next-steps" tabindex="-1">Next Steps <a class="header-anchor" href="#next-steps" aria-label="Permalink to &quot;Next Steps&quot;">​</a></h2><h3 id="_1-add-documentation-sources" tabindex="-1">1. Add Documentation Sources <a class="header-anchor" href="#_1-add-documentation-sources" aria-label="Permalink to &quot;1. Add Documentation Sources&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Set up environment variables for external sources</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> CONFLUENCE_TOKEN</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">your_confluence_token</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> GITHUB_TOKEN</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">your_github_token</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Update configuration to include these sources</span></span>
<span class="line"><span style="color:#6A737D;"># Restart Personal Pipeline</span></span></code></pre></div><h3 id="_2-performance-optimization" tabindex="-1">2. Performance Optimization <a class="header-anchor" href="#_2-performance-optimization" aria-label="Permalink to &quot;2. Performance Optimization&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Start Redis for better caching</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -d</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 6379:6379</span><span style="color:#032F62;"> redis:alpine</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Update config to use Redis</span></span>
<span class="line"><span style="color:#6A737D;"># Monitor performance</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> performance:monitor</span></span></code></pre></div><h3 id="_3-production-deployment" tabindex="-1">3. Production Deployment <a class="header-anchor" href="#_3-production-deployment" aria-label="Permalink to &quot;3. Production Deployment&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Build for production</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> build</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Create production configuration</span></span>
<span class="line"><span style="color:#6F42C1;">cp</span><span style="color:#032F62;"> config/config.sample.yaml</span><span style="color:#032F62;"> config/production.yaml</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Deploy with process manager</span></span>
<span class="line"><span style="color:#6F42C1;">pm2</span><span style="color:#032F62;"> start</span><span style="color:#032F62;"> dist/index.js</span><span style="color:#005CC5;"> --name</span><span style="color:#032F62;"> personal-pipeline</span></span></code></pre></div><h2 id="common-issues-solutions" tabindex="-1">Common Issues &amp; Solutions <a class="header-anchor" href="#common-issues-solutions" aria-label="Permalink to &quot;Common Issues &amp; Solutions&quot;">​</a></h2><h3 id="port-already-in-use" tabindex="-1">Port Already in Use <a class="header-anchor" href="#port-already-in-use" aria-label="Permalink to &quot;Port Already in Use&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Find process using port 3000</span></span>
<span class="line"><span style="color:#6F42C1;">lsof</span><span style="color:#005CC5;"> -i</span><span style="color:#032F62;"> :3000</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Kill process or change port</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> PORT</span><span style="color:#D73A49;">=</span><span style="color:#005CC5;">3001</span></span></code></pre></div><h3 id="configuration-file-not-found" tabindex="-1">Configuration File Not Found <a class="header-anchor" href="#configuration-file-not-found" aria-label="Permalink to &quot;Configuration File Not Found&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Verify config file location</span></span>
<span class="line"><span style="color:#6F42C1;">ls</span><span style="color:#005CC5;"> -la</span><span style="color:#032F62;"> config/config.yaml</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Use absolute path</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> CONFIG_FILE</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">/full/path/to/config.yaml</span></span></code></pre></div><h3 id="memory-issues" tabindex="-1">Memory Issues <a class="header-anchor" href="#memory-issues" aria-label="Permalink to &quot;Memory Issues&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Increase Node.js memory limit</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> NODE_OPTIONS</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;--max-old-space-size=2048&quot;</span></span></code></pre></div><h3 id="permission-errors" tabindex="-1">Permission Errors <a class="header-anchor" href="#permission-errors" aria-label="Permalink to &quot;Permission Errors&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Fix file permissions</span></span>
<span class="line"><span style="color:#6F42C1;">chmod</span><span style="color:#005CC5;"> 644</span><span style="color:#032F62;"> config/config.yaml</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Run as specific user</span></span>
<span class="line"><span style="color:#6F42C1;">sudo</span><span style="color:#005CC5;"> -u</span><span style="color:#032F62;"> nodejs</span><span style="color:#032F62;"> personal-pipeline</span></span></code></pre></div><h2 id="getting-help" tabindex="-1">Getting Help <a class="header-anchor" href="#getting-help" aria-label="Permalink to &quot;Getting Help&quot;">​</a></h2><h3 id="documentation" tabindex="-1">Documentation <a class="header-anchor" href="#documentation" aria-label="Permalink to &quot;Documentation&quot;">​</a></h3><ul><li><a href="./../guides/installation">Installation Guide</a> - Detailed installation instructions</li><li><a href="./../guides/configuration">Configuration Guide</a> - Complete configuration reference</li><li><a href="./../api/mcp-tools">API Reference</a> - MCP tools and REST API documentation</li></ul><h3 id="troubleshooting" tabindex="-1">Troubleshooting <a class="header-anchor" href="#troubleshooting" aria-label="Permalink to &quot;Troubleshooting&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Enable debug logging</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> DEBUG</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">personal-pipeline:</span><span style="color:#D73A49;">*</span></span>
<span class="line"><span style="color:#D73A49;">export</span><span style="color:#24292E;"> LOG_LEVEL</span><span style="color:#D73A49;">=</span><span style="color:#24292E;">debug</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># View logs</span></span>
<span class="line"><span style="color:#6F42C1;">tail</span><span style="color:#005CC5;"> -f</span><span style="color:#032F62;"> logs/app.log</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Check system health</span></span>
<span class="line"><span style="color:#6F42C1;">npm</span><span style="color:#032F62;"> run</span><span style="color:#032F62;"> health:dashboard</span></span></code></pre></div><h3 id="community-support" tabindex="-1">Community Support <a class="header-anchor" href="#community-support" aria-label="Permalink to &quot;Community Support&quot;">​</a></h3><ul><li><a href="https://github.com/your-username/personal-pipeline-mcp/issues" target="_blank" rel="noreferrer">GitHub Issues</a></li><li><a href="https://your-username.github.io/personal-pipeline-mcp/" target="_blank" rel="noreferrer">Documentation Site</a></li><li><a href="https://github.com/your-username/personal-pipeline-mcp/discussions" target="_blank" rel="noreferrer">Community Forum</a></li></ul><h2 id="what-s-next" tabindex="-1">What&#39;s Next? <a class="header-anchor" href="#what-s-next" aria-label="Permalink to &quot;What&#39;s Next?&quot;">​</a></h2><p>Once you have Personal Pipeline running:</p><ol><li><strong>Configure Sources</strong> - Add your documentation sources</li><li><strong>Create Runbooks</strong> - Set up operational procedures</li><li><strong>Integrate with Agents</strong> - Connect to LangGraph or other AI agents</li><li><strong>Monitor Performance</strong> - Set up monitoring and alerting</li><li><strong>Scale Up</strong> - Deploy to production environment</li></ol><p>Happy monitoring! 🚀</p>`,71)]))}const h=a(e,[["render",p]]);export{d as __pageData,h as default};
