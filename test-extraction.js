#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';

// Read the London trip file
const filePath = join(process.env.HOME, 'Desktop', 'LondonFromChatGPT.json');
const content = readFileSync(filePath, 'utf-8');

// Test the extraction endpoint
const url = 'http://localhost:3011/api/v1/integrations/chatgpt/extract-trip';

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ content }),
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Extraction successful!');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('❌ Extraction failed:', err.message);
    process.exit(1);
  });
