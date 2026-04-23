import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ondevice_model_downloaded";

// On-device LLM is stubbed until the react-native-executorch v0.8+ setup is complete
// (requires built-in modelName + tokenizerSource + tokenizerConfigSource for gemma-3-4b-it).
// While stubbed, all generation falls through to the Groq cloud Edge Functions.
export function useOnDeviceLLM() {
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "true") setIsModelDownloaded(true);
    });
  }, []);

  const downloadModel = async (): Promise<void> => {
    // no-op: on-device path disabled
  };

  const generate = async (_prompt: string): Promise<string> => {
    throw new Error("on-device LLM unavailable");
  };

  return {
    generate,
    downloadProgress: 0,
    isModelReady: false,
    isGenerating: false,
    isModelDownloaded,
    downloadModel,
    isNativeAvailable: false,
  };
}
