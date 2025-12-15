/**
 * Configuration loader for agent-graph package
 * Loads config from env.json if available, falls back to environment variables
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EnvConfig {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  model?: string;
  temperature?: number;
  directories?: {
    trips?: string;
    itineraries?: string;
    research?: string;
    exports?: string;
    temp?: string;
  };
  database?: {
    type?: string;
    path?: string;
  };
}

let config: EnvConfig | null = null;

/**
 * Load configuration from env.json
 */
function loadEnvJson(): EnvConfig {
  const envJsonPath = join(__dirname, '../../env.json');

  if (existsSync(envJsonPath)) {
    try {
      const content = readFileSync(envJsonPath, 'utf-8');
      const parsed = JSON.parse(content) as EnvConfig;
      console.log('✅ Loaded configuration from env.json');
      return parsed;
    } catch (error) {
      console.warn('⚠️  Failed to parse env.json:', error);
      return {};
    }
  }

  return {};
}

/**
 * Get configuration value with fallback to environment variables
 */
export function getConfig(): EnvConfig {
  if (!config) {
    config = loadEnvJson();
  }
  return config;
}

/**
 * Get Anthropic API key from config or environment
 */
export function getAnthropicApiKey(): string | undefined {
  const cfg = getConfig();
  return cfg.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
}

/**
 * Get OpenAI API key from config or environment
 */
export function getOpenAIApiKey(): string | undefined {
  const cfg = getConfig();
  return cfg.openaiApiKey || process.env.OPENAI_API_KEY;
}

/**
 * Get model name from config or environment
 */
export function getModel(): string {
  const cfg = getConfig();
  return cfg.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
}

/**
 * Get temperature from config or environment
 */
export function getTemperature(): number {
  const cfg = getConfig();
  const envTemp = process.env.ANTHROPIC_TEMPERATURE;
  return cfg.temperature || (envTemp ? parseFloat(envTemp) : 0.7);
}

/**
 * Check if Anthropic API is configured
 */
export function isAnthropicConfigured(): boolean {
  return !!getAnthropicApiKey();
}

/**
 * Check if OpenAI API is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!getOpenAIApiKey();
}
