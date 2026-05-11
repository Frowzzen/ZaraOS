# ZaraOS Tool Calling Architecture

## Overview

Tool calling is the mechanism by which AI responses trigger real OS actions. Instead of Zara generating text and hoping the user acts on it, Zara can directly invoke registered tools — with permission gates and confirmation rules enforced at every step.

**Current state (Alpha 0.3):** Architecture is fully declared. All tool execution is mocked. No real actions occur.

**Future (Alpha 0.5+):** Real tool execution, sandboxed via Tauri.

## Architecture

```
AI Provider (e.g. Ollama/OpenAI with tool-calling support)
    ↓ returns: ToolCall[]
AI Runtime
    ↓ validates tool exists, checks permissions
Tool Executor
    ↓ checks confirmation gate
[confirmation dialog if required]
    ↓ user confirms
Tool Executor dispatches to:
    ├── Skill Runtime (skill tools)
    ├── Tauri invoke() (file/system tools)
    └── OS API (app launching, settings)
    ↓
ToolResult → fed back into AI conversation context
    ↓
AI generates final response summarizing what was done
```

## Tool Registry

All tools are registered in `toolRegistry` at startup. Each tool declares:

| Field | Purpose |
|---|---|
| `id` | Unique tool identifier (e.g. `zara.set_timer`) |
| `name` | Human-readable name |
| `description` | AI-readable description of what the tool does |
| `category` | skill / file / app / media / system / developer / communication |
| `parameters` | Array of typed parameter schemas |
| `requiresPermission` | PermissionCategory gate |
| `requiresConfirmation` | Whether to pause and ask before executing |
| `dangerous` | Whether the action is irreversible |
| `skillId` | Maps to Skill Runtime if category === "skill" |

## Built-in Tools (Alpha 0.3)

| Tool ID | Category | Confirmation |
|---|---|---|
| `zara.open_app` | app | No |
| `zara.set_timer` | skill | No |
| `zara.search_web` | skill | No (requires network permission) |
| `zara.send_email` | communication | Yes |
| `zara.delete_files` | file | Yes + DANGEROUS |
| `zara.change_settings` | system | Yes |

## Execution Gates (in order)

1. **Tool exists** — reject unknown tool IDs
2. **Tool enabled** — reject disabled tools
3. **Permission granted** — reject if required permission not granted
4. **Confirmation** — pause and show dialog if `requiresConfirmation: true`
5. **Execute** — dispatch to the appropriate backend
6. **Result** — return `ToolResult` with success/failure and output string

No gate can be skipped. Gate 4 (confirmation) requires `context.confirmedByUser: true` to be set by the Confirmation Dialog before re-dispatch.

## Provider Tool-Calling Support

Not all providers support tool calling:

| Provider | Tools Supported |
|---|---|
| Local (simulated) | No — uses intent routing instead |
| Ollama | No (llama3.1+ has partial support — future) |
| llama.cpp | No |
| OpenAI | Yes (gpt-4o, gpt-4o-mini) |
| Anthropic | Yes (claude-3.5+) |
| Gemini | Yes (gemini-1.5+) |

For providers without tool support, ZaraOS uses the existing command-router intent system as the equivalent.

## Adding a New Tool

1. Declare the tool in `tools/tool-registry.ts`:
```typescript
toolRegistry.register({
  id: "zara.my_tool",
  name: "My Tool",
  description: "What this tool does, written for the AI to understand.",
  category: "skill",
  parameters: [
    { name: "input", type: "string", description: "The input value", required: true }
  ],
  requiresConfirmation: false,
  dangerous: false,
  enabled: true,
  version: "0.3.0",
});
```

2. Add a mocked result in `ToolExecutor.getMockedOutput()`.

3. When real execution is ready: add the real handler in `ToolExecutor.execute()` gated on `!ALPHA_MOCK_MODE`.

## Plugin Tool Registration (Future)

Third-party plugins will be able to register tools via the plugin manifest:

```json
{
  "toolDeclarations": [
    {
      "id": "plugin.my_tool",
      "name": "My Plugin Tool",
      "description": "...",
      "parameters": [...],
      "requiresConfirmation": true,
      "sandboxed": true
    }
  ]
}
```

Plugin tools will be sandboxed with Tauri's IPC allowlist — they cannot access OS resources beyond what their manifest declares.
