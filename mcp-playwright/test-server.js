#!/usr/bin/env node

// Simple test to verify the MCP server can start and respond to basic requests
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'dist', 'index.js');

console.log('Testing MCP Playwright Server...');
console.log('Server path:', serverPath);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Send a list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list'
};

let responseData = '';

server.stdout.on('data', (data) => {
  responseData += data.toString();
  console.log('Server response chunk:', data.toString());
  
  // Try to parse JSON response
  try {
    const response = JSON.parse(responseData);
    if (response.result && response.result.tools) {
      console.log(`✅ Server responded with ${response.result.tools.length} tools:`);
      response.result.tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
      server.kill();
      process.exit(0);
    }
  } catch (e) {
    // Not complete JSON yet, continue reading
  }
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(1);
  }
});

// Send the request after a short delay
setTimeout(() => {
  console.log('Sending list tools request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Test timed out');
  server.kill();
  process.exit(1);
}, 10000);