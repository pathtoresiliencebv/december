// Make sure to replace the values with your actual API key and model

// USING ANTHROPIC CLAUDE SONNET 4 is strongly recommended for best results

export const config = {
  aiSdk: {
    // The base URL for the AI SDK, leave blank for e.g. openai
    baseUrl: "https://openrouter.ai/api/v1",

    // Your API key for provider, if using Ollama enter "ollama" here
    apiKey: "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",

    // The model to use, e.g., "gpt-4", "gpt-3.5-turbo", or "ollama/llama2"
    model: "moonshotai/kimi-k2",
  },
} as const;
