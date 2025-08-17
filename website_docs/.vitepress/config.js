// Professional Corporate Theme Configuration
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Personal Pipeline',
  description: 'Enterprise-Grade MCP Server Documentation',
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/guides/installation' },
      { text: 'API Reference', link: '/api/mcp-tools' },
      { text: 'Enterprise', link: '/enterprise/' },
      { text: 'Support', link: '/support/' }
    ],

    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          collapsible: true,
          items: [
            { text: 'Installation', link: '/guides/installation' },
            { text: 'Configuration', link: '/guides/configuration' },
            { text: 'Quick Start', link: '/examples/quickstart' }
          ]
        },
        {
          text: 'API Documentation',
          collapsible: true,
          items: [
            { text: 'MCP Tools', link: '/api/mcp-tools' },
            { text: 'REST API', link: '/api/rest-api' },
            { text: 'Source Adapters', link: '/api/adapters' }
          ]
        },
        {
          text: 'Registry & Distribution',
          collapsible: true,
          items: [
            { text: 'Local Registry Setup', link: '/registry/setup' },
            { text: 'Package Management', link: '/registry/packages' },
            { text: 'Docker Distribution', link: '/registry/docker' }
          ]
        }
      ]
    },

    footer: {
      message: 'Professional Corporate Theme | Enterprise-Ready Documentation',
      copyright: 'Copyright © 2025 Personal Pipeline Team'
    },

    // Professional theme customizations
    logo: '/logo-professional.svg',
    siteTitle: 'Personal Pipeline',
    
    // Corporate-style algolia search
    algolia: {
      appId: 'professional-search',
      apiKey: 'your-api-key',
      indexName: 'personal-pipeline-enterprise'
    },

    // Professional social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/personal-pipeline-mcp' },
      { icon: 'linkedin', link: 'https://linkedin.com/company/personal-pipeline' },
      { icon: 'twitter', link: 'https://twitter.com/personalpipeline' }
    ]
  },

  // Professional styling
  head: [
    ['link', { rel: 'icon', href: '/favicon-professional.ico' }],
    ['meta', { name: 'theme-color', content: '#2563eb' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', rel: 'stylesheet' }]
  ],

  // Professional markdown theme
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  }
})