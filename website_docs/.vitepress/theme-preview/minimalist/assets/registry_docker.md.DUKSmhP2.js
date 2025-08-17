import{_ as a,c as n,o as l,ag as p}from"./chunks/framework.tHMypX-2.js";const u=JSON.parse('{"title":"Docker Distribution","description":"","frontmatter":{},"headers":[],"relativePath":"registry/docker.md","filePath":"registry/docker.md"}'),e={name:"registry/docker.md"};function o(t,s,c,r,i,y){return l(),n("div",null,s[0]||(s[0]=[p(`<h1 id="docker-distribution" tabindex="-1">Docker Distribution <a class="header-anchor" href="#docker-distribution" aria-label="Permalink to &quot;Docker Distribution&quot;">​</a></h1><p>Comprehensive guide to Docker-based distribution of Personal Pipeline, including multi-architecture builds, registry management, and container orchestration.</p><h2 id="overview" tabindex="-1">Overview <a class="header-anchor" href="#overview" aria-label="Permalink to &quot;Overview&quot;">​</a></h2><p>Personal Pipeline provides multiple Docker distribution options:</p><ul><li><strong>Pre-built Images</strong> - Ready-to-run containers from local registry</li><li><strong>Multi-Architecture Support</strong> - AMD64 and ARM64 builds</li><li><strong>Development Images</strong> - Hot-reload enabled containers for development</li><li><strong>Production Images</strong> - Optimized containers for production deployment</li></ul><h2 id="quick-start" tabindex="-1">Quick Start <a class="header-anchor" href="#quick-start" aria-label="Permalink to &quot;Quick Start&quot;">​</a></h2><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Pull and run latest image</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 3000:3000</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Or with environment configuration</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 3000:3000</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -e</span><span style="color:#032F62;"> NODE_ENV=production</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -v</span><span style="color:#24292E;"> $(</span><span style="color:#005CC5;">pwd</span><span style="color:#24292E;">)</span><span style="color:#032F62;">/config:/app/config</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#032F62;">  localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h2 id="docker-registry-setup" tabindex="-1">Docker Registry Setup <a class="header-anchor" href="#docker-registry-setup" aria-label="Permalink to &quot;Docker Registry Setup&quot;">​</a></h2><h3 id="local-docker-registry" tabindex="-1">Local Docker Registry <a class="header-anchor" href="#local-docker-registry" aria-label="Permalink to &quot;Local Docker Registry&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Start local Docker registry</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -d</span><span style="color:#005CC5;"> -p</span><span style="color:#032F62;"> 5000:5000</span><span style="color:#005CC5;"> --name</span><span style="color:#032F62;"> pp-docker-registry</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -v</span><span style="color:#24292E;"> $(</span><span style="color:#005CC5;">pwd</span><span style="color:#24292E;">)</span><span style="color:#032F62;">/registry-data/docker:/var/lib/registry</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#032F62;">  registry:2</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Verify registry is running</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:5000/v2/</span></span></code></pre></div><h3 id="registry-with-docker-compose" tabindex="-1">Registry with Docker Compose <a class="header-anchor" href="#registry-with-docker-compose" aria-label="Permalink to &quot;Registry with Docker Compose&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># docker-compose.registry.yml</span></span>
<span class="line"><span style="color:#22863A;">version</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;3.8&#39;</span></span>
<span class="line"><span style="color:#22863A;">services</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  docker-registry</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">registry:2</span></span>
<span class="line"><span style="color:#22863A;">    container_name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">pp-docker-registry</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;5000:5000&quot;</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./registry-data/docker:/var/lib/registry</span></span>
<span class="line"><span style="color:#22863A;">    environment</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY</span><span style="color:#24292E;">: </span><span style="color:#032F62;">/var/lib/registry</span></span>
<span class="line"><span style="color:#22863A;">      REGISTRY_HTTP_ADDR</span><span style="color:#24292E;">: </span><span style="color:#032F62;">0.0.0.0:5000</span></span>
<span class="line"><span style="color:#22863A;">    restart</span><span style="color:#24292E;">: </span><span style="color:#032F62;">unless-stopped</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">  registry-ui</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">joxit/docker-registry-ui:2</span></span>
<span class="line"><span style="color:#22863A;">    container_name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">pp-registry-ui</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;8080:80&quot;</span></span>
<span class="line"><span style="color:#22863A;">    environment</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      REGISTRY_TITLE</span><span style="color:#24292E;">: </span><span style="color:#032F62;">Personal Pipeline Registry</span></span>
<span class="line"><span style="color:#22863A;">      REGISTRY_URL</span><span style="color:#24292E;">: </span><span style="color:#032F62;">http://docker-registry:5000</span></span>
<span class="line"><span style="color:#22863A;">      DELETE_IMAGES</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">true</span></span>
<span class="line"><span style="color:#22863A;">    depends_on</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">docker-registry</span></span></code></pre></div><h2 id="building-images" tabindex="-1">Building Images <a class="header-anchor" href="#building-images" aria-label="Permalink to &quot;Building Images&quot;">​</a></h2><h3 id="multi-architecture-builds" tabindex="-1">Multi-Architecture Builds <a class="header-anchor" href="#multi-architecture-builds" aria-label="Permalink to &quot;Multi-Architecture Builds&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Set up buildx for multi-platform builds</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> buildx</span><span style="color:#032F62;"> create</span><span style="color:#005CC5;"> --name</span><span style="color:#032F62;"> pp-builder</span><span style="color:#005CC5;"> --use</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> buildx</span><span style="color:#032F62;"> inspect</span><span style="color:#005CC5;"> --bootstrap</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Build for multiple architectures</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> buildx</span><span style="color:#032F62;"> build</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  --platform</span><span style="color:#032F62;"> linux/amd64,linux/arm64</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -t</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  --push</span><span style="color:#032F62;"> .</span></span></code></pre></div><h3 id="development-vs-production-builds" tabindex="-1">Development vs Production Builds <a class="header-anchor" href="#development-vs-production-builds" aria-label="Permalink to &quot;Development vs Production Builds&quot;">​</a></h3><div class="language-dockerfile"><button title="Copy Code" class="copy"></button><span class="lang">dockerfile</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Dockerfile.dev - Development image with hot reload</span></span>
<span class="line"><span style="color:#D73A49;">FROM</span><span style="color:#24292E;"> node:18-alpine</span></span>
<span class="line"><span style="color:#D73A49;">WORKDIR</span><span style="color:#24292E;"> /app</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> package*.json ./</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> npm ci</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> . .</span></span>
<span class="line"><span style="color:#D73A49;">EXPOSE</span><span style="color:#24292E;"> 3000</span></span>
<span class="line"><span style="color:#D73A49;">CMD</span><span style="color:#24292E;"> [</span><span style="color:#032F62;">&quot;npm&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;run&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;dev&quot;</span><span style="color:#24292E;">]</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Dockerfile - Production image (optimized)</span></span>
<span class="line"><span style="color:#D73A49;">FROM</span><span style="color:#24292E;"> node:18-alpine </span><span style="color:#D73A49;">AS</span><span style="color:#24292E;"> builder</span></span>
<span class="line"><span style="color:#D73A49;">WORKDIR</span><span style="color:#24292E;"> /app</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> package*.json ./</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> npm ci --only=production</span></span>
<span class="line"></span>
<span class="line"><span style="color:#D73A49;">FROM</span><span style="color:#24292E;"> node:18-alpine</span></span>
<span class="line"><span style="color:#D73A49;">WORKDIR</span><span style="color:#24292E;"> /app</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> --from=builder /app/node_modules ./node_modules</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> . .</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> npm run build</span></span>
<span class="line"><span style="color:#D73A49;">EXPOSE</span><span style="color:#24292E;"> 3000</span></span>
<span class="line"><span style="color:#D73A49;">USER</span><span style="color:#24292E;"> node</span></span>
<span class="line"><span style="color:#D73A49;">CMD</span><span style="color:#24292E;"> [</span><span style="color:#032F62;">&quot;npm&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;start&quot;</span><span style="color:#24292E;">]</span></span></code></pre></div><h3 id="build-scripts" tabindex="-1">Build Scripts <a class="header-anchor" href="#build-scripts" aria-label="Permalink to &quot;Build Scripts&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Build development image</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> build</span><span style="color:#005CC5;"> -f</span><span style="color:#032F62;"> Dockerfile.dev</span><span style="color:#005CC5;"> -t</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:dev</span><span style="color:#032F62;"> .</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Build production image</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> build</span><span style="color:#005CC5;"> -t</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span><span style="color:#032F62;"> .</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Build with specific version tag</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> build</span><span style="color:#005CC5;"> -t</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:v1.2.3</span><span style="color:#032F62;"> .</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Push to local registry</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> push</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h2 id="image-management" tabindex="-1">Image Management <a class="header-anchor" href="#image-management" aria-label="Permalink to &quot;Image Management&quot;">​</a></h2><h3 id="tagging-strategy" tabindex="-1">Tagging Strategy <a class="header-anchor" href="#tagging-strategy" aria-label="Permalink to &quot;Tagging Strategy&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Development tags</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> tag</span><span style="color:#032F62;"> app:latest</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:dev</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> tag</span><span style="color:#032F62;"> app:latest</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:feature-branch</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Release tags  </span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> tag</span><span style="color:#032F62;"> app:latest</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:v1.2.3</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> tag</span><span style="color:#032F62;"> app:latest</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> tag</span><span style="color:#032F62;"> app:latest</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:stable</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Environment tags</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> tag</span><span style="color:#032F62;"> app:latest</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:staging</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> tag</span><span style="color:#032F62;"> app:latest</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:production</span></span></code></pre></div><h3 id="image-variants" tabindex="-1">Image Variants <a class="header-anchor" href="#image-variants" aria-label="Permalink to &quot;Image Variants&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Base server image</span></span>
<span class="line"><span style="color:#6F42C1;">localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Development image with tools</span></span>
<span class="line"><span style="color:#6F42C1;">localhost:5000/personal-pipeline/mcp-server:dev</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Minimal production image</span></span>
<span class="line"><span style="color:#6F42C1;">localhost:5000/personal-pipeline/mcp-server:minimal</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Image with all adapters</span></span>
<span class="line"><span style="color:#6F42C1;">localhost:5000/personal-pipeline/mcp-server:full</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Debug image with additional tools</span></span>
<span class="line"><span style="color:#6F42C1;">localhost:5000/personal-pipeline/mcp-server:debug</span></span></code></pre></div><h2 id="container-configuration" tabindex="-1">Container Configuration <a class="header-anchor" href="#container-configuration" aria-label="Permalink to &quot;Container Configuration&quot;">​</a></h2><h3 id="environment-variables" tabindex="-1">Environment Variables <a class="header-anchor" href="#environment-variables" aria-label="Permalink to &quot;Environment Variables&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Core configuration</span></span>
<span class="line"><span style="color:#24292E;">NODE_ENV</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">production</span></span>
<span class="line"><span style="color:#24292E;">CONFIG_FILE</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">/app/config/config.yaml</span></span>
<span class="line"><span style="color:#24292E;">LOG_LEVEL</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">info</span></span>
<span class="line"><span style="color:#24292E;">PORT</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">3000</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Redis configuration</span></span>
<span class="line"><span style="color:#24292E;">REDIS_URL</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">redis://redis:6379</span></span>
<span class="line"><span style="color:#24292E;">REDIS_PASSWORD</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">your_redis_password</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Performance tuning</span></span>
<span class="line"><span style="color:#24292E;">NODE_OPTIONS</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">&quot;--max-old-space-size=2048&quot;</span></span>
<span class="line"><span style="color:#24292E;">UV_THREADPOOL_SIZE</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">16</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Security</span></span>
<span class="line"><span style="color:#24292E;">DROP_PRIVILEGES</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">true</span></span>
<span class="line"><span style="color:#24292E;">RUN_AS_USER</span><span style="color:#D73A49;">=</span><span style="color:#032F62;">node</span></span></code></pre></div><h3 id="volume-mounts" tabindex="-1">Volume Mounts <a class="header-anchor" href="#volume-mounts" aria-label="Permalink to &quot;Volume Mounts&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Configuration files</span></span>
<span class="line"><span style="color:#6F42C1;">-v</span><span style="color:#24292E;"> $(</span><span style="color:#005CC5;">pwd</span><span style="color:#24292E;">)</span><span style="color:#032F62;">/config:/app/config:ro</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Data persistence</span></span>
<span class="line"><span style="color:#6F42C1;">-v</span><span style="color:#032F62;"> pp-data:/app/data</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Logs</span></span>
<span class="line"><span style="color:#6F42C1;">-v</span><span style="color:#032F62;"> pp-logs:/app/logs</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Custom adapters</span></span>
<span class="line"><span style="color:#6F42C1;">-v</span><span style="color:#24292E;"> $(</span><span style="color:#005CC5;">pwd</span><span style="color:#24292E;">)</span><span style="color:#032F62;">/custom-adapters:/app/src/adapters/custom:ro</span></span></code></pre></div><h3 id="complete-run-example" tabindex="-1">Complete Run Example <a class="header-anchor" href="#complete-run-example" aria-label="Permalink to &quot;Complete Run Example&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> run</span><span style="color:#005CC5;"> -d</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  --name</span><span style="color:#032F62;"> personal-pipeline</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -p</span><span style="color:#032F62;"> 3000:3000</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -e</span><span style="color:#032F62;"> NODE_ENV=production</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -e</span><span style="color:#032F62;"> REDIS_URL=redis://redis:6379</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -v</span><span style="color:#24292E;"> $(</span><span style="color:#005CC5;">pwd</span><span style="color:#24292E;">)</span><span style="color:#032F62;">/config:/app/config:ro</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -v</span><span style="color:#032F62;"> pp-data:/app/data</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  -v</span><span style="color:#032F62;"> pp-logs:/app/logs</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#005CC5;">  --restart</span><span style="color:#032F62;"> unless-stopped</span><span style="color:#005CC5;"> \\</span></span>
<span class="line"><span style="color:#032F62;">  localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h2 id="docker-compose-orchestration" tabindex="-1">Docker Compose Orchestration <a class="header-anchor" href="#docker-compose-orchestration" aria-label="Permalink to &quot;Docker Compose Orchestration&quot;">​</a></h2><h3 id="complete-stack" tabindex="-1">Complete Stack <a class="header-anchor" href="#complete-stack" aria-label="Permalink to &quot;Complete Stack&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># docker-compose.yml</span></span>
<span class="line"><span style="color:#22863A;">version</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;3.8&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">services</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  personal-pipeline</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"><span style="color:#22863A;">    container_name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">personal-pipeline-server</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;3000:3000&quot;</span></span>
<span class="line"><span style="color:#22863A;">    environment</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      NODE_ENV</span><span style="color:#24292E;">: </span><span style="color:#032F62;">production</span></span>
<span class="line"><span style="color:#22863A;">      REDIS_URL</span><span style="color:#24292E;">: </span><span style="color:#032F62;">redis://redis:6379</span></span>
<span class="line"><span style="color:#22863A;">      CONFIG_FILE</span><span style="color:#24292E;">: </span><span style="color:#032F62;">/app/config/config.yaml</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./config:/app/config:ro</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">pp-data:/app/data</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">pp-logs:/app/logs</span></span>
<span class="line"><span style="color:#22863A;">    depends_on</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      redis</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">        condition</span><span style="color:#24292E;">: </span><span style="color:#032F62;">service_healthy</span></span>
<span class="line"><span style="color:#22863A;">    restart</span><span style="color:#24292E;">: </span><span style="color:#032F62;">unless-stopped</span></span>
<span class="line"><span style="color:#22863A;">    healthcheck</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      test</span><span style="color:#24292E;">: [</span><span style="color:#032F62;">&quot;CMD&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;curl&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;-f&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;http://localhost:3000/health&quot;</span><span style="color:#24292E;">]</span></span>
<span class="line"><span style="color:#22863A;">      interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">30s</span></span>
<span class="line"><span style="color:#22863A;">      timeout</span><span style="color:#24292E;">: </span><span style="color:#032F62;">10s</span></span>
<span class="line"><span style="color:#22863A;">      retries</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3</span></span>
<span class="line"><span style="color:#22863A;">      start_period</span><span style="color:#24292E;">: </span><span style="color:#032F62;">40s</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">  redis</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">redis:7-alpine</span></span>
<span class="line"><span style="color:#22863A;">    container_name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">personal-pipeline-redis</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;6379:6379&quot;</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">redis-data:/data</span></span>
<span class="line"><span style="color:#22863A;">    command</span><span style="color:#24292E;">: </span><span style="color:#032F62;">redis-server --appendonly yes</span></span>
<span class="line"><span style="color:#22863A;">    restart</span><span style="color:#24292E;">: </span><span style="color:#032F62;">unless-stopped</span></span>
<span class="line"><span style="color:#22863A;">    healthcheck</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      test</span><span style="color:#24292E;">: [</span><span style="color:#032F62;">&quot;CMD&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;redis-cli&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;ping&quot;</span><span style="color:#24292E;">]</span></span>
<span class="line"><span style="color:#22863A;">      interval</span><span style="color:#24292E;">: </span><span style="color:#032F62;">10s</span></span>
<span class="line"><span style="color:#22863A;">      timeout</span><span style="color:#24292E;">: </span><span style="color:#032F62;">3s</span></span>
<span class="line"><span style="color:#22863A;">      retries</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">  nginx</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">nginx:alpine</span></span>
<span class="line"><span style="color:#22863A;">    container_name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">personal-pipeline-nginx</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;80:80&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;443:443&quot;</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./nginx/nginx.conf:/etc/nginx/nginx.conf:ro</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./nginx/ssl:/etc/nginx/ssl:ro</span></span>
<span class="line"><span style="color:#22863A;">    depends_on</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">personal-pipeline</span></span>
<span class="line"><span style="color:#22863A;">    restart</span><span style="color:#24292E;">: </span><span style="color:#032F62;">unless-stopped</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  pp-data</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  pp-logs</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  redis-data</span><span style="color:#24292E;">:</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">networks</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  default</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">personal-pipeline-network</span></span></code></pre></div><h3 id="development-stack" tabindex="-1">Development Stack <a class="header-anchor" href="#development-stack" aria-label="Permalink to &quot;Development Stack&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># docker-compose.dev.yml</span></span>
<span class="line"><span style="color:#22863A;">version</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&#39;3.8&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">services</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  personal-pipeline-dev</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    build</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      context</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">.</span></span>
<span class="line"><span style="color:#22863A;">      dockerfile</span><span style="color:#24292E;">: </span><span style="color:#032F62;">Dockerfile.dev</span></span>
<span class="line"><span style="color:#22863A;">    container_name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">personal-pipeline-dev</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;3000:3000&quot;</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;9229:9229&quot;</span><span style="color:#6A737D;">  # Debug port</span></span>
<span class="line"><span style="color:#22863A;">    environment</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      NODE_ENV</span><span style="color:#24292E;">: </span><span style="color:#032F62;">development</span></span>
<span class="line"><span style="color:#22863A;">      DEBUG</span><span style="color:#24292E;">: </span><span style="color:#032F62;">&quot;personal-pipeline:*&quot;</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">.:/app</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">/app/node_modules</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./config:/app/config</span></span>
<span class="line"><span style="color:#22863A;">    command</span><span style="color:#24292E;">: </span><span style="color:#032F62;">npm run dev</span></span>
<span class="line"><span style="color:#22863A;">    restart</span><span style="color:#24292E;">: </span><span style="color:#032F62;">unless-stopped</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">  redis-dev</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">redis:7-alpine</span></span>
<span class="line"><span style="color:#22863A;">    container_name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">personal-pipeline-redis-dev</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;6379:6379&quot;</span></span>
<span class="line"><span style="color:#22863A;">    command</span><span style="color:#24292E;">: </span><span style="color:#032F62;">redis-server --appendonly yes</span></span></code></pre></div><h2 id="image-optimization" tabindex="-1">Image Optimization <a class="header-anchor" href="#image-optimization" aria-label="Permalink to &quot;Image Optimization&quot;">​</a></h2><h3 id="multi-stage-build-optimization" tabindex="-1">Multi-stage Build Optimization <a class="header-anchor" href="#multi-stage-build-optimization" aria-label="Permalink to &quot;Multi-stage Build Optimization&quot;">​</a></h3><div class="language-dockerfile"><button title="Copy Code" class="copy"></button><span class="lang">dockerfile</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Optimized production Dockerfile</span></span>
<span class="line"><span style="color:#D73A49;">FROM</span><span style="color:#24292E;"> node:18-alpine </span><span style="color:#D73A49;">AS</span><span style="color:#24292E;"> dependencies</span></span>
<span class="line"><span style="color:#D73A49;">WORKDIR</span><span style="color:#24292E;"> /app</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> package*.json ./</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> npm ci --only=production &amp;&amp; npm cache clean --force</span></span>
<span class="line"></span>
<span class="line"><span style="color:#D73A49;">FROM</span><span style="color:#24292E;"> node:18-alpine </span><span style="color:#D73A49;">AS</span><span style="color:#24292E;"> build</span></span>
<span class="line"><span style="color:#D73A49;">WORKDIR</span><span style="color:#24292E;"> /app</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> package*.json ./</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> npm ci</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> . .</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> npm run build &amp;&amp; npm prune --production</span></span>
<span class="line"></span>
<span class="line"><span style="color:#D73A49;">FROM</span><span style="color:#24292E;"> node:18-alpine </span><span style="color:#D73A49;">AS</span><span style="color:#24292E;"> runtime</span></span>
<span class="line"><span style="color:#D73A49;">WORKDIR</span><span style="color:#24292E;"> /app</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Install dumb-init for proper signal handling</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> apk add --no-cache dumb-init</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Create non-root user</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> addgroup -g 1001 -S nodejs</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> adduser -S nodejs -u 1001</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Copy production dependencies and built application</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> --from=dependencies /app/node_modules ./node_modules</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> --from=build /app/dist ./dist</span></span>
<span class="line"><span style="color:#D73A49;">COPY</span><span style="color:#24292E;"> --from=build /app/package.json ./package.json</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Set ownership</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> chown -R nodejs:nodejs /app</span></span>
<span class="line"><span style="color:#D73A49;">USER</span><span style="color:#24292E;"> nodejs</span></span>
<span class="line"></span>
<span class="line"><span style="color:#D73A49;">EXPOSE</span><span style="color:#24292E;"> 3000</span></span>
<span class="line"><span style="color:#D73A49;">ENTRYPOINT</span><span style="color:#24292E;"> [</span><span style="color:#032F62;">&quot;dumb-init&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;--&quot;</span><span style="color:#24292E;">]</span></span>
<span class="line"><span style="color:#D73A49;">CMD</span><span style="color:#24292E;"> [</span><span style="color:#032F62;">&quot;node&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;dist/index.js&quot;</span><span style="color:#24292E;">]</span></span></code></pre></div><h3 id="image-size-optimization" tabindex="-1">Image Size Optimization <a class="header-anchor" href="#image-size-optimization" aria-label="Permalink to &quot;Image Size Optimization&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># View image layers and sizes</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> history</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Analyze image size</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> images</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Use dive to analyze layers</span></span>
<span class="line"><span style="color:#6F42C1;">dive</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h2 id="registry-operations" tabindex="-1">Registry Operations <a class="header-anchor" href="#registry-operations" aria-label="Permalink to &quot;Registry Operations&quot;">​</a></h2><h3 id="image-management-1" tabindex="-1">Image Management <a class="header-anchor" href="#image-management-1" aria-label="Permalink to &quot;Image Management&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># List images in registry</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:5000/v2/_catalog</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># List tags for specific image</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:5000/v2/personal-pipeline/mcp-server/tags/list</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Get image manifest</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://localhost:5000/v2/personal-pipeline/mcp-server/manifests/latest</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Delete image (if delete enabled)</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#005CC5;"> -X</span><span style="color:#032F62;"> DELETE</span><span style="color:#032F62;"> http://localhost:5000/v2/personal-pipeline/mcp-server/manifests/sha256:...</span></span></code></pre></div><h3 id="registry-maintenance" tabindex="-1">Registry Maintenance <a class="header-anchor" href="#registry-maintenance" aria-label="Permalink to &quot;Registry Maintenance&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Garbage collection</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> exec</span><span style="color:#032F62;"> pp-docker-registry</span><span style="color:#032F62;"> registry</span><span style="color:#032F62;"> garbage-collect</span><span style="color:#032F62;"> /etc/docker/registry/config.yml</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># View registry storage usage</span></span>
<span class="line"><span style="color:#6F42C1;">du</span><span style="color:#005CC5;"> -sh</span><span style="color:#032F62;"> ./registry-data/docker/</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Backup registry data</span></span>
<span class="line"><span style="color:#6F42C1;">tar</span><span style="color:#005CC5;"> -czf</span><span style="color:#032F62;"> docker-registry-backup-</span><span style="color:#24292E;">$(</span><span style="color:#6F42C1;">date</span><span style="color:#032F62;"> +%Y%m%d</span><span style="color:#24292E;">)</span><span style="color:#032F62;">.tar.gz</span><span style="color:#032F62;"> ./registry-data/docker/</span></span></code></pre></div><h2 id="security-best-practices" tabindex="-1">Security &amp; Best Practices <a class="header-anchor" href="#security-best-practices" aria-label="Permalink to &quot;Security &amp; Best Practices&quot;">​</a></h2><h3 id="image-security" tabindex="-1">Image Security <a class="header-anchor" href="#image-security" aria-label="Permalink to &quot;Image Security&quot;">​</a></h3><div class="language-dockerfile"><button title="Copy Code" class="copy"></button><span class="lang">dockerfile</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Security best practices in Dockerfile</span></span>
<span class="line"><span style="color:#D73A49;">FROM</span><span style="color:#24292E;"> node:18-alpine</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Update packages</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> apk update &amp;&amp; apk upgrade</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Create non-root user</span></span>
<span class="line"><span style="color:#D73A49;">RUN</span><span style="color:#24292E;"> addgroup -g 1001 -S nodejs &amp;&amp; \\</span></span>
<span class="line"><span style="color:#24292E;">    adduser -S nodejs -u 1001</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Use non-root user</span></span>
<span class="line"><span style="color:#D73A49;">USER</span><span style="color:#24292E;"> nodejs</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Avoid running as PID 1</span></span>
<span class="line"><span style="color:#D73A49;">ENTRYPOINT</span><span style="color:#24292E;"> [</span><span style="color:#032F62;">&quot;dumb-init&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;--&quot;</span><span style="color:#24292E;">]</span></span>
<span class="line"><span style="color:#D73A49;">CMD</span><span style="color:#24292E;"> [</span><span style="color:#032F62;">&quot;node&quot;</span><span style="color:#24292E;">, </span><span style="color:#032F62;">&quot;dist/index.js&quot;</span><span style="color:#24292E;">]</span></span></code></pre></div><h3 id="registry-security" tabindex="-1">Registry Security <a class="header-anchor" href="#registry-security" aria-label="Permalink to &quot;Registry Security&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># docker-compose.yml with authentication</span></span>
<span class="line"><span style="color:#22863A;">services</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  docker-registry</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">registry:2</span></span>
<span class="line"><span style="color:#22863A;">    environment</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      REGISTRY_AUTH</span><span style="color:#24292E;">: </span><span style="color:#032F62;">htpasswd</span></span>
<span class="line"><span style="color:#22863A;">      REGISTRY_AUTH_HTPASSWD_REALM</span><span style="color:#24292E;">: </span><span style="color:#032F62;">Registry Realm</span></span>
<span class="line"><span style="color:#22863A;">      REGISTRY_AUTH_HTPASSWD_PATH</span><span style="color:#24292E;">: </span><span style="color:#032F62;">/auth/htpasswd</span></span>
<span class="line"><span style="color:#22863A;">      REGISTRY_HTTP_TLS_CERTIFICATE</span><span style="color:#24292E;">: </span><span style="color:#032F62;">/certs/domain.crt</span></span>
<span class="line"><span style="color:#22863A;">      REGISTRY_HTTP_TLS_KEY</span><span style="color:#24292E;">: </span><span style="color:#032F62;">/certs/domain.key</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./auth:/auth</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./certs:/certs</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./registry-data:/var/lib/registry</span></span></code></pre></div><h3 id="scanning-for-vulnerabilities" tabindex="-1">Scanning for Vulnerabilities <a class="header-anchor" href="#scanning-for-vulnerabilities" aria-label="Permalink to &quot;Scanning for Vulnerabilities&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Scan image with Trivy</span></span>
<span class="line"><span style="color:#6F42C1;">trivy</span><span style="color:#032F62;"> image</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Scan with Docker Scout</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> scout</span><span style="color:#032F62;"> cves</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Continuous scanning in CI/CD</span></span>
<span class="line"><span style="color:#6F42C1;">docker</span><span style="color:#032F62;"> scout</span><span style="color:#032F62;"> quickview</span><span style="color:#032F62;"> localhost:5000/personal-pipeline/mcp-server:latest</span></span></code></pre></div><h2 id="deployment-strategies" tabindex="-1">Deployment Strategies <a class="header-anchor" href="#deployment-strategies" aria-label="Permalink to &quot;Deployment Strategies&quot;">​</a></h2><h3 id="rolling-updates" tabindex="-1">Rolling Updates <a class="header-anchor" href="#rolling-updates" aria-label="Permalink to &quot;Rolling Updates&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># kubernetes deployment</span></span>
<span class="line"><span style="color:#22863A;">apiVersion</span><span style="color:#24292E;">: </span><span style="color:#032F62;">apps/v1</span></span>
<span class="line"><span style="color:#22863A;">kind</span><span style="color:#24292E;">: </span><span style="color:#032F62;">Deployment</span></span>
<span class="line"><span style="color:#22863A;">metadata</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">personal-pipeline</span></span>
<span class="line"><span style="color:#22863A;">spec</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  replicas</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3</span></span>
<span class="line"><span style="color:#22863A;">  strategy</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    type</span><span style="color:#24292E;">: </span><span style="color:#032F62;">RollingUpdate</span></span>
<span class="line"><span style="color:#22863A;">    rollingUpdate</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      maxUnavailable</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1</span></span>
<span class="line"><span style="color:#22863A;">      maxSurge</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">1</span></span>
<span class="line"><span style="color:#22863A;">  template</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    spec</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      containers</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#22863A;">name</span><span style="color:#24292E;">: </span><span style="color:#032F62;">personal-pipeline</span></span>
<span class="line"><span style="color:#22863A;">        image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">localhost:5000/personal-pipeline/mcp-server:latest</span></span>
<span class="line"><span style="color:#22863A;">        ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">        - </span><span style="color:#22863A;">containerPort</span><span style="color:#24292E;">: </span><span style="color:#005CC5;">3000</span></span></code></pre></div><h3 id="blue-green-deployment" tabindex="-1">Blue-Green Deployment <a class="header-anchor" href="#blue-green-deployment" aria-label="Permalink to &quot;Blue-Green Deployment&quot;">​</a></h3><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Deploy new version to green environment</span></span>
<span class="line"><span style="color:#6F42C1;">docker-compose</span><span style="color:#005CC5;"> -f</span><span style="color:#032F62;"> docker-compose.green.yml</span><span style="color:#032F62;"> up</span><span style="color:#005CC5;"> -d</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Test green environment</span></span>
<span class="line"><span style="color:#6F42C1;">curl</span><span style="color:#032F62;"> http://green.personal-pipeline.local/health</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Switch traffic to green</span></span>
<span class="line"><span style="color:#6A737D;"># Update load balancer configuration</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6A737D;"># Stop blue environment</span></span>
<span class="line"><span style="color:#6F42C1;">docker-compose</span><span style="color:#005CC5;"> -f</span><span style="color:#032F62;"> docker-compose.blue.yml</span><span style="color:#032F62;"> down</span></span></code></pre></div><h2 id="monitoring-observability" tabindex="-1">Monitoring &amp; Observability <a class="header-anchor" href="#monitoring-observability" aria-label="Permalink to &quot;Monitoring &amp; Observability&quot;">​</a></h2><h3 id="container-health-checks" tabindex="-1">Container Health Checks <a class="header-anchor" href="#container-health-checks" aria-label="Permalink to &quot;Container Health Checks&quot;">​</a></h3><div class="language-dockerfile"><button title="Copy Code" class="copy"></button><span class="lang">dockerfile</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># Dockerfile health check</span></span>
<span class="line"><span style="color:#D73A49;">HEALTHCHECK</span><span style="color:#24292E;"> --interval=30s --timeout=10s --start-period=40s --retries=3 \\</span></span>
<span class="line"><span style="color:#D73A49;">  CMD</span><span style="color:#24292E;"> curl -f http://localhost:3000/health || exit 1</span></span></code></pre></div><h3 id="monitoring-stack" tabindex="-1">Monitoring Stack <a class="header-anchor" href="#monitoring-stack" aria-label="Permalink to &quot;Monitoring Stack&quot;">​</a></h3><div class="language-yaml"><button title="Copy Code" class="copy"></button><span class="lang">yaml</span><pre class="shiki github-light vp-code" tabindex="0"><code><span class="line"><span style="color:#6A737D;"># docker-compose.monitoring.yml</span></span>
<span class="line"><span style="color:#22863A;">services</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">  prometheus</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">prom/prometheus</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;9090:9090&quot;</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">./prometheus.yml:/etc/prometheus/prometheus.yml</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">  grafana</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">grafana/grafana</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;3001:3000&quot;</span></span>
<span class="line"><span style="color:#22863A;">    environment</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">      GF_SECURITY_ADMIN_PASSWORD</span><span style="color:#24292E;">: </span><span style="color:#032F62;">admin</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">grafana-data:/var/lib/grafana</span></span>
<span class="line"></span>
<span class="line"><span style="color:#22863A;">  cadvisor</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#22863A;">    image</span><span style="color:#24292E;">: </span><span style="color:#032F62;">gcr.io/cadvisor/cadvisor</span></span>
<span class="line"><span style="color:#22863A;">    ports</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">&quot;8080:8080&quot;</span></span>
<span class="line"><span style="color:#22863A;">    volumes</span><span style="color:#24292E;">:</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">/:/rootfs:ro</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">/var/run:/var/run:ro</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">/sys:/sys:ro</span></span>
<span class="line"><span style="color:#24292E;">      - </span><span style="color:#032F62;">/var/lib/docker/:/var/lib/docker:ro</span></span></code></pre></div><h2 id="next-steps" tabindex="-1">Next Steps <a class="header-anchor" href="#next-steps" aria-label="Permalink to &quot;Next Steps&quot;">​</a></h2><ul><li><a href="./security">Security Guide</a> - Advanced Docker security configuration</li><li><a href="./monitoring">Monitoring</a> - Container monitoring and observability</li><li><a href="./troubleshooting">Troubleshooting</a> - Common Docker issues and solutions</li><li><a href="./../guides/deployment">Production Deployment</a> - Production deployment strategies</li></ul>`,65)]))}const g=a(e,[["render",o]]);export{u as __pageData,g as default};
