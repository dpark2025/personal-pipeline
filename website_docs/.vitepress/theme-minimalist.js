// Minimalist Documentation Theme Configuration
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Personal Pipeline',
  description: 'Clean, Simple Documentation for MCP Server',
  base: '/personal-pipeline-mcp/',
  cleanUrls: true,
  ignoreDeadLinks: true,
  
  themeConfig: {
    // Minimal navigation
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guides/installation' },
      { text: 'API', link: '/api/mcp-tools' },
      { text: 'Registry', link: '/registry/setup' }
    ],

    // Clean, flat sidebar
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Installation', link: '/guides/installation' },
          { text: 'Configuration', link: '/guides/configuration' },
          { text: 'Architecture', link: '/guides/architecture' }
        ]
      },
      {
        text: 'API',
        items: [
          { text: 'MCP Tools', link: '/api/mcp-tools' },
          { text: 'REST API', link: '/api/rest-api' },
          { text: 'Adapters', link: '/api/adapters' }
        ]
      },
      {
        text: 'Registry',
        items: [
          { text: 'Setup', link: '/registry/setup' },
          { text: 'Packages', link: '/registry/packages' },
          { text: 'Docker', link: '/registry/docker' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Quick Start', link: '/examples/quickstart' },
          { text: 'API Usage', link: '/examples/api-usage' }
        ]
      }
    ],

    // Minimal footer
    footer: {
      message: 'Minimalist Theme',
      copyright: '© 2025 Personal Pipeline'
    },

    // No site title for ultra-clean look
    siteTitle: false,
    logo: { 
      src: '/logo-minimal.svg', 
      width: 32, 
      height: 32,
      alt: 'PP'
    },

    // Simple social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/personal-pipeline-mcp' }
    ],

    // Basic search
    search: {
      provider: 'local'
    },

    // Clean edit link
    editLink: {
      pattern: 'https://github.com/your-username/personal-pipeline-mcp/edit/main/website_docs/:path',
      text: 'Edit'
    }
  },

  // Minimal head
  head: [
    ['link', { rel: 'icon', href: '/favicon-minimal.ico' }],
    ['meta', { name: 'theme-color', content: '#059669' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap', rel: 'stylesheet' }]
  ],

  // Clean markdown theme
  markdown: {
    theme: 'github-light',
    lineNumbers: false // No line numbers for cleaner look
  },

  // Minimal base configuration
})