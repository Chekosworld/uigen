# Playwright MCP Server

A Model Context Protocol (MCP) server that provides web automation capabilities using Playwright. This server allows AI assistants to interact with web pages through a comprehensive set of browser automation tools.

## Features

### Core Navigation
- **navigate**: Navigate to URLs with multiple browser engines (Chromium, Firefox, WebKit)
- **go_back**: Navigate back in browser history
- **go_forward**: Navigate forward in browser history
- **reload**: Refresh the current page

### Element Interaction
- **click**: Click on elements with advanced options (position, modifiers, etc.)
- **type**: Type text into input elements
- **fill**: Fill form fields (recommended over type for forms)
- **press_key**: Press keyboard keys on elements

### Form Controls
- **select_option**: Select options in dropdown menus
- **scroll**: Scroll the page or specific elements

### Information Retrieval
- **get_text**: Extract text content from elements
- **get_attribute**: Get attribute values from elements
- **get_page_info**: Get current page URL and title
- **evaluate**: Execute JavaScript in the page context

### Waiting and Timing
- **wait_for_selector**: Wait for elements to appear/disappear
- **wait_for_load_state**: Wait for page load states (load, domcontentloaded, networkidle)

### Screenshots and Media
- **screenshot**: Capture full page or element screenshots with various options

### Session Management
- **close_browser**: Clean up browser resources

## Installation

```bash
cd mcp-playwright
npm install
npm run build
```

## Usage

### Building the Server
```bash
npm run build
```

### Running in Development
```bash
npm run dev  # Watches for changes and rebuilds
```

### Running the MCP Server
```bash
npm start
# or
node dist/index.js
```

## MCP Client Configuration

To use this server with an MCP client, add the following configuration:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["/path/to/mcp-playwright/dist/index.js"]
    }
  }
}
```

## Example Usage

### Basic Web Automation
1. **Navigate to a website**:
   ```json
   {
     "tool": "navigate",
     "arguments": {
       "url": "https://example.com",
       "browser": "chromium",
       "headless": true
     }
   }
   ```

2. **Fill out a form**:
   ```json
   {
     "tool": "fill",
     "arguments": {
       "selector": "#email",
       "value": "user@example.com"
     }
   }
   ```

3. **Click a button**:
   ```json
   {
     "tool": "click",
     "arguments": {
       "selector": "button[type='submit']"
     }
   }
   ```

4. **Take a screenshot**:
   ```json
   {
     "tool": "screenshot",
     "arguments": {
       "options": {
         "path": "screenshot.png",
         "fullPage": true
       }
     }
   }
   ```

## Browser Support

- **Chromium** (default): Fast and reliable, good for most use cases
- **Firefox**: Alternative engine, useful for cross-browser testing
- **WebKit**: Safari's engine, good for iOS/macOS compatibility testing

## Security Considerations

- The server runs with full browser automation capabilities
- Be cautious when navigating to untrusted websites
- Consider running in headless mode for security
- Validate all user inputs before execution

## Error Handling

The server provides detailed error messages and automatically handles:
- Missing page sessions (prompts to navigate first)
- Invalid selectors
- Network timeouts
- Browser launch failures

## Development

### Project Structure
```
src/
├── index.ts          # Main MCP server implementation
├── schemas/          # Zod validation schemas (inline)
└── handlers/         # Tool handlers (inline)
```

### Adding New Tools
1. Define a Zod schema for validation
2. Add the tool definition to the `ListToolsRequestSchema` handler
3. Add a case in the `CallToolRequestSchema` handler
4. Implement the handler method

## License

MIT License - see LICENSE file for details.