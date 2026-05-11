export class VoiceEngine {
  private isListening = false;
  private onResultCallback?: (text: string) => void;

  public async requestPermission(): Promise<boolean> {
    console.log("[VoiceEngine] Requesting microphone permission...");
    // TODO: Implement real navigator.mediaDevices.getUserMedia({ audio: true })
    return Promise.resolve(true);
  }

  public startListening() {
    this.isListening = true;
    console.log("[VoiceEngine] Started listening...");
    // TODO: Initialize Web Speech API, Whisper.cpp, or Vosk
  }

  public stopListening() {
    this.isListening = false;
    console.log("[VoiceEngine] Stopped listening.");
  }

  public onResult(callback: (text: string) => void) {
    this.onResultCallback = callback;
  }

  // Mock function to simulate voice input
  public simulateVoiceInput(text: string) {
    if (this.isListening && this.onResultCallback) {
      this.onResultCallback(text);
    }
  }
}

export const voiceEngine = new VoiceEngine();
