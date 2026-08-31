type DevelopmentModelContext = WebMCP.ModelContext & {
  executeTool(name: string, input?: Record<string, unknown>): Promise<unknown>;
};

declare global {
  interface Window {
    __webMcpDev?: {
      list(): Promise<string[]>;
      execute(name: string, input?: Record<string, unknown>): Promise<unknown>;
    };
  }
}

class ModelContextShim extends EventTarget implements DevelopmentModelContext {
  ontoolchange: ((this: WebMCP.ModelContext, ev: Event) => unknown) | null = null;
  private tools = new Map<string, WebMCP.ModelContextTool>();

  async registerTool(tool: WebMCP.ModelContextTool, options?: WebMCP.ModelContextRegisterToolOptions) {
    if (options?.signal?.aborted) throw new DOMException('Registration aborted.', 'AbortError');
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => {
      if (this.tools.get(tool.name) === tool) {
        this.tools.delete(tool.name);
        this.announceChange();
      }
    }, { once: true });
    this.announceChange();
  }

  async getTools() {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      title: tool.title ?? tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema ? structuredClone(tool.inputSchema) : undefined,
      window,
      origin: window.location.origin,
      annotations: tool.annotations,
    }));
  }

  async executeTool(name: string, input: Record<string, unknown> = {}) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`WebMCP tool is not registered: ${name}`);
    const controller = new AbortController();
    return tool.execute(input, { signal: controller.signal });
  }

  private announceChange() {
    const event = new Event('toolchange');
    this.dispatchEvent(event);
    this.ontoolchange?.call(this, event);
  }
}

export function installWebMcpDevShim() {
  const modelContext = new ModelContextShim();
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: modelContext,
  });
  window.__webMcpDev = {
    list: async () => (await modelContext.getTools()).map((tool) => tool.name),
    execute: (name, input) => modelContext.executeTool(name, input),
  };
}
