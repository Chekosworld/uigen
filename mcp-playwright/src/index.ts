#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { z } from 'zod';

const NavigateSchema = z.object({
  url: z.string().url(),
  browser: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
  headless: z.boolean().default(true),
});

const ClickSchema = z.object({
  selector: z.string(),
  options: z.object({
    button: z.enum(['left', 'right', 'middle']).optional(),
    clickCount: z.number().optional(),
    delay: z.number().optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
    modifiers: z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift'])).optional(),
    force: z.boolean().optional(),
    noWaitAfter: z.boolean().optional(),
    trial: z.boolean().optional(),
    timeout: z.number().optional(),
  }).optional(),
});

const TypeSchema = z.object({
  selector: z.string(),
  text: z.string(),
  options: z.object({
    delay: z.number().optional(),
    noWaitAfter: z.boolean().optional(),
    timeout: z.number().optional(),
  }).optional(),
});

const WaitForSelectorSchema = z.object({
  selector: z.string(),
  options: z.object({
    state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional(),
    timeout: z.number().optional(),
  }).optional(),
});

const GetTextSchema = z.object({
  selector: z.string(),
});

const GetAttributeSchema = z.object({
  selector: z.string(),
  attribute: z.string(),
});

const EvaluateSchema = z.object({
  expression: z.string(),
});

const ScreenshotSchema = z.object({
  options: z.object({
    path: z.string().optional(),
    type: z.enum(['png', 'jpeg']).optional(),
    quality: z.number().min(0).max(100).optional(),
    fullPage: z.boolean().optional(),
    clip: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).optional(),
    omitBackground: z.boolean().optional(),
  }).optional(),
});

const FillSchema = z.object({
  selector: z.string(),
  value: z.string(),
  options: z.object({
    force: z.boolean().optional(),
    noWaitAfter: z.boolean().optional(),
    timeout: z.number().optional(),
  }).optional(),
});

const SelectOptionSchema = z.object({
  selector: z.string(),
  values: z.union([z.string(), z.array(z.string())]),
  options: z.object({
    force: z.boolean().optional(),
    noWaitAfter: z.boolean().optional(),
    timeout: z.number().optional(),
  }).optional(),
});

const ScrollSchema = z.object({
  selector: z.string().optional(),
  options: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    behavior: z.enum(['auto', 'smooth']).optional(),
  }).optional(),
});

const PressKeySchema = z.object({
  selector: z.string(),
  key: z.string(),
  options: z.object({
    delay: z.number().optional(),
    noWaitAfter: z.boolean().optional(),
    timeout: z.number().optional(),
  }).optional(),
});

const GetPageInfoSchema = z.object({});

const WaitForLoadStateSchema = z.object({
  state: z.enum(['load', 'domcontentloaded', 'networkidle']).default('load'),
  options: z.object({
    timeout: z.number().optional(),
  }).optional(),
});

const GoBackSchema = z.object({
  options: z.object({
    timeout: z.number().optional(),
    waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional(),
  }).optional(),
});

const GoForwardSchema = z.object({
  options: z.object({
    timeout: z.number().optional(),
    waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional(),
  }).optional(),
});

const ReloadSchema = z.object({
  options: z.object({
    timeout: z.number().optional(),
    waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional(),
  }).optional(),
});

