# OpenImage

A clean, browser-based AI image generation app powered by [OpenRouter](https://openrouter.ai). Enter a prompt, pick a model, and generate images — all from your browser with no backend required.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌐 [Try OpenImage](https://openimage.vercel.app)

## Features

- **Browser-native** — API calls go directly from your browser to OpenRouter. No server, no proxy, no backend.
- **Two generation modes**
  - **OpenRouter** — Uses the chat completions API with `modalities: ["image"]` for models like Seedream, Flux, and more.
  - **OpenAI Compatible** — Uses the standard `images/generations` endpoint with size controls.
- **Multiple models** — DALL-E 3, Flux 1.1 Pro, Flux Schnell, Stable Diffusion 3, Seedream 4.5, or enter any custom model ID.
- **API key in cookies** — Your OpenRouter key is saved locally in a browser cookie. It never touches a server.
- **Lightbox & download** — Click any image to expand. Download with one click.
- **Prompt history** — All generated images stay in your session with full prompt recall.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20.9 or later
- An [OpenRouter API key](https://openrouter.ai/keys)

### Install & Run

```bash
git clone https://github.com/fathah/openimage.git
cd openimage
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your OpenRouter API key, and start generating.

## Supported Models

### OpenRouter (chat-based)

| Model              | ID                               |
| ------------------ | -------------------------------- |
| Seedream 4.5       | `bytedance-seed/seedream-4.5`    |
| DALL-E 3           | `openai/dall-e-3`                |
| Flux 1.1 Pro       | `black-forest-labs/flux-1.1-pro` |
| Flux Schnell       | `black-forest-labs/flux-schnell` |
| Stable Diffusion 3 | `stabilityai/stable-diffusion-3` |

### OpenAI Compatible (images endpoint)

| Model        | ID                               |
| ------------ | -------------------------------- |
| DALL-E 3     | `openai/dall-e-3`                |
| Flux 1.1 Pro | `black-forest-labs/flux-1.1-pro` |
| Flux Schnell | `black-forest-labs/flux-schnell` |

You can also enter any custom model ID supported by OpenRouter.

## Tech Stack

- **[Next.js 16](https://nextjs.org)** — React framework with Turbopack
- **[React 19](https://react.dev)** — UI library
- **[Tailwind CSS 4](https://tailwindcss.com)** — Utility-first styling
- **[TypeScript 5](https://typescriptlang.org)** — Type safety
- **[OpenRouter API](https://openrouter.ai/docs)** — Multi-model AI gateway

## Project Structure

```
app/
  page.tsx        # Main UI — prompt, generation, gallery, lightbox
  layout.tsx      # Root layout with fonts and metadata
  globals.css     # Theme, animations (shimmer, fade-in, pulse)
```

Everything runs in a single client component. No API routes, no server actions.

## License

MIT
