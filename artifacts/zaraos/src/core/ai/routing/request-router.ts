// ============================================================
// ZaraOS Request Router
//
// Orchestrates a full AI request: selects provider, selects
// model, injects context, and dispatches the message.
// The AI Runtime calls this — nothing else should.
// ============================================================

import { providerRouter } from "./provider-router";
import { modelRouter } from "./model-router";
import type { AIMessage, AISendOptions, AIStreamCallback } from "../providers/provider-adapter";

export interface RoutedRequest {
  messages: AIMessage[];
  systemPrompt?: string;
  requiresOffline?: boolean;
  overrideModel?: string;
  stream?: boolean;
  onChunk?: AIStreamCallback;
  signal?: AbortSignal;
}

export interface RoutedResult {
  response: string;
  providerId: string;
  providerName: string;
  modelId: string;
  isSimulated: boolean;
  isCloud: boolean;
  latencyMs: number;
}

export class RequestRouter {
  async dispatch(request: RoutedRequest): Promise<RoutedResult> {
    const start = Date.now();

    // 1. Select provider.
    const decision = await providerRouter.route(request.requiresOffline);
    const provider = decision.provider;

    // 2. Select model for request type.
    const lastUserMsg = [...request.messages].reverse().find((m) => m.role === "user");
    const requestType = modelRouter.classifyRequest(lastUserMsg?.content ?? "");
    const modelSelection = modelRouter.selectModel(
      provider.id,
      requestType,
      request.overrideModel ?? provider.getActiveModel()
    );

    // 3. Build options.
    const options: AISendOptions = {
      model: modelSelection.modelId,
      systemPrompt: request.systemPrompt,
      stream: request.stream ?? false,
      signal: request.signal,
    };

    // 4. Dispatch.
    let response: string;

    if (request.stream && request.onChunk) {
      let accumulated = "";
      await provider.streamMessage(
        request.messages,
        (chunk) => {
          accumulated += chunk.delta;
          request.onChunk!(chunk);
        },
        options
      );
      response = accumulated;
    } else {
      response = await provider.sendMessage(request.messages, options);
    }

    return {
      response,
      providerId: provider.id,
      providerName: provider.name,
      modelId: modelSelection.modelId,
      isSimulated: decision.isSimulated,
      isCloud: decision.isCloud,
      latencyMs: Date.now() - start,
    };
  }
}

export const requestRouter = new RequestRouter();
