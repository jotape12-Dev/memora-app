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
supabase functions deploy generate-from-text --no-verify-jwt
supabase functions deploy generate-from-topic --no-verify-jwt
supabase functions deploy generate-from-pdf --no-verify-jwt
```

4. Configure os secrets nas Edge Functions:

```bash
supabase secrets set GROQ_API_KEY=your-key
```

O secret `GROQ_API_KEY` é obrigatório — as Edge Functions `generate-from-text`, `generate-from-topic` e `generate-from-pdf` usam a Groq API (modelo `llama-3.1-8b-instant`) para gerar flashcards.

### Conceder Premium manualmente (conta interna/admin)

Para uma conta específica ficar premium permanentemente sem compra na loja, aplique a migration `supabase/migrations/003_manual_premium_grant.sql` e execute no SQL Editor do Supabase:

```sql
select public.set_account_premium_by_email('seu-email@exemplo.com', true);
```

Para revogar depois:

```sql
select public.set_account_premium_by_email('seu-email@exemplo.com', false);
```

### 4. Execute o app

```bash
npx expo start
```

- Pressione `i` para iOS Simulator
- Pressione `a` para Android Emulator
- Escaneie o QR code com o Expo Go

### RevenueCat (paywall)

Se aparecer o erro `RevenueCat SDK Configuration is not valid` com `Offering 'default' has no packages configured`, ajuste no painel do RevenueCat:

1. Crie/importe os produtos da loja (mensal e anual).
2. Vincule esses produtos aos packages da offering `default` (por exemplo: `monthly` e `annual`).
3. Garanta que a entitlement `premium` esteja ligada aos produtos.

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

- **Free**: 10 gerações/semana via texto/imagem (Groq API — llama-3.1-8b-instant)
- **Premium**: Gerações ilimitadas + geração por tópico (Groq API — llama-3.1-8b-instant; futuro on-device: gemma-3-4b-it via ExecuTorch)
