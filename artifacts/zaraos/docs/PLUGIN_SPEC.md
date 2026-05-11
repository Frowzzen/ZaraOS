# ZaraOS Plugin Specification

## Overview

ZaraOS plugins extend the operating environment with new apps, AI skills, voice commands, gesture packs, and automation workflows. Plugins are declared via a JSON manifest and distributed through the Zara Store (future).

---

## Plugin Manifest Schema

Every plugin must include a `manifest.json` at its root. The schema maps to the `PluginManifest` TypeScript type in `src/core/types.ts`.

```json
{
  "id": "com.developer.plugin-name",
  "name": "Human-Readable Plugin Name",
  "version": "1.0.0",
  "developer": "Developer Name or Organization",
  "description": "What this plugin does in 1-2 sentences.",
  "category": "productivity | media | ai | system | automation | gesture | voice",
  "entryPoint": "dist/index.js",
  "permissions": [
    "files",
    "local_ai",
    "microphone"
  ],
  "voiceCommands": [
    "summarize document",
    "extract key points",
    "read this aloud"
  ],
  "gestureCommands": [
    "OPEN_PALM: activate plugin",
    "SWIPE_RIGHT: next result",
    "PINCH: select item"
  ],
  "aiCapabilities": [
    "text-summarization",
    "question-answering"
  ],
  "systemAccess": false,
  "priceModel": "free | paid | freemium",
  "verified": false,
  "sandboxRequired": true
}
```

---

## Field Reference

| Field              | Type       | Required | Description                                                        |
|--------------------|------------|----------|--------------------------------------------------------------------|
| `id`               | string     | Yes      | Reverse-DNS unique ID. e.g. `com.example.my-plugin`               |
| `name`             | string     | Yes      | Display name shown in UI                                           |
| `version`          | string     | Yes      | Semver string                                                      |
| `developer`        | string     | Yes      | Developer name or org                                              |
| `description`      | string     | Yes      | Short description (max 200 chars)                                  |
| `category`         | enum       | Yes      | One of the defined category values                                 |
| `entryPoint`       | string     | Yes      | Relative path to the plugin entry module                           |
| `permissions`      | string[]   | Yes      | List of `PermissionCategory` values the plugin requires            |
| `voiceCommands`    | string[]   | Yes      | Natural language phrases that trigger this plugin                  |
| `gestureCommands`  | string[]   | Yes      | Gesture type and action pairs                                      |
| `aiCapabilities`   | string[]   | No       | AI features the plugin exposes (for Zara to route AI questions to) |
| `systemAccess`     | boolean    | Yes      | Whether the plugin needs OS-level access                           |
| `priceModel`       | enum       | Yes      | `free`, `paid`, or `freemium`                                      |
| `verified`         | boolean    | Yes      | Set by Zara Store after review — never self-declared               |
| `sandboxRequired`  | boolean    | Yes      | Must be `true` for all third-party plugins                         |

---

## Permission Categories

Plugins can only request these named permissions. The user must have already granted each permission before a plugin can be installed.

| Permission        | What It Enables                                |
|-------------------|------------------------------------------------|
| `microphone`      | Listen for voice input                         |
| `camera`          | Access webcam for gesture or vision features   |
| `local_ai`        | Use local AI engine for inference              |
| `cloud_ai`        | Use user-configured cloud AI (opt-in)          |
| `network`         | Make outbound HTTP requests                    |
| `files`           | Read/write files (user-scoped path only)       |
| `system_actions`  | Launch processes, run allowlisted commands     |
| `plugins`         | Register sub-plugins or extensions             |
| `developer_mode`  | Access advanced developer tools                |

---

## Voice Command Format

Voice commands are strings that the Zara command router will match against. Use natural language phrases. Avoid single-word triggers that could conflict with system commands.

```json
"voiceCommands": [
  "summarize my document",
  "extract key points from this file",
  "start workflow"
]
```

---

## Gesture Command Format

Gesture commands pair a `GestureType` with a plain-language action description.

Supported gesture types: `OPEN_PALM`, `SWIPE_LEFT`, `SWIPE_RIGHT`, `PINCH`, `GRAB`, `FIST`, `TWO_FINGERS_UP`

```json
"gestureCommands": [
  "OPEN_PALM: activate plugin panel",
  "PINCH: select highlighted item",
  "SWIPE_LEFT: go to previous result"
]
```

---

## Example Plugins

### 1. Gesture Music Player
```json
{
  "id": "com.zaraos.gesture-music",
  "name": "Gesture Music Player",
  "category": "media",
  "permissions": ["microphone", "files"],
  "voiceCommands": ["play music", "next track", "pause"],
  "gestureCommands": [
    "SWIPE_RIGHT: next track",
    "SWIPE_LEFT: previous track",
    "FIST: pause",
    "OPEN_PALM: play"
  ],
  "systemAccess": false,
  "sandboxRequired": true
}
```

### 2. Local File Summarizer
```json
{
  "id": "com.zaraos.file-summarizer",
  "name": "Local File Summarizer",
  "category": "ai",
  "permissions": ["files", "local_ai"],
  "voiceCommands": ["summarize this folder", "summarize document", "what is in this file"],
  "gestureCommands": ["TWO_FINGERS_UP: summarize selected"],
  "aiCapabilities": ["text-summarization", "document-qa"],
  "systemAccess": false,
  "sandboxRequired": true
}
```

### 3. Creator Workflow Agent
```json
{
  "id": "com.zaraos.creator-workflow",
  "name": "Creator Workflow Agent",
  "category": "automation",
  "permissions": ["files", "local_ai", "network"],
  "voiceCommands": ["start creator workflow", "publish content", "generate caption"],
  "gestureCommands": ["OPEN_PALM: open workflow"],
  "aiCapabilities": ["text-generation", "image-captioning"],
  "systemAccess": false,
  "sandboxRequired": true
}
```

### 4. Privacy Monitor
```json
{
  "id": "com.zaraos.privacy-monitor",
  "name": "Privacy Monitor",
  "category": "system",
  "permissions": ["system_actions"],
  "voiceCommands": ["show privacy report", "what is running", "check privacy status"],
  "gestureCommands": ["TWO_FINGERS_UP: show privacy overlay"],
  "aiCapabilities": [],
  "systemAccess": true,
  "sandboxRequired": false
}
```

---

## Security Requirements

1. All permissions must be declared — runtime will reject undeclared access.
2. `sandboxRequired: true` plugins run in a WebView iframe with strict CSP.
3. `verified: true` is set only by the Zara Store review team after code audit.
4. `systemAccess: true` requires an additional user confirmation before install.
5. API keys belonging to the user are never accessible to plugins.
