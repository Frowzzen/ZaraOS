export interface CommandResponse {
  output: string;
  action?: string;
  payload?: any;
}

export function parseCommand(input: string): string {
  return input.trim().toLowerCase();
}

export function routeCommand(input: string): CommandResponse {
  const command = parseCommand(input);

  // Simulated architecture for Alpha 0.1
  // In a real implementation, this would map to actual Linux execution with allowlists
  if (command.includes("open browser")) {
    return { output: "Launching Web Browser...", action: "navigate", payload: "/apps/browser" };
  }
  if (command.includes("show files") || command.includes("open files")) {
    return { output: "Opening File Explorer...", action: "navigate", payload: "/files" };
  }
  if (command.includes("open documents") || command.includes("create new document")) {
    return { output: "Opening Documents...", action: "navigate", payload: "/apps/documents" };
  }
  if (command.includes("play video") || command.includes("listen to audio")) {
    return { output: "Launching Media Player...", action: "navigate", payload: "/media" };
  }
  if (command.includes("search the web")) {
    return { output: "Opening search in Browser...", action: "navigate", payload: "/apps/browser" };
  }
  if (command.includes("summarize this folder")) {
    return { output: "Analyzing folder contents...\nFound 12 files. 3 documents, 9 media files. Total size 1.2GB." };
  }
  if (command.includes("open settings")) {
    return { output: "Opening System Settings...", action: "navigate", payload: "/settings" };
  }
  if (command.includes("enable developer mode")) {
    return { output: "Developer mode enabled. Access the Developer Portal for advanced tools.", action: "navigate", payload: "/developers" };
  }

  return { output: `Command not recognized: "${input}". Try "open settings" or "show files".` };
}
