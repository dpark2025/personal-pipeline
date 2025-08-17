// Developer Dark Theme Configuration
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Personal Pipeline',
  description: 'Developer-Focused MCP Server Documentation',
  base: '/personal-pipeline-mcp/',
  cleanUrls: true,
  lastUpdated: true,
  
  themeConfig: {
    // Force dark appearance
    appearance: 'dark',
    
    nav: [
      { text: '🏠 Home', link: '/' },
      { text: '📚 Docs', link: '/guides/installation' },
      { text: '⚡ API', link: '/api/mcp-tools' },
      { text: '🐳 Registry', link: '/registry/setup' },
      { text: '💡 Examples', link: '/examples/quickstart' }
    ],

    sidebar: {
      '/': [
        {
          text: '🚀 Getting Started',
          collapsible: true,
          collapsed: false,
          items: [
            { text: '📦 Installation', link: '/guides/installation' },
            { text: '⚙️ Configuration', link: '/guides/configuration' },
            { text: '🏗️ Architecture', link: '/guides/architecture' },
            { text: '🛠️ Development', link: '/guides/development' }
          ]
        },
        {
          text: '🔌 API Reference',
          collapsible: true,
          items: [
            { text: '🧰 MCP Tools', link: '/api/mcp-tools' },
            { text: '🌐 REST API', link: '/api/rest-api' },
            { text: '🔗 Source Adapters', link: '/api/adapters' },
            { text: '❌ Error Handling', link: '/api/errors' }
          ]
        },
        {
          text: '📦 Local Registry',
          collapsible: true,
          items: [
            { text: '🔧 Setup Guide', link: '/registry/setup' },
            { text: '📋 Package Management', link: '/registry/packages' },
            { text: '🐳 Docker Distribution', link: '/registry/docker' },
            { text: '🔒 Security', link: '/registry/security' }
          ]
        },
        {
          text: '💻 Code Examples',
          collapsible: true,
          items: [
            { text: '⚡ Quick Start', link: '/examples/quickstart' },
            { text: '🔌 API Usage', link: '/examples/api-usage' },
            { text: '🤖 MCP Integration', link: '/examples/mcp-integration' },
            { text: '🐳 Docker Setup', link: '/examples/docker-setup' }
          ]
        }
      ]
    },

    footer: {
      message: 'Developer Dark Theme | Built for Night Owls 🦉',
      copyright: 'Copyright © 2025 Personal Pipeline Team | Made with 💜 and ☕'
    },

    // Dark theme logo
    logo: { 
      src: '/logo-dark.svg', 
      width: 24, 
      height: 24,
      alt: 'Personal Pipeline Logo'
    },
    siteTitle: 'Personal Pipeline',

    // Developer-focused social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/personal-pipeline-mcp' },
      { icon: 'discord', link: 'https://discord.gg/personal-pipeline' },
      { icon: 'x', link: 'https://x.com/personalpipeline' }
    ],

    // Dark theme search
    search: {
      provider: 'local',
      options: {
        placeholder: 'Search docs... 🔍'
      }
    },

    // Developer customizations
    editLink: {
      pattern: 'https://github.com/your-username/personal-pipeline-mcp/edit/main/website_docs/:path',
      text: '✏️ Edit this page'
    },

    lastUpdated: {
      text: '⏰ Last updated',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  },

  // Dark theme head
  head: [
    ['link', { rel: 'icon', href: '/favicon-dark.ico' }],
    ['meta', { name: 'theme-color', content: '#06b6d4' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Source+Code+Pro:wght@300;400;500;600;700&display=swap', rel: 'stylesheet' }]
  ],

  // Dark theme markdown
  markdown: {
    theme: {
      light: 'one-dark-pro',
      dark: 'one-dark-pro'
    },
    lineNumbers: true,
    languageAlias: {
      'ts': 'typescript',
      'js': 'javascript',
      'sh': 'bash'
    }
  }
})