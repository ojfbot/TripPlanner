#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';

// Read the London trip file
const filePath = join(process.env.HOME, 'Desktop', 'LondonFromChatGPT.json');
const content = readFileSync(filePath, 'utf-8');

console.log('🚀 Testing intelligent import endpoint...\n');

// Test the intelligent import endpoint
const importUrl = 'http://localhost:3011/api/v1/integrations/chatgpt/import/intelligent';

fetch(importUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'default-user',
    content
  }),
})
  .then(res => res.json())
  .then(async data => {
    console.log('✅ Import initiated!');
    console.log('Process ID:', data.processId);
    console.log('\n⏳ Waiting 5 seconds for processing...\n');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Fetch documents to verify
    const docsUrl = 'http://localhost:3011/api/v1/integrations/documents?userId=default-user';
    const docsRes = await fetch(docsUrl);
    const docs = await docsRes.json();

    console.log('📄 Documents retrieved:', docs.length);

    if (docs.length > 0) {
      const latestDoc = docs[docs.length - 1];
      console.log('\n📋 Latest document:');
      console.log('  Title:', latestDoc.title);
      console.log('  Extraction status:', latestDoc.extractionStatus);
      console.log('  Has extracted data:', !!latestDoc.extractedData);

      if (latestDoc.extractedData) {
        const extracted = JSON.parse(latestDoc.extractedData);
        console.log('  Destinations:', extracted.destinations?.join(', '));
        console.log('  Detailed itinerary items:', extracted.detailedItinerary?.length || 0);

        if (extracted.detailedItinerary && extracted.detailedItinerary.length > 0) {
          console.log('\n✨ Sample itinerary items:');
          extracted.detailedItinerary.slice(0, 3).forEach((item, idx) => {
            console.log(`  ${idx + 1}. Day ${item.dayIndex + 1}: ${item.title} (${item.category})`);
          });
        }
      }
    }
  })
  .catch(err => {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  });
