// Ambient typing and shared shapes for the WebMCP browser API
// (`navigator.modelContext`), a W3C Web Machine Learning Community Group
// draft that TypeScript's DOM lib does not cover yet. Chrome 146+ exposes
// it behind chrome://flags ("WebMCP" / "model-context"); everywhere else
// `navigator.modelContext` is simply `undefined` and this app registers
// nothing. Only the surface this app actually uses is declared here.

export interface WebMcpToolResult {
  content: Array<{ type: 'text'; text: string }>
}

export interface WebMcpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  // MCP-style hints the agent host uses to decide when to ask the user
  // first. Mutating tools set `readOnlyHint: false` so a confirmation
  // step gates them; read/navigation tools set `readOnlyHint: true`.
  annotations?: Record<string, boolean>
  execute: (args: Record<string, unknown>) => WebMcpToolResult | Promise<WebMcpToolResult>
}

export interface WebMcpContext {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void
}

declare global {
  interface Navigator {
    readonly modelContext?: WebMcpContext
  }
  interface Window {
    // Dev-only console handle installed by useAgentTools() when
    // import.meta.env.DEV is set: `await window.__agentTools.list_findings({})`.
    // Lets the tools be exercised without a WebMCP-capable browser.
    __agentTools?: Record<string, (args?: Record<string, unknown>) => Promise<unknown>>
  }
}
