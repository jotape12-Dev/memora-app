# Memora

App mobile de flashcards inteligentes com geração automática via IA e algoritmo de repetição espaçada SM-2.

## Stack

- **React Native** + **Expo** (SDK 54)
- **TypeScript** (strict mode)
- **Expo Router** (file-based routing)
- **Supabase** (Auth, PostgreSQL, Edge Functions)
- **NativeWind** (Tailwind CSS for React Native)
- **Zustand** (state management)
- **react-native-reanimated** (animations)
- **react-native-vision-camera** + **ML Kit** (OCR)

## Setup

### 1. Clone e instale dependências

```bash
npm install
```

### 2. Configure variáveis de ambiente

Copie o `.env.example` e preencha:

```bash
cp .env.example .env
```

Preencha com suas chaves do Supabase e RevenueCat.

### 3. Configure o Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute a migration SQL em `supabase/migrations/001_initial_schema.sql`
3. Deploy as Edge Functions:

```bash
supabase functions deploy generate-from-text
supabase functions deploy generate-from-topic
```

4. Configure os secrets nas Edge Functions:

```bash
supabase secrets set HUGGINGFACE_API_KEY=your-key
supabase secrets set OPENAI_API_KEY=your-key
```

### 4. Execute o app

```bash
npx expo start
```

- Pressione `i` para iOS Simulator
- Pressione `a` para Android Emulator
- Escaneie o QR code com o Expo Go

## Estrutura do Projeto

```
app/                    # Expo Router screens
  (auth)/               # Login e Register
  (tabs)/               # Tab navigation (Home, Capture, Decks, Profile)
  review/[deckId].tsx   # Review session (SM-2)
  deck/[deckId].tsx     # Deck detail
  preview-cards.tsx     # Preview generated cards
  generate-topic.tsx    # Generate by topic (Premium)
  paywall.tsx           # Premium paywall
src/
  components/           # Reusable UI components
  stores/               # Zustand stores
  lib/                  # Supabase client, SM-2 algorithm
  types/                # TypeScript types
  constants/            # Colors, theme
supabase/
  migrations/           # SQL migrations
  functions/            # Edge Functions (AI generation)
```

## Modelo Freemium

- **Free**: 10 gerações/dia via texto/imagem (Hugging Face Mistral-7B)
- **Premium**: Gerações ilimitadas + geração por tópico (OpenAI gpt-4o-mini)
