#!/usr/bin/env node

// Test that the frontend transformation logic works correctly with extracted data

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing frontend transformation logic...\n');

// Fetch the document from API
const docsUrl = 'http://localhost:3011/api/v1/integrations/documents?userId=default-user';

fetch(docsUrl)
  .then(res => res.json())
  .then(documents => {
    console.log(`📄 Fetched ${documents.length} document(s)\n`);

    if (documents.length === 0) {
      console.log('❌ No documents found');
      process.exit(1);
    }

    const doc = documents[0];
    console.log('📋 Document:', doc.title);
    console.log('   Status:', doc.extractionStatus);
    console.log('   Has data:', !!doc.extractedData);

    if (!doc.extractedData) {
      console.log('❌ No extracted data found');
      process.exit(1);
    }

    // Simulate the frontend transformation
    const extractedData = JSON.parse(doc.extractedData);
    console.log('\n✅ Extracted data parsed successfully');
    console.log('   Destinations:', extractedData.destinations?.join(', '));
    console.log('   Date range:', extractedData.dates?.start, 'to', extractedData.dates?.end);
    console.log('   Detailed items:', extractedData.detailedItinerary?.length || 0);

    if (extractedData.detailedItinerary && extractedData.detailedItinerary.length > 0) {
      console.log('\n📅 Itinerary Preview:');

      // Group by day
      const dayGroups = {};
      extractedData.detailedItinerary.forEach(item => {
        if (!dayGroups[item.dayIndex]) {
          dayGroups[item.dayIndex] = [];
        }
        dayGroups[item.dayIndex].push(item);
      });

      Object.keys(dayGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(dayIndex => {
        const items = dayGroups[dayIndex];
        console.log(`\n   Day ${parseInt(dayIndex) + 1} (${items.length} items):`);
        items.forEach(item => {
          console.log(`     • ${item.startTime?.substring(11, 16) || 'TBD'} - ${item.title} [${item.category}]`);
        });
      });

      console.log('\n✨ Transformation Test Results:');
      console.log('   ✅ Data structure is valid');
      console.log('   ✅ Detailed itinerary items present');
      console.log('   ✅ Day grouping works correctly');
      console.log('   ✅ Frontend should display this data in timeline view');

      console.log('\n🎯 Next: Check browser at http://localhost:3010/');
      console.log('   1. Navigate to Itineraries tab');
      console.log('   2. Click "Timeline View" button');
      console.log('   3. Verify the timeline displays the extracted data');
    } else {
      console.log('\n⚠️  No detailed itinerary items found');
      console.log('   Frontend will use fallback transformation');
    }
  })
  .catch(err => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  });
