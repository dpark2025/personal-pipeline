// Enterprise Technical Theme Configuration
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Personal Pipeline Enterprise',
  description: 'Enterprise-Grade MCP Server Documentation & Support Portal',
  base: '/personal-pipeline-mcp/',
  cleanUrls: true,
  lastUpdated: true,
  
  themeConfig: {
    // Comprehensive enterprise navigation
    nav: [
      { text: 'Home', link: '/' },
      { 
        text: 'Documentation', 
        items: [
          { text: 'Getting Started', link: '/guides/installation' },
          { text: 'Architecture Guide', link: '/guides/architecture' },
          { text: 'Enterprise Deployment', link: '/guides/enterprise-deployment' },
          { text: 'Security & Compliance', link: '/guides/security' }
        ]
      },
      { 
        text: 'API & Integration', 
        items: [
          { text: 'MCP Tools Reference', link: '/api/mcp-tools' },
          { text: 'REST API Specification', link: '/api/rest-api' },
          { text: 'Source Adapters', link: '/api/adapters' },
          { text: 'SDK Documentation', link: '/api/sdk' }
        ]
      },
      {
        text: 'Enterprise Solutions',
        items: [
          { text: 'Registry Management', link: '/registry/enterprise' },
          { text: 'High Availability', link: '/enterprise/ha' },
          { text: 'Monitoring & Alerting', link: '/enterprise/monitoring' },
          { text: 'Backup & Recovery', link: '/enterprise/backup' }
        ]
      },
      {
        text: 'Support',
        items: [
          { text: 'Support Portal', link: '/support/' },
          { text: 'Enterprise SLA', link: '/support/sla' },
          { text: 'Training & Certification', link: '/support/training' },
          { text: 'Professional Services', link: '/support/services' }
        ]
      }
    ],

    // Comprehensive enterprise sidebar
    sidebar: {
      '/guides/': [
        {
          text: 'Getting Started',
          collapsible: true,
          items: [
            { text: 'Installation & Setup', link: '/guides/installation' },
            { text: 'Configuration Management', link: '/guides/configuration' },
            { text: 'System Architecture', link: '/guides/architecture' },
            { text: 'Development Workflow', link: '/guides/development' },
            { text: 'Deployment Strategies', link: '/guides/deployment' }
          ]
        },
        {
          text: 'Enterprise Features',
          collapsible: true,
          items: [
            { text: 'Enterprise Deployment', link: '/guides/enterprise-deployment' },
            { text: 'Security & Compliance', link: '/guides/security' },
            { text: 'Performance Tuning', link: '/guides/performance' },
            { text: 'Scalability Planning', link: '/guides/scalability' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Documentation',
          collapsible: true,
          items: [
            { text: 'MCP Tools Reference', link: '/api/mcp-tools' },
            { text: 'REST API Specification', link: '/api/rest-api' },
            { text: 'Source Adapters', link: '/api/adapters' },
            { text: 'Error Handling', link: '/api/errors' },
            { text: 'SDK Documentation', link: '/api/sdk' }
          ]
        },
        {
          text: 'Integration Guides',
          collapsible: true,
          items: [
            { text: 'Authentication & Authorization', link: '/api/auth' },
            { text: 'Rate Limiting & Quotas', link: '/api/rate-limiting' },
            { text: 'Webhooks & Events', link: '/api/webhooks' },
            { text: 'API Versioning', link: '/api/versioning' }
          ]
        }
      ],
      '/registry/': [
        {
          text: 'Registry Management',
          collapsible: true,
          items: [
            { text: 'Enterprise Setup', link: '/registry/enterprise' },
            { text: 'Package Management', link: '/registry/packages' },
            { text: 'Docker Distribution', link: '/registry/docker' },
            { text: 'Security & Access Control', link: '/registry/security' },
            { text: 'Monitoring & Analytics', link: '/registry/monitoring' }
          ]
        }
      ],
      '/enterprise/': [
        {
          text: 'Enterprise Solutions',
          collapsible: true,
          items: [
            { text: 'High Availability', link: '/enterprise/ha' },
            { text: 'Disaster Recovery', link: '/enterprise/dr' },
            { text: 'Monitoring & Alerting', link: '/enterprise/monitoring' },
            { text: 'Backup & Recovery', link: '/enterprise/backup' },
            { text: 'Compliance & Governance', link: '/enterprise/compliance' }
          ]
        }
      ],
      '/support/': [
        {
          text: 'Support & Services',
          collapsible: true,
          items: [
            { text: 'Support Portal', link: '/support/' },
            { text: 'Enterprise SLA', link: '/support/sla' },
            { text: 'Training & Certification', link: '/support/training' },
            { text: 'Professional Services', link: '/support/services' },
            { text: 'Community Forum', link: '/support/community' }
          ]
        }
      ]
    },

    // Enterprise footer
    footer: {
      message: 'Enterprise Technical Theme | Complete Enterprise Documentation Portal',
      copyright: 'Copyright © 2025 Personal Pipeline Team | Enterprise License'
    },

    // Enterprise branding
    logo: '/logo-enterprise.svg',
    siteTitle: 'Personal Pipeline Enterprise',
    logoLink: 'https://personal-pipeline.dev',

    // Enterprise social presence
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username/personal-pipeline-mcp' },
      { icon: 'linkedin', link: 'https://linkedin.com/company/personal-pipeline' },
      { icon: 'twitter', link: 'https://twitter.com/personalpipeline' },
      { icon: 'youtube', link: 'https://youtube.com/@personalpipeline' }
    ],

    // Advanced search for enterprise
    algolia: {
      appId: 'enterprise-search',
      apiKey: 'your-enterprise-api-key',
      indexName: 'personal-pipeline-enterprise',
      searchParameters: {
        facetFilters: ['tags:enterprise', 'version:latest']
      }
    },

    // Enterprise edit capabilities
    editLink: {
      pattern: 'https://github.com/your-username/personal-pipeline-mcp/edit/main/website_docs/:path',
      text: 'Improve this documentation'
    },

    // Detailed last updated info
    lastUpdated: {
      text: 'Documentation last updated',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'short'
      }
    },

    // Announcement bar for enterprise features
    announcement: {
      id: 'enterprise-2025',
      title: 'Enterprise Features Available',
      content: 'Explore our enterprise solutions for high-availability deployments and professional support.',
      link: '/enterprise/'
    }
  },

  // Enterprise head configuration
  head: [
    ['link', { rel: 'icon', href: '/favicon-enterprise.ico' }],
    ['meta', { name: 'theme-color', content: '#7c3aed' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&family=Ubuntu+Mono:wght@400;700&display=swap', rel: 'stylesheet' }],
    // Enterprise analytics and tracking
    ['script', { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID' }],
    ['script', {}, "window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'GA_TRACKING_ID');"]
  ],

  // Enterprise markdown configuration
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true,
    config: (md) => {
      // Enterprise markdown plugins
      md.use(require('markdown-it-container'), 'enterprise')
      md.use(require('markdown-it-footnote'))
      md.use(require('markdown-it-task-lists'))
    }
  },

  // Enterprise build configuration
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'enterprise-vendor': ['vue', 'vue-router'],
          'enterprise-components': ['./components/enterprise']
        }
      }
    }
  }
})