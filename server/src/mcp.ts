import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  JiraTicket,
  JiraComment,
  CodeSearchResult,
  FileContent,
} from "../../shared/src/index.js";

// === MCP Client Initialization ===

let jiraClient: Client | null = null;
let octocodeClient: Client | null = null;

export class McpError extends Error {
  constructor(
    message: string,
    public server: "jira" | "octocode"
  ) {
    super(message);
    this.name = "McpError";
  }
}

async function getJiraClient(): Promise<Client> {
  if (jiraClient) return jiraClient;

  const url = process.env.JIRA_MCP_SERVER_URL;
  if (!url) {
    throw new McpError("Missing JIRA_MCP_SERVER_URL environment variable", "jira");
  }

  try {
    const client = new Client({ name: "bug-triage-jira", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(url));
    await client.connect(transport);
    jiraClient = client;
    return client;
  } catch (err: any) {
    throw new McpError(
      `Failed to connect to Jira MCP server at ${url}: ${err.message}`,
      "jira"
    );
  }
}

async function getOctocodeClient(): Promise<Client> {
  if (octocodeClient) return octocodeClient;

  const accessKey = process.env.OCTOCODE_USER_ACCESS_KEY;
  const baseUrl = process.env.OCTOCODE_BASE_URL;
  if (!accessKey || !baseUrl) {
    throw new McpError(
      "Missing OCTOCODE_USER_ACCESS_KEY or OCTOCODE_BASE_URL environment variables",
      "octocode"
    );
  }

  try {
    const client = new Client({ name: "bug-triage-octocode", version: "1.0.0" });
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@mcp-s/mcp"],
      env: {
        ...process.env as Record<string, string>,
        USER_ACCESS_KEY: accessKey,
        BASE_URL: baseUrl,
        MCP: "octocode",
      },
    });
    await client.connect(transport);
    octocodeClient = client;
    return client;
  } catch (err: any) {
    throw new McpError(
      `Failed to start Octocode MCP server: ${err.message}`,
      "octocode"
    );
  }
}

// === Tool Discovery ===

export async function discoverTools(): Promise<void> {
  console.log("Discovering MCP server tools...\n");

  try {
    const jira = await getJiraClient();
    const jiraTools = await jira.listTools();
    console.log("=== Jira MCP Tools ===");
    for (const tool of jiraTools.tools) {
      console.log(`  - ${tool.name}: ${tool.description ?? "(no description)"}`);
      if (tool.inputSchema) {
        const props = (tool.inputSchema as any).properties ?? {};
        const required = (tool.inputSchema as any).required ?? [];
        const params = Object.keys(props).map(
          (k) => `${k}${required.includes(k) ? "*" : ""}`
        );
        if (params.length) console.log(`    params: ${params.join(", ")}`);
      }
    }
  } catch (err: any) {
    console.error(`Jira MCP: ${err.message}`);
  }

  try {
    const octocode = await getOctocodeClient();
    const octocodeTools = await octocode.listTools();
    console.log("\n=== Octocode MCP Tools ===");
    for (const tool of octocodeTools.tools) {
      console.log(`  - ${tool.name}: ${tool.description ?? "(no description)"}`);
      if (tool.inputSchema) {
        const props = (tool.inputSchema as any).properties ?? {};
        const required = (tool.inputSchema as any).required ?? [];
        const params = Object.keys(props).map(
          (k) => `${k}${required.includes(k) ? "*" : ""}`
        );
        if (params.length) console.log(`    params: ${params.join(", ")}`);
      }
    }
  } catch (err: any) {
    console.error(`Octocode MCP: ${err.message}`);
  }

  console.log("");
}

// === Jira Operations ===

export async function fetchTicket(ticketKey: string): Promise<JiraTicket> {
  const client = await getJiraClient();

  try {
    const result = await client.callTool({
      name: "get_issues",
      arguments: { issueKeys: [ticketKey] },
    });

    const content = result.content as Array<{ type: string; text?: string }>;
    const textContent = content.find((c) => c.type === "text");
    if (!textContent?.text) {
      throw new McpError(`No data returned for ticket ${ticketKey}`, "jira");
    }

    const data = JSON.parse(textContent.text);
    const issue = Array.isArray(data) ? data[0] : data;

    if (!issue) {
      throw new McpError(`Ticket ${ticketKey} not found`, "jira");
    }

    return {
      key: issue.key ?? ticketKey,
      summary: issue.fields?.summary ?? issue.summary ?? "",
      description: issue.fields?.description ?? issue.description ?? null,
      status: issue.fields?.status?.name ?? issue.status ?? "Unknown",
      priority: issue.fields?.priority?.name ?? issue.priority ?? "Unknown",
      labels: issue.fields?.labels ?? issue.labels ?? [],
      components: (issue.fields?.components ?? issue.components ?? []).map(
        (c: any) => (typeof c === "string" ? c : c.name)
      ),
      assignee:
        issue.fields?.assignee?.displayName ?? issue.assignee ?? null,
      comments: [],
    };
  } catch (err: any) {
    if (err instanceof McpError) throw err;
    throw new McpError(`Failed to fetch ticket ${ticketKey}: ${err.message}`, "jira");
  }
}

export async function fetchComments(ticketKey: string): Promise<JiraComment[]> {
  const client = await getJiraClient();

  try {
    const result = await client.callTool({
      name: "get_issues",
      arguments: { issueKeys: [ticketKey], fields: ["comment"] },
    });

    const content = result.content as Array<{ type: string; text?: string }>;
    const textContent = content.find((c) => c.type === "text");
    if (!textContent?.text) return [];

    const data = JSON.parse(textContent.text);
    const issue = Array.isArray(data) ? data[0] : data;
    const comments =
      issue?.fields?.comment?.comments ?? issue?.comments ?? [];

    return comments.map((c: any) => ({
      author: c.author?.displayName ?? c.author ?? "Unknown",
      body: typeof c.body === "string" ? c.body : extractTextFromAdf(c.body),
      created: c.created ?? "",
    }));
  } catch (err: any) {
    if (err instanceof McpError) throw err;
    throw new McpError(`Failed to fetch comments for ${ticketKey}: ${err.message}`, "jira");
  }
}

export async function fetchTicketWithComments(
  ticketKey: string
): Promise<JiraTicket> {
  const [ticket, comments] = await Promise.all([
    fetchTicket(ticketKey),
    fetchComments(ticketKey),
  ]);
  return { ...ticket, comments };
}

// === Code Search Operations ===

export async function searchCode(
  query: string,
  repos: string[]
): Promise<CodeSearchResult[]> {
  const client = await getOctocodeClient();

  try {
    const result = await client.callTool({
      name: "search_code",
      arguments: { query, repositories: repos },
    });

    const content = result.content as Array<{ type: string; text?: string }>;
    const textContent = content.find((c) => c.type === "text");
    if (!textContent?.text) return [];

    const data = JSON.parse(textContent.text);
    const items = Array.isArray(data) ? data : data.items ?? [];

    return items.map((item: any) => ({
      path: item.path ?? "",
      repo: item.repo ?? item.repository ?? "",
      url: item.url ?? item.html_url ?? "",
      snippet: item.snippet ?? item.text ?? "",
    }));
  } catch (err: any) {
    if (err instanceof McpError) throw err;
    throw new McpError(`Code search failed: ${err.message}`, "octocode");
  }
}

export async function readFileContent(
  repo: string,
  path: string,
  ref?: string
): Promise<FileContent> {
  const client = await getOctocodeClient();

  try {
    const result = await client.callTool({
      name: "read_file",
      arguments: { repository: repo, path, ...(ref ? { ref } : {}) },
    });

    const content = result.content as Array<{ type: string; text?: string }>;
    const textContent = content.find((c) => c.type === "text");
    if (!textContent?.text) {
      throw new McpError(`No content returned for ${repo}/${path}`, "octocode");
    }

    const data = JSON.parse(textContent.text);

    return {
      path: data.path ?? path,
      repo: data.repo ?? repo,
      content: data.content ?? textContent.text,
      url: data.url ?? data.html_url ?? "",
    };
  } catch (err: any) {
    if (err instanceof McpError) throw err;
    throw new McpError(`Failed to read file ${repo}/${path}: ${err.message}`, "octocode");
  }
}

export async function listDirectory(
  repo: string,
  path: string
): Promise<{ name: string; type: string; path: string }[]> {
  const client = await getOctocodeClient();

  try {
    const result = await client.callTool({
      name: "list_directory",
      arguments: { repository: repo, path },
    });

    const content = result.content as Array<{ type: string; text?: string }>;
    const textContent = content.find((c) => c.type === "text");
    if (!textContent?.text) return [];

    const data = JSON.parse(textContent.text);
    const items = Array.isArray(data) ? data : data.items ?? [];

    return items.map((item: any) => ({
      name: item.name ?? "",
      type: item.type ?? "file",
      path: item.path ?? "",
    }));
  } catch (err: any) {
    if (err instanceof McpError) throw err;
    throw new McpError(`Failed to list directory ${repo}/${path}: ${err.message}`, "octocode");
  }
}

// === Helpers ===

function extractTextFromAdf(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text") return node.text ?? "";
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromAdf).join("\n");
  }
  return "";
}
