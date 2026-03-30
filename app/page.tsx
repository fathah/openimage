"use client";

import { useState, useEffect } from "react";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  model: string;
  size: string;
  createdAt: number;
}

const PROVIDERS = [
  { id: "openrouter", name: "OpenRouter" },
  { id: "openai", name: "OpenAI Compatible" },
] as const;

const MODELS: Record<string, { id: string; name: string }[]> = {
  openrouter: [
    { id: "bytedance-seed/seedream-4.5", name: "Seedream 4.5" },
    { id: "openai/dall-e-3", name: "DALL-E 3" },
    { id: "black-forest-labs/flux-1.1-pro", name: "Flux 1.1 Pro" },
    { id: "black-forest-labs/flux-schnell", name: "Flux Schnell" },
    { id: "stabilityai/stable-diffusion-3", name: "Stable Diffusion 3" },
  ],
  openai: [
    { id: "openai/dall-e-3", name: "DALL-E 3" },
    { id: "black-forest-labs/flux-1.1-pro", name: "Flux 1.1 Pro" },
    { id: "black-forest-labs/flux-schnell", name: "Flux Schnell" },
  ],
};

const SIZES = [
  { id: "1024x1024", name: "Square", detail: "1024\u00d71024" },
  { id: "1792x1024", name: "Landscape", detail: "1792\u00d71024" },
  { id: "1024x1792", name: "Portrait", detail: "1024\u00d71792" },
];

const EXAMPLES = [
  "A serene Japanese garden at golden hour with cherry blossoms",
  "An astronaut floating above Earth, cinematic lighting",
  "Cozy coffee shop on a rainy day, watercolor illustration",
  "Cyberpunk cityscape with neon lights and flying vehicles",
];

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

// ── Browser-side API calls ───────────────────────────────────────────

async function generateOpenRouter(
  apiKey: string,
  modelId: string,
  prompt: string
): Promise<{ url: string }[]> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "OpenImage",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image"],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.error?.message || data?.message || "Generation failed"
    );
  }

  const message = data.choices?.[0]?.message;
  if (!message?.images?.length) {
    throw new Error("No images were generated");
  }

  return message.images.map(
    (img: { image_url: { url: string } }) => ({ url: img.image_url.url })
  );
}

async function generateOpenAICompat(
  apiKey: string,
  modelId: string,
  prompt: string,
  size: string
): Promise<{ url: string }[]> {
  const res = await fetch(
    "https://openrouter.ai/api/v1/images/generations",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "OpenImage",
      },
      body: JSON.stringify({
        model: modelId,
        prompt,
        n: 1,
        size,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.error?.message || data?.message || "Generation failed"
    );
  }

  return (data.data || []).map((img: { url?: string; b64_json?: string }) => ({
    url: img.url || `data:image/png;base64,${img.b64_json}`,
  }));
}