class PlaywrightMCPServer {
  private server: Server;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'playwright-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'navigate',
          description: 'Navigate to a URL in the browser',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', format: 'uri', description: 'URL to navigate to' },
              browser: { 
                type: 'string', 
                enum: ['chromium', 'firefox', 'webkit'], 
                default: 'chromium',
                description: 'Browser engine to use'
              },
              headless: { 
                type: 'boolean', 
                default: true,
                description: 'Run browser in headless mode'
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'click',
          description: 'Click on an element specified by selector',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector or text selector' },
              options: {
                type: 'object',
                properties: {
                  button: { type: 'string', enum: ['left', 'right', 'middle'] },
                  clickCount: { type: 'number' },
                  delay: { type: 'number' },
                  position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
                  modifiers: { type: 'array', items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] } },
                  force: { type: 'boolean' },
                  noWaitAfter: { type: 'boolean' },
                  trial: { type: 'boolean' },
                  timeout: { type: 'number' },
                },
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'type',
          description: 'Type text into an input element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector for the input element' },
              text: { type: 'string', description: 'Text to type' },
              options: {
                type: 'object',
                properties: {
                  delay: { type: 'number' },
                  noWaitAfter: { type: 'boolean' },
                  timeout: { type: 'number' },
                },
              },
            },
            required: ['selector', 'text'],
          },
        },
        {
          name: 'wait_for_selector',
          description: 'Wait for an element to appear/disappear',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector to wait for' },
              options: {
                type: 'object',
                properties: {
                  state: { type: 'string', enum: ['attached', 'detached', 'visible', 'hidden'] },
                  timeout: { type: 'number' },
                },
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'get_text',
          description: 'Get text content of an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector of the element' },
            },
            required: ['selector'],
          },
        },
        {
          name: 'get_attribute',
          description: 'Get attribute value of an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector of the element' },
              attribute: { type: 'string', description: 'Attribute name to get' },
            },
            required: ['selector', 'attribute'],
          },
        },
        {
          name: 'evaluate',
          description: 'Execute JavaScript in the page context',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string', description: 'JavaScript expression to evaluate' },
            },
            required: ['expression'],
          },
        },
        {
          name: 'screenshot',
          description: 'Take a screenshot of the page',
          inputSchema: {
            type: 'object',
            properties: {
              options: {
                type: 'object',
                properties: {
                  path: { type: 'string', description: 'Path to save the screenshot' },
                  type: { type: 'string', enum: ['png', 'jpeg'] },
                  quality: { type: 'number', minimum: 0, maximum: 100 },
                  fullPage: { type: 'boolean' },
                  clip: {
                    type: 'object',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                      width: { type: 'number' },
                      height: { type: 'number' },
                    },
                    required: ['x', 'y', 'width', 'height'],
                  },
                  omitBackground: { type: 'boolean' },
                },
              },
            },
          },
        },
        {
          name: 'fill',
          description: 'Fill an input field with text (better than type for forms)',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector for the input element' },
              value: { type: 'string', description: 'Value to fill' },
              options: {
                type: 'object',
                properties: {
                  force: { type: 'boolean' },
                  noWaitAfter: { type: 'boolean' },
                  timeout: { type: 'number' },
                },
              },
            },
            required: ['selector', 'value'],
          },
        },
        {
          name: 'select_option',
          description: 'Select option(s) in a select element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector for the select element' },
              values: { 
                oneOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } }
                ],
                description: 'Option value(s) to select'
              },
              options: {
                type: 'object',
                properties: {
                  force: { type: 'boolean' },
                  noWaitAfter: { type: 'boolean' },
                  timeout: { type: 'number' },
                },
              },
            },
            required: ['selector', 'values'],
          },
        },
        {
          name: 'scroll',
          description: 'Scroll the page or an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector of element to scroll (optional, scrolls page if not provided)' },
              options: {
                type: 'object',
                properties: {
                  x: { type: 'number', description: 'Horizontal scroll position' },
                  y: { type: 'number', description: 'Vertical scroll position' },
                  behavior: { type: 'string', enum: ['auto', 'smooth'] },
                },
              },
            },
          },
        },
        {
          name: 'press_key',
          description: 'Press a keyboard key on an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string', description: 'CSS selector of the element' },
              key: { type: 'string', description: 'Key to press (e.g., "Enter", "Tab", "Escape")' },
              options: {
                type: 'object',
                properties: {
                  delay: { type: 'number' },
                  noWaitAfter: { type: 'boolean' },
                  timeout: { type: 'number' },
                },
              },
            },
            required: ['selector', 'key'],
          },
        },
        {
          name: 'get_page_info',
          description: 'Get current page information (URL, title, etc.)',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'wait_for_load_state',
          description: 'Wait for page to reach a specific load state',
          inputSchema: {
            type: 'object',
            properties: {
              state: { 
                type: 'string', 
                enum: ['load', 'domcontentloaded', 'networkidle'], 
                default: 'load',
                description: 'Load state to wait for'
              },
              options: {
                type: 'object',
                properties: {
                  timeout: { type: 'number' },
                },
              },
            },
          },
        },
        {
          name: 'go_back',
          description: 'Navigate back in browser history',
          inputSchema: {
            type: 'object',
            properties: {
              options: {
                type: 'object',
                properties: {
                  timeout: { type: 'number' },
                  waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle', 'commit'] },
                },
              },
            },
          },
        },
        {
          name: 'go_forward',
          description: 'Navigate forward in browser history',
          inputSchema: {
            type: 'object',
            properties: {
              options: {
                type: 'object',
                properties: {
                  timeout: { type: 'number' },
                  waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle', 'commit'] },
                },
              },
            },
          },
        },
        {
          name: 'reload',
          description: 'Reload/refresh the current page',
          inputSchema: {
            type: 'object',
            properties: {
              options: {
                type: 'object',
                properties: {
                  timeout: { type: 'number' },
                  waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle', 'commit'] },
                },
              },
            },
          },
        },
        {
          name: 'close_browser',
          description: 'Close the browser and cleanup resources',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'navigate':
            return await this.handleNavigate(args);
          case 'click':
            return await this.handleClick(args);
          case 'type':
            return await this.handleType(args);
          case 'wait_for_selector':
            return await this.handleWaitForSelector(args);
          case 'get_text':
            return await this.handleGetText(args);
          case 'get_attribute':
            return await this.handleGetAttribute(args);
          case 'evaluate':
            return await this.handleEvaluate(args);
          case 'screenshot':
            return await this.handleScreenshot(args);
          case 'fill':
            return await this.handleFill(args);
          case 'select_option':
            return await this.handleSelectOption(args);
          case 'scroll':
            return await this.handleScroll(args);
          case 'press_key':
            return await this.handlePressKey(args);
          case 'get_page_info':
            return await this.handleGetPageInfo(args);
          case 'wait_for_load_state':
            return await this.handleWaitForLoadState(args);
          case 'go_back':
            return await this.handleGoBack(args);
          case 'go_forward':
            return await this.handleGoForward(args);
          case 'reload':
            return await this.handleReload(args);
          case 'close_browser':
            return await this.handleCloseBrowser();
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async ensurePage(): Promise<Page> {
    if (!this.page) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'No active browser session. Please navigate to a URL first.'
      );
    }
    return this.page;
  }

  private async handleNavigate(args: any) {
    const { url, browser: browserType, headless } = NavigateSchema.parse(args);

    if (this.browser) {
      await this.browser.close();
    }

    let browserEngine;
    switch (browserType) {
      case 'firefox':
        browserEngine = firefox;
        break;
      case 'webkit':
        browserEngine = webkit;
        break;
      default:
        browserEngine = chromium;
    }

    this.browser = await browserEngine.launch({ headless });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    await this.page.goto(url);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully navigated to ${url} using ${browserType}${headless ? ' (headless)' : ' (headed)'}`,
        },
      ],
    };
  }

  private async handleClick(args: any) {
    const { selector, options } = ClickSchema.parse(args);
    const page = await this.ensurePage();

    await page.click(selector, options);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully clicked on element: ${selector}`,
        },
      ],
    };
  }

  private async handleType(args: any) {
    const { selector, text, options } = TypeSchema.parse(args);
    const page = await this.ensurePage();

    await page.type(selector, text, options);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully typed "${text}" into element: ${selector}`,
        },
      ],
    };
  }

  private async handleWaitForSelector(args: any) {
    const { selector, options } = WaitForSelectorSchema.parse(args);
    const page = await this.ensurePage();

    await page.waitForSelector(selector, options || {});

    return {
      content: [
        {
          type: 'text',
          text: `Successfully waited for selector: ${selector}`,
        },
      ],
    };
  }

  private async handleGetText(args: any) {
    const { selector } = GetTextSchema.parse(args);
    const page = await this.ensurePage();

    const text = await page.textContent(selector);

    return {
      content: [
        {
          type: 'text',
          text: `Text content of ${selector}: ${text || '(empty)'}`,
        },
      ],
    };
  }

  private async handleGetAttribute(args: any) {
    const { selector, attribute } = GetAttributeSchema.parse(args);
    const page = await this.ensurePage();

    const value = await page.getAttribute(selector, attribute);

    return {
      content: [
        {
          type: 'text',
          text: `Attribute "${attribute}" of ${selector}: ${value || '(not found)'}`,
        },
      ],
    };
  }

  private async handleEvaluate(args: any) {
    const { expression } = EvaluateSchema.parse(args);
    const page = await this.ensurePage();

    const result = await page.evaluate(expression);

    return {
      content: [
        {
          type: 'text',
          text: `Evaluation result: ${JSON.stringify(result)}`,
        },
      ],
    };
  }

  private async handleScreenshot(args: any) {
    const { options } = ScreenshotSchema.parse(args || {});
    const page = await this.ensurePage();

    const screenshot = await page.screenshot(options);

    if (options?.path) {
      return {
        content: [
          {
            type: 'text',
            text: `Screenshot saved to: ${options.path}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Screenshot taken (${screenshot.length} bytes)`,
          },
        ],
      };
    }
  }

  private async handleFill(args: any) {
    const { selector, value, options } = FillSchema.parse(args);
    const page = await this.ensurePage();

    await page.fill(selector, value, options);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully filled "${value}" into element: ${selector}`,
        },
      ],
    };
  }

  private async handleSelectOption(args: any) {
    const { selector, values, options } = SelectOptionSchema.parse(args);
    const page = await this.ensurePage();

    await page.selectOption(selector, values, options);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully selected option(s) ${JSON.stringify(values)} in element: ${selector}`,
        },
      ],
    };
  }

  private async handleScroll(args: any) {
    const { selector, options } = ScrollSchema.parse(args || {});
    const page = await this.ensurePage();

    if (selector) {
      const element = await page.locator(selector);
      await element.scrollIntoViewIfNeeded();
    } else if (options?.x !== undefined || options?.y !== undefined) {
      await page.evaluate(({ x, y, behavior }: { x?: number; y?: number; behavior?: 'auto' | 'smooth' }) => {
        window.scrollTo({ left: x, top: y, behavior });
      }, options);
    }

    return {
      content: [
        {
          type: 'text',
          text: selector 
            ? `Successfully scrolled to element: ${selector}`
            : `Successfully scrolled page to position (${options?.x || 0}, ${options?.y || 0})`,
        },
      ],
    };
  }

  private async handlePressKey(args: any) {
    const { selector, key, options } = PressKeySchema.parse(args);
    const page = await this.ensurePage();

    await page.press(selector, key, options);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully pressed key "${key}" on element: ${selector}`,
        },
      ],
    };
  }

  private async handleGetPageInfo(args: any) {
    GetPageInfoSchema.parse(args || {});
    const page = await this.ensurePage();

    const url = page.url();
    const title = await page.title();
    
    return {
      content: [
        {
          type: 'text',
          text: `Page Info:\nURL: ${url}\nTitle: ${title}`,
        },
      ],
    };
  }

  private async handleWaitForLoadState(args: any) {
    const { state, options } = WaitForLoadStateSchema.parse(args || {});
    const page = await this.ensurePage();

    await page.waitForLoadState(state, options);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully waited for load state: ${state}`,
        },
      ],
    };
  }

  private async handleGoBack(args: any) {
    const { options } = GoBackSchema.parse(args || {});
    const page = await this.ensurePage();

    await page.goBack(options);

    return {
      content: [
        {
          type: 'text',
          text: 'Successfully navigated back',
        },
      ],
    };
  }

  private async handleGoForward(args: any) {
    const { options } = GoForwardSchema.parse(args || {});
    const page = await this.ensurePage();

    await page.goForward(options);

    return {
      content: [
        {
          type: 'text',
          text: 'Successfully navigated forward',
        },
      ],
    };
  }

  private async handleReload(args: any) {
    const { options } = ReloadSchema.parse(args || {});
    const page = await this.ensurePage();

    await page.reload(options);

    return {
      content: [
        {
          type: 'text',
          text: 'Successfully reloaded page',
        },
      ],
    };
  }

  private async handleCloseBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Browser closed successfully',
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Playwright MCP server running on stdio');
  }
}

const server = new PlaywrightMCPServer();
server.run().catch(console.error);