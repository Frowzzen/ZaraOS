export class VoiceEngine {
  private isListening = false;
  private onResultCallback?: (text: string) => void;

  public async requestPermission(): Promise<boolean> {
    // TODO: Implement real navigator.mediaDevices.getUserMedia({ audio: true })
    // Integration point: Whisper.cpp (WASM) or Tauri subprocess (Alpha 0.4+)
    return Promise.resolve(true);
  }

  public startListening() {
    this.isListening = true;
    // TODO: Initialize Web Speech API, Whisper.cpp, or Vosk
    // Integration point: wire real audio capture here (Alpha 0.4+)
  }

  public stopListening() {
    this.isListening = false;
  }

  public onResult(callback: (text: string) => void) {
    this.onResultCallback = callback;
  }

  // Simulates voice input for demo purposes (Alpha 0.3)
  public simulateVoiceInput(text: string) {
    if (this.isListening && this.onResultCallback) {
      this.onResultCallback(text);
    }
  }
}

export const voiceEngine = new VoiceEngine();