// ── Component ────────────────────────────────────────────────────────

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<string>(PROVIDERS[0].id);
  const [model, setModel] = useState(MODELS.openrouter[0].id);
  const [customModel, setCustomModel] = useState("");
  const [size, setSize] = useState(SIZES[0].id);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<GeneratedImage | null>(null);

  useEffect(() => {
    const key = getCookie("openrouter_api_key");
    if (key) {
      setApiKey(key);
      setKeyInput(key);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const currentModels = MODELS[provider] || [];

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const models = MODELS[newProvider] || [];
    if (models.length > 0) setModel(models[0].id);
  };

  const saveKey = () => {
    const key = keyInput.trim();
    if (!key) return;
    setCookie("openrouter_api_key", key);
    setApiKey(key);
    setShowSettings(false);
  };

  const clearKey = () => {
    setCookie("openrouter_api_key", "", -1);
    setApiKey("");
    setKeyInput("");
    setShowSettings(false);
  };

  const resolvedModel = model === "custom" ? customModel.trim() : model;

  const generate = async () => {
    if (!prompt.trim() || !apiKey || generating || !resolvedModel) return;
    setGenerating(true);
    setError(null);

    try {
      let imageResults: { url: string }[];

      if (provider === "openrouter") {
        imageResults = await generateOpenRouter(
          apiKey,
          resolvedModel,
          prompt.trim()
        );
      } else {
        imageResults = await generateOpenAICompat(
          apiKey,
          resolvedModel,
          prompt.trim(),
          size
        );
      }

      const newImages: GeneratedImage[] = imageResults.map((img) => ({
        id: crypto.randomUUID(),
        url: img.url,
        prompt: prompt.trim(),
        model: resolvedModel,
        size,
        createdAt: Date.now(),
      }));

      setImages((prev) => [...newImages, ...prev]);
    } catch (err: unknown) {
      setError((err as Error).message || "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = async (image: GeneratedImage) => {
    try {
      if (image.url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = image.url;
        a.download = `openimage-${image.id.slice(0, 8)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const res = await fetch(image.url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `openimage-${image.id.slice(0, 8)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      window.open(image.url, "_blank");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      generate();
    }
  };

  const findModelName = (modelId: string) => {
    for (const list of Object.values(MODELS)) {
      const found = list.find((m) => m.id === modelId);
      if (found) return found.name;
    }
    return modelId;
  };

  // ── Welcome / API Key Setup ──────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 border border-violet-200 mb-4">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-violet-600"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              OpenImage
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              AI-powered image generation via OpenRouter
            </p>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              OpenRouter API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && keyInput.trim() && saveKey()
                }
                placeholder="sk-or-v1-..."
                className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all pr-16"
                autoFocus
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors px-1.5 py-0.5"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>

            <button
              onClick={saveKey}
              disabled={!keyInput.trim()}
              className="mt-4 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm text-white font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              Get Started
            </button>

            <p className="mt-4 text-center text-xs text-zinc-400">
              Get your key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-700 underline underline-offset-2"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Generation Interface ────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-violet-600"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-900">
              OpenImage
            </span>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="https://github.com/fathah/openimage"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors"
              title="GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs transition-colors ${
              showSettings
                ? "bg-zinc-100 text-zinc-900"
                : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            API Key
          </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="border-t border-zinc-200">
            <div className="max-w-2xl mx-auto px-4 py-4">
              <div className="flex gap-2">
                <input
                  type={showKey ? "text" : "password"}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKey()}
                  placeholder="sk-or-v1-..."
                  className="flex-1 bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-violet-500 transition-colors"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-2 rounded-lg border border-zinc-300 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
                <button
                  onClick={saveKey}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs text-white font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={clearKey}
                  className="px-3 py-2 rounded-lg border border-zinc-300 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-5">
        {/* Prompt */}
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the image you want to create..."
            rows={3}
            className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 resize-none transition-all leading-relaxed"
          />
          <div className="mt-1 flex items-center justify-between px-1">
            <span className="text-[11px] text-zinc-400">
              ⌘/Ctrl + Enter to generate
            </span>
            <span className="text-[11px] text-zinc-400">{prompt.length}</span>
          </div>
        </div>

        {/* Example prompts */}
        {!prompt && images.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Options + Generate */}
        <div className="flex flex-col gap-3">
          {/* Provider + Model row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="sm:w-44 bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="flex flex-1 gap-2">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={`${model === "custom" ? "w-36 shrink-0" : "flex-1"} bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer`}
              >
                {currentModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                <option value="custom">Custom...</option>
              </select>
              {model === "custom" && (
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="provider/model-name"
                  className="flex-1 min-w-0 bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-violet-500 transition-colors"
                />
              )}
            </div>
          </div>

          {/* Size + Generate row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {provider === "openai" && (
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="sm:w-44 bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
              >
                {SIZES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.detail})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={generate}
              disabled={!prompt.trim() || generating || !resolvedModel}
              className={`flex-1 sm:flex-none sm:w-40 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                generating
                  ? "bg-violet-100 text-violet-600 cursor-wait animate-pulse-border border"
                  : "bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
            <p className="flex-1 text-sm text-red-600">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none mt-0.5"
            >
              &times;
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {generating && (
          <div className="rounded-2xl border border-zinc-200 overflow-hidden animate-fade-in">
            <div className="aspect-square max-h-[512px] animate-shimmer" />
            <div className="p-4 space-y-2.5">
              <div className="h-4 w-3/4 rounded-md animate-shimmer" />
              <div className="h-3 w-1/3 rounded-md animate-shimmer" />
            </div>
          </div>
        )}

        {/* Generated images */}
        {images.length > 0 && (
          <div className="space-y-6">
            {/* Latest image */}
            <div className="group rounded-2xl border border-zinc-200 overflow-hidden bg-white animate-fade-in shadow-sm">
              <div className="relative">
                <img
                  src={images[0].url}
                  alt={images[0].prompt}
                  className="w-full cursor-pointer"
                  onClick={() => setLightbox(images[0])}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(images[0]);
                    }}
                    className="p-2 rounded-lg bg-white/90 backdrop-blur-sm text-zinc-700 hover:bg-white transition-colors shadow-sm"
                    title="Download"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setLightbox(images[0])}
                    className="p-2 rounded-lg bg-white/90 backdrop-blur-sm text-zinc-700 hover:bg-white transition-colors shadow-sm"
                    title="Expand"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" x2="14" y1="3" y2="10" />
                      <line x1="3" x2="10" y1="21" y2="14" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-zinc-700 leading-relaxed">
                  {images[0].prompt}
                </p>
                <p className="mt-1.5 text-xs text-zinc-400">
                  {findModelName(images[0].model)} &middot; {images[0].size}
                </p>
              </div>
            </div>

            {/* History grid */}
            {images.length > 1 && (
              <div>
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                  History
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.slice(1).map((img) => (
                    <button
                      key={img.id}
                      onClick={() => setLightbox(img)}
                      className="group/thumb relative rounded-xl overflow-hidden border border-zinc-200 hover:border-zinc-300 transition-all shadow-sm"
                    >
                      <img
                        src={img.url}
                        alt={img.prompt}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/40 transition-colors">
                        <p className="absolute bottom-2 left-2 right-2 text-[10px] text-white line-clamp-2 leading-tight opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                          {img.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!generating && images.length === 0 && (
          <div className="pt-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-300"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">
              Enter a prompt and generate your first image
            </p>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.url}
              alt={lightbox.prompt}
              className="w-full max-h-[85vh] rounded-xl object-contain"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={() => downloadImage(lightbox)}
                className="p-2.5 rounded-lg bg-white/90 backdrop-blur-sm text-zinc-700 hover:bg-white transition-colors shadow-sm"
                title="Download"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
              </button>
              <button
                onClick={() => setLightbox(null)}
                className="p-2.5 rounded-lg bg-white/90 backdrop-blur-sm text-zinc-700 hover:bg-white transition-colors shadow-sm"
                title="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" x2="6" y1="6" y2="18" />
                  <line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            </div>
            <div className="mt-3 px-1">
              <p className="text-sm text-zinc-200 leading-relaxed">
                {lightbox.prompt}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-zinc-400">
                  {findModelName(lightbox.model)} &middot; {lightbox.size}
                </span>
                <button
                  onClick={() => {
                    setPrompt(lightbox.prompt);
                    setLightbox(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-xs text-violet-300 hover:text-violet-200 transition-colors"
                >
                  Reuse prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
