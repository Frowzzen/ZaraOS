# ZaraOS AI Runtime Architecture

## Overview

The AI Runtime is the intelligence orchestration layer between the Zara Runtime (OS brain) and the actual AI providers (local or cloud). It handles everything related to intelligence: provider selection, prompt construction, conversation memory, context injection, model routing, and tool calling.

```
UI Layer (React)
    ↓ useRuntime()
Zara Runtime (zaraRuntime singleton)
    ↓ sendAssistantMessage() / executeAICommand()
AI Runtime (aiRuntime singleton)
    ↓ buildPrompt() → route() → dispatch()
Request Router
    ↓
Provider Router → selects best available provider
    ↓
Model Router → selects best model for request type
    ↓
Provider Adapter (local / ollama / llamacpp / openai / anthropic / gemini)
    ↓
Response → Memory → Context update → UI
```

## Layer Responsibilities

### Zara Runtime
- Entry point for all OS commands
- Permission enforcement
- Skill routing
- Delegates AI messages to AI Runtime

### AI Runtime
- Assembles full prompt (system + context + history)
- Selects provider via Provider Router
- Manages conversation memory
- Handles streaming lifecycle
- Emits status events (thinking, speaking, done)

### Provider Router
- Local-first selection strategy
- Availability checking (health checks)
- Cloud fallback (only if cloud_ai permission granted)
- Offline mode enforcement

### Model Router
- Request type classification
- Model-per-task optimization
- Latency estimation

### Provider Adapters
- Implement the `AIProviderAdapter` interface
- Handle provider-specific API formats
- Degrade gracefully when unavailable
- Return simulated responses in Alpha 0.3

### Context Injectors
- System context: active panel, input mode, system stats
- Privacy context: mic/camera/AI/network state
- Skills context: available skills, recent usage

### Conversation Memory
- Session management (start, resume, continue)
- Message history with context window pruning
- Skill usage tracking
- User preference persistence

## File Structure

```
src/core/ai/
├── ai-runtime.ts              ← Central orchestration singleton
├── models/
│   └── ai-capabilities.ts    ← Capability type system
├── providers/
│   ├── provider-adapter.ts   ← Interface all providers implement
│   ├── local-provider.ts     ← Default simulated runtime (always on)
│   ├── ollama-provider.ts    ← Ollama REST integration
│   ├── llamacpp-provider.ts  ← llama.cpp server integration
│   ├── openai-provider.ts    ← OpenAI cloud (disabled by default)
│   ├── anthropic-provider.ts ← Anthropic cloud (disabled by default)
│   └── gemini-provider.ts    ← Google Gemini cloud (disabled by default)
├── memory/
│   ├── memory-types.ts       ← All memory interfaces
│   ├── conversation-memory.ts← Memory manager singleton
│   └── memory-storage.ts     ← localStorage persistence layer
├── prompts/
│   └── zara-system-prompt.ts ← Personality, behavior rules, context builder
├── routing/
│   ├── provider-router.ts    ← Provider selection strategy
│   ├── model-router.ts       ← Model-per-task selection
│   └── request-router.ts     ← Full request dispatch orchestration
├── context/
│   ├── system-context.ts     ← OS state capture
│   ├── privacy-context.ts    ← Permission state capture
│   ├── skills-context.ts     ← Skill state capture
│   └── context-injector.ts   ← Assembles all context sources
└── tools/
    ├── tool-types.ts         ← Tool calling type system
    ├── tool-registry.ts      ← Tool declarations and registry
    └── tool-executor.ts      ← Tool execution (mocked in Alpha 0.3)
```

## Prompt Construction

Every message sent to the AI Runtime is preceded by a full prompt stack:

```
1. ZARA_BASE_SYSTEM_PROMPT     ← Personality, identity, behavior rules
2. ZARA_PRIVACY_PRINCIPLES     ← Privacy-first rules
3. ZARA_LOCAL_FIRST_PHILOSOPHY ← Why local matters
4. ZARA_CONFIRMATION_RULES     ← How confirmation works
5. ZARA_SKILL_PHILOSOPHY       ← Skill routing behavior
6. ZARA_SAFETY_RULES           ← What Zara won't do
7. ZARA_COMMAND_PARSING        ← How to interpret OS commands
8. Context Block               ← Current OS state, privacy state, skills
9. Conversation History        ← Last N messages (pruned to context window)
10. User Message               ← The actual input
```

## Streaming Architecture

Streaming responses flow from provider to UI through callbacks:

```
provider.streamMessage(messages, onChunk, options)
    ↓ onChunk({ delta: "...", done: false })
AI Runtime accumulates delta, fires status listener
    ↓
RuntimeContext streams content to assistant.tsx
    ↓
React state update: new characters append to message bubble
    ↓
onChunk({ delta: "", done: true })
AI Runtime finalizes, sets status to "speaking" → "idle"
```

In Alpha 0.3, streaming is simulated by emitting 3 characters every 28ms.

## Memory Context Window Management

To prevent exceeding provider context limits, conversation history is pruned:

1. Estimate tokens for each message (~1 token per 4 characters)
2. Work backwards from most recent message
3. Stop when estimated total exceeds `maxTokens` threshold (default 3000)
4. Always include the system prompt (not counted against user limit)
5. Always include the current user message

## Portability Guarantees

The AI Runtime has zero dependencies on:
- Replit services
- Paid APIs (cloud providers are disabled by default)
- Node.js-specific APIs (runs in browser and Tauri WebView)
- Any npm package beyond the monorepo's existing dependencies

When Tauri is added: the provider adapters are the only files that change. The AI Runtime, memory, routing, context, and tools layers stay identical.
