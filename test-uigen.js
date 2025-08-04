#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUIGenAPI() {
  console.log('🧪 Testing UIgen API...');
  
  try {
    // Test the main page
    console.log('\n1. Testing main page at localhost:3001...');
    const homeResponse = await fetch('http://localhost:3001');
    console.log(`   Status: ${homeResponse.status}`);
    console.log(`   Content-Type: ${homeResponse.headers.get('content-type')}`);
    
    if (homeResponse.ok) {
      console.log('   ✅ Main page accessible');
    } else {
      console.log('   ❌ Main page not accessible');
      return;
    }

    // Test the chat API with the improved prompt
    console.log('\n2. Testing chat API with button generation request...');
    
    const testMessage = "Crea un botón moderno con variantes primary y secondary, efectos hover, y accesibilidad completa";
    
    const chatPayload = {
      messages: [
        {
          role: "user",
          content: testMessage
        }
      ],
      files: {},
      projectId: null
    };

    const chatResponse = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatPayload)
    });

    console.log(`   Status: ${chatResponse.status}`);
    console.log(`   Content-Type: ${chatResponse.headers.get('content-type')}`);
    
    if (chatResponse.ok) {
      console.log('   ✅ Chat API accessible');
      
      // Try to read the streaming response
      const reader = chatResponse.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
      let chunks = 0;
      
      console.log('   📡 Reading streaming response...');
      
      try {
        while (chunks < 10) { // Limit to first 10 chunks for testing
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          result += chunk;
          chunks++;
          
          if (chunk.includes('App.tsx') || chunk.includes('components/')) {
            console.log('   ✅ Component generation detected in stream');
            break;
          }
        }
        
        if (result.length > 0) {
          console.log(`   📊 Received ${result.length} characters in ${chunks} chunks`);
          console.log('   ✅ Streaming response working');
        }
        
      } catch (streamError) {
        console.log('   ⚠️  Stream reading error (might be normal):', streamError.message);
      }
      
    } else {
      console.log('   ❌ Chat API not accessible');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUIGenAPI();