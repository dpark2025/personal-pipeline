#!/usr/bin/env node

/**
 * VitePress Theme Switcher
 * 
 * This script allows you to switch between different VitePress themes:
 * - professional: Clean business theme
 * - dark: Developer-focused dark theme  
 * - minimalist: Clean, simple theme
 * - enterprise: Comprehensive enterprise theme
 * 
 * Usage:
 *   node .vitepress/theme-switcher.js [theme-name]
 *   npm run docs:theme [theme-name]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const themes = {
  professional: {
    name: 'Professional Corporate',
    description: 'Clean business VitePress theme with corporate styling',
    config: 'theme-professional.js'
  },
  dark: {
    name: 'Developer Dark',
    description: 'Dark mode VitePress configuration for developers',
    config: 'theme-dark.js'
  },
  minimalist: {
    name: 'Minimalist Documentation',
    description: 'Clean, simple VitePress theme with minimal styling',
    config: 'theme-minimalist.js'
  },
  enterprise: {
    name: 'Enterprise Technical',
    description: 'Comprehensive VitePress setup for enterprise documentation',
    config: 'theme-enterprise.js'
  }
}

function switchTheme(themeName) {
  if (!themes[themeName]) {
    console.error(`❌ Unknown theme: ${themeName}`)
    console.log('Available themes:', Object.keys(themes).join(', '))
    process.exit(1)
  }

  const theme = themes[themeName]
  const sourceConfig = path.join(__dirname, theme.config)
  const targetConfig = path.join(__dirname, 'config.js')

  try {
    // Read the theme-specific configuration
    const themeConfig = fs.readFileSync(sourceConfig, 'utf8')
    
    // Write to main config.js
    fs.writeFileSync(targetConfig, themeConfig)
    
    console.log(`✅ Switched to ${theme.name} theme`)
    console.log(`📝 ${theme.description}`)
    console.log(`🔧 Configuration loaded from: ${theme.config}`)
    console.log(``)
    console.log(`To build with this theme:`)
    console.log(`  npm run docs:build`)
    console.log(``)
    console.log(`To preview locally:`)
    console.log(`  npm run docs:dev`)
    
  } catch (error) {
    console.error(`❌ Error switching theme:`, error.message)
    process.exit(1)
  }
}

function listThemes() {
  console.log('📚 Available VitePress Themes:')
  console.log('')
  
  Object.entries(themes).forEach(([key, theme]) => {
    console.log(`🎨 ${key}`)
    console.log(`   Name: ${theme.name}`)
    console.log(`   Description: ${theme.description}`)
    console.log(`   Config: ${theme.config}`)
    console.log('')
  })
  
  console.log('Usage:')
  console.log(`  node .vitepress/theme-switcher.js <theme-name>`)
  console.log(`  npm run docs:theme <theme-name>`)
}

// Main execution
const themeName = process.argv[2]

if (!themeName) {
  listThemes()
} else {
  switchTheme(themeName)
}

export { themes, switchTheme, listThemes }