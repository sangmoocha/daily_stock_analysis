# LLM 설정 가이드(한국어)

이 문서는 이 프로젝트에서 **어떤 LLM을 쓸 수 있는지**, **어떻게 설정하는지**, 그리고 **설정 후 어떤 기능이 동작하는지**를 한국어로 정리한 실무 가이드입니다.

> - 이 문서는 한국어 사용자용 가이드이며, 계약(contract)의 정본은 코드와 중국어 원본 문서입니다. 내용이 다르면 코드와 `AGENTS.md` 기준이 우선합니다.
> - 관련 원본 문서: [LLM 配置指南](LLM_CONFIG_GUIDE.md)(三层配置/Web 设置页), [LLM 服务商配置指南](llm-providers.md)(provider 预设/Actions 映射/错误分类), [完整配置与部署指南](full-guide.md), [.env.example](../.env.example)
> - 기준 런타임: `requirements.txt` 의 `litellm>=1.80.10,!=1.82.7,!=1.82.8,<1.99.0`(이 문서에서는 LiteLLM `1.98.1` 로 확인)
> - NVIDIA Nemotron 절의 실측 기록은 **2026-10-20** 로컬 환경 1회 검증 결과입니다. 모델 가용성·요금·지역 제한은 NVIDIA 쪽 정책에 따라 변동됩니다.

## 1. 한눈에 보기

| 알고 싶은 것 | 볼 곳 |
| --- | --- |
| 어떤 LLM을 쓸 수 있나 | [4. 지원 LLM 목록](#4-지원-llm-목록) |
| 어떻게 설정하나 | [5. 설정 방법](#5-설정-방법) |
| NVIDIA Nemotron을 쓰고 싶다 | [6. NVIDIA Nemotron 실전 설정](#6-nvidia-nemotron-실전-설정) |
| 설정 후 뭘 할 수 있나 | [7. 프로젝트 기능 개요](#7-프로젝트-기능-개요) |
| 왜 안 되나 | [5.6 검증과 진단](#56-검증과-진단), [llm-providers.md 错误分类](llm-providers.md) |

## 2. LLM 계층 구조

이 프로젝트는 LLM을 직접 호출하지 않고 **LiteLLM을 공통 클라이언트**로 사용합니다. 따라서 "LiteLLM이 지원하는 provider" 가 곧 사용 가능한 provider 범위입니다.

### 2.1 Generation backend (가장 바깥 계층)

`GENERATION_BACKEND` 로 "생성 경로" 자체를 고릅니다.

| 값 | 의미 |
| --- | --- |
| `litellm` (기본) | LiteLLM 경로. 아래 3계층 설정이 여기에 적용됩니다. |
| `codex_cli` / `claude_code_cli` / `opencode_cli` | 로컬 CLI를 생성 backend로 쓰는 opt-in 실험 기능. LiteLLM provider가 아니며 `LITELLM_MODEL=codex_cli/...` 같은 표기를 쓰면 안 됩니다. |

로컬 CLI backend는 프로젝트가 직접 API Key를 관리하지 않고, 해당 CLI의 로그인 상태를 사용합니다. 자세한 경계는 [llm-providers.md](llm-providers.md) 참고.

### 2.2 모델 설정 3계층 (우선순위 고정)

| 우선순위 | 방식 | 주요 변수 | 특징 |
| --- | --- | --- | --- |
| 1 (최우선) | YAML | `LITELLM_CONFIG` / `LITELLM_CONFIG_YAML` | LiteLLM Router 원본 설정. `extra_body`, `num_retries` 같은 provider별 파라미터까지 제어 가능. |
| 2 | Channels | `LLM_CHANNELS` + `LLM_<CHANNEL>_*` | 다중 provider / 다중 Key / fallback. Web 설정 페이지가 저장하는 계층. **권장 시작점** |
| 3 | Legacy | `LITELLM_MODEL` + provider Key 1개 | 가장 단순. 단일 모델 빠른 시작용. |

> YAML이 유효하면 Channels·legacy는 그 요청에서 사용되지 않습니다.

### 2.3 채널 프로토콜과 API Surface

- 채널 `protocol` 허용값: `openai` / `anthropic` / `gemini` / `vertex_ai` / `deepseek` / `ollama`
- `LLM_<CHANNEL>_API_SURFACE` 허용값: `chat_completions`(기본)/ `responses`
- `responses` 는 `protocol=openai` 인 채널에서만 가능하고, 채널 안 모든 모델이 LiteLLM 기준 `openai` provider로 해석되어야 합니다.

### 2.4 모델 ID 정규화 규칙(중요)

`LLM_<CHANNEL>_MODELS` 에 적은 이름은 저장 시 LiteLLM 라우팅이 가능한 형태로 정규화됩니다. 직접 확인한 규칙:

| 입력 | 정규화 결과 | 이유 |
| --- | --- | --- |
| `gpt-5.5` (슬래시 없음) | `openai/gpt-5.5` | 채널 protocol prefix 부착 |
| `nvidia/nemotron-3-ultra-550b-a55b` | `openai/nvidia/nemotron-3-ultra-550b-a55b` | `nvidia` 는 LiteLLM provider prefix가 아님 → 게이트웨이 모델 ID로 보고 `openai/` 래핑 |
| `deepseek-ai/DeepSeek-V3.2` | `openai/deepseek-ai/DeepSeek-V3.2` | 위와 동일(조직명 접두사는 provider가 아님) |
| `nvidia_nim/...` | 그대로 유지 | `nvidia_nim` 은 실제 LiteLLM provider prefix |
| `anthropic/claude-sonnet-4-6` | 그대로 유지 | 실제 provider prefix |

즉 **모델 ID에 슬래시가 있어도 provider로 오해하지 말 것**이 핵심입니다. 판정 기준은 현재 설치된 LiteLLM provider registry입니다.

## 3. 설정 파일과 우선순위 요약

```text
LITELLM_CONFIG / LITELLM_CONFIG_YAML   (YAML, 최우선)
      > LLM_CHANNELS + LLM_<CHANNEL>_*  (권장)
      > LITELLM_MODEL + GEMINI/DEEPSEEK/OPENAI/ANTHROPIC/AIHUBMIX/MODELFLARE Key (legacy)
```

`.env` 는 `python main.py` 계열 실행 시 자동 로드되며, `.env` 파일은 `.gitignore` 로 제외됩니다. 실제 키를 커밋하지 마세요.

## 4. 지원 LLM 목록

### 4.1 Web 설정 페이지 프리셋(`apps/dsa-web` 의 provider template)

Web 「설정 → AI 모델 구성」에서 바로 추가할 수 있는 프리셋 17종입니다. 저장되는 값은 결국 2.2의 Channels 계층입니다.

| 프리셋 | channel 이름 | protocol | Base URL | 모델 예시 |
| --- | --- | --- | --- | --- |
| Modelflare(집계 플랫폼) | `modelflare` | `openai` | `https://modelflare.dev/v1` | `gpt-6.1-sol`(기본) |
| AIHubmix | `aihubmix` | `openai` | `https://aihubmix.com/v1` | `gpt-5.5`, `claude-sonnet-4-6`, `gemini-3.1-pro-preview` |
| Anspire Open | `anspire` | `openai` | `https://open-gateway.anspire.cn/v6` | `Doubao-Seed-2.0-lite`, `qwen3.5-flash` 등(예시) |
| DeepSeek 공식 | `deepseek` | `deepseek` | `https://api.deepseek.com` | `deepseek-v4-flash`, `deepseek-v4-pro` |
| 通义千问 DashScope | `dashscope` | `openai` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen3.6-plus`, `qwen3.6-flash` |
| 智谱 GLM | `zhipu` | `openai` | `https://open.bigmodel.cn/api/paas/v4` | `glm-5.1`, `glm-4.7-flash` |
| Moonshot / Kimi | `moonshot` | `openai` | `https://api.moonshot.cn/v1` | `kimi-k2.6`, `kimi-k2.5` |
| MiniMax 공식 | `minimax` | `openai` | `https://api.minimax.io/v1` | `MiniMax-M3`, `MiniMax-M2.7` |
| 火山方舟(豆包) | `volcengine` | `openai` | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-seed-1-6-251015` 등 |
| SiliconFlow(硅基流动) | `siliconflow` | `openai` | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3.2`, `Qwen/Qwen3-235B-A22B-Thinking-2507` |
| OpenRouter | `openrouter` | `openai` | `https://openrouter.ai/api/v1` | `~anthropic/claude-sonnet-latest`, `~openai/gpt-latest` |
| Requesty | `requesty` | `openai` | `https://router.requesty.ai/v1`(EU: `router.eu.requesty.ai`) | `claude-sonnet-4-6`, `gpt-5.4` |
| Gemini 공식 | `gemini` | `gemini` | (비움) | `gemini-3.1-pro-preview`, `gemini-3-flash-preview` |
| Anthropic 공식 | `anthropic` | `anthropic` | (비움) | `claude-sonnet-4-6`, `claude-opus-4-7` |
| OpenAI 공식 | `openai` | `openai` | `https://api.openai.com/v1` | `gpt-5.5`, `gpt-5.4-mini` |
| Ollama(로컬) | `ollama` | `ollama` | `http://127.0.0.1:11434` | `llama3.2`, `qwen2.5` |
| 사용자 정의 채널 | 아무 이름 | `openai` 등 | 직접 입력 | 직접 입력 |

### 4.2 Legacy 단일 Key 방식

`.env` 에 Key 1개만 넣고 `LITELLM_MODEL` 로 모델을 지정하는 경로입니다.

| Key 변수 | 연결되는 provider | 비고 |
| --- | --- | --- |
| `MODELFLARE_KEY` | Modelflare | Key만 넣으면 기본 Base URL·기본 모델 자동 적용 |
| `GEMINI_API_KEY` / `GEMINI_API_KEYS` | Gemini | 다중 Key는 `_KEYS`(쉼표 구분) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEYS` | Anthropic | |
| `OPENAI_API_KEY` / `OPENAI_API_KEYS` + `OPENAI_BASE_URL` | OpenAI / OpenAI 호환 게이트웨이 | `OPENAI_BASE_URL` 로 임의 호환 엔드포인트 지정 가능 |
| `AIHUBMIX_KEY` | AIHubmix | `OPENAI_*` 보다 먼저 쓰이는 호환 Key |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_API_KEYS` | DeepSeek | |
| `ANSPIRE_API_KEYS` | Anspire Open | 다른 OpenAI 호환 Key가 없을 때 LLM 게이트웨이로 재사용 |
| `OLLAMA_API_BASE` + `LITELLM_MODEL=ollama/<model>` | Ollama | Key 불필요 |

### 4.3 LiteLLM 네이티브 provider(사실상 "OpenAI 호환이면 무엇이든")

채널 프리셋에 없어도 LiteLLM이 지원하는 provider는 `protocol=openai` + `BASE_URL` + 모델 ID 조합으로 사용할 수 있습니다. 예:

- `nvidia_nim/...`(NVIDIA NIM/Integrate API), `xai/grok-*`, `groq/...`, `cerebras/...`, `cohere/...`, `fireworks_ai/...`, `bedrock/...`, `azure/...`, `together_ai/...`
- 자체 호스팅: vLLM / LM Studio / LocalAI / Hermes(`127.0.0.1` 계열은 API Key 없이도 허용)

전체 목록의 진실은 코드가 아니라 **현재 설치된 LiteLLM provider registry** 입니다. Web 설정 페이지도 이 registry를 서버에서 조회해 사용하므로, 버전을 올리면 사용 가능한 provider도 늘어납니다.

## 5. 설정 방법

### 5.1 가장 단순한 방법(legacy)

```env
# 예: OpenAI 호환 게이트웨이 1개만 사용
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://your-proxy.example.com/v1
LITELLM_MODEL=openai/your-model-name
```

### 5.2 권장: Channels

```env
LLM_CHANNELS=deepseek,gemini
LLM_DEEPSEEK_PROTOCOL=deepseek
LLM_DEEPSEEK_API_KEY=sk-xxx
LLM_DEEPSEEK_MODELS=deepseek-v4-flash,deepseek-v4-pro
LLM_GEMINI_API_KEYS=key1,key2
LLM_GEMINI_MODELS=gemini-3.1-pro-preview

LITELLM_MODEL=deepseek/deepseek-v4-flash
LITELLM_FALLBACK_MODELS=gemini/gemini-3.1-pro-preview
```

- Key는 `LLM_<CHANNEL>_API_KEYS`(다중) > `LLM_<CHANNEL>_API_KEY`(단일) 순으로 읽습니다.
- 채널 비활성화: `LLM_<CHANNEL>_ENABLED=false`
- `LITELLM_MODEL` / `LITELLM_FALLBACK_MODELS` 는 **활성 채널의 모델 목록 안에 있는 값**이어야 합니다. 저장/검증 시 존재하지 않는 참조는 정리됩니다.

### 5.3 고급: YAML(provider별 파라미터가 필요할 때)

`extra_body` 나 라우터 재시도 횟수처럼 채널 변수로 표현할 수 없는 설정이 필요하면 YAML을 씁니다. 형식은 [examples/litellm_config.example.yaml](examples/litellm_config.example.yaml) 참고.

```env
LITELLM_CONFIG=./litellm_config.yaml
```

### 5.4 Web 설정 페이지

1. `python main.py --webui`(또는 `--serve`)로 Web을 띄우고 「설정 → AI 모델 구성」 진입
2. 「快速添加渠道」에서 프리셋 선택 → API Key 입력 → 필요 시 「모델 가져오기」
3. 주 모델 / Agent 모델 / Vision 모델 / fallback 선택 후 저장
4. 「연결 테스트」로 인증·모델명·응답 형식 확인
5. JSON / tools / stream / vision 능력 확인이 필요하면 「런타임 능력 감지」를 **직접** 실행(실제 LLM 요청이 발생하며 결과는 `.env` 에 기록되지 않음)

### 5.5 GitHub Actions

기본 workflow는 **명시적으로 매핑된 변수만** 전달합니다. `modelflare`, `primary`, `secondary`, `aihubmix`, `anspire`, `deepseek`, `dashscope`, `zhipu`, `moonshot`, `minimax`, `volcengine`, `siliconflow`, `openrouter`, `requesty`, `gemini`, `anthropic`, `openai`, `ollama`, `hermes` 는 매핑되어 있고, 그 외 채널명(예: `nvidia`, `mimo`)을 쓰려면 workflow에 `LLM_<CHANNEL>_*` 매핑을 직접 추가해야 합니다. 로컬 `.env` / Docker / 자체 호스팅 스크립트는 이 제한이 없습니다.

### 5.6 검증과 진단

```bash
# 설정 해석 결과 확인(Key 노출 없음)
.venv/bin/python -c "from src.config import setup_env, get_config; setup_env(); c=get_config(); print(c.stock_list, c.litellm_model)"

# 알림 채널만 점검
.venv/bin/python main.py --check-notify

# LLM 없이 데이터 수집 경로만 스모크
.venv/bin/python main.py --dry-run
```

자주 보는 진단 코드(`missing_api_key`, `api_key_rejected`, `rate_limit`, `timeout`, `model_access_denied`, `provider_blocked`, `null_content` 등)의 의미와 대응은 [llm-providers.md 의 错误分类 표](llm-providers.md)를 그대로 참고하세요.

## 6. NVIDIA Nemotron 실전 설정

### 6.1 결론

**사용 가능합니다.** NVIDIA Integrate API(`https://integrate.api.nvidia.com/v1`)는 OpenAI 호환 Chat Completions이므로 이 프로젝트의 Channels 계층으로 바로 연결됩니다. 다만 **가용 용량이 불안정**해서 재시도/fallback 설계가 사실상 필수입니다(6.5 참고).

### 6.2 모델 ID 확인

```bash
curl -sS https://integrate.api.nvidia.com/v1/models \
  -H "Authorization: Bearer $NVIDIA_API_KEY" | python -m json.tool | grep nemotron
```

2026-10-20 확인 시 `nvidia/nemotron-3-ultra-550b-a55b` 가 실제 목록에 존재했습니다(동일 목록에 `nvidia/nemotron-3-super-120b-a12b` 등도 있음).

### 6.3 권장 `.env`(Channels 방식)

```env
LLM_CHANNELS=nvidia
LLM_NVIDIA_PROTOCOL=openai
LLM_NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxx
# fallback 후보까지 채널 모델 목록에 함께 선언해야 합니다
LLM_NVIDIA_MODELS=nvidia/nemotron-3-ultra-550b-a55b,nvidia/nemotron-3-super-120b-a12b

LITELLM_MODEL=openai/nvidia/nemotron-3-ultra-550b-a55b
LITELLM_FALLBACK_MODELS=openai/nvidia/nemotron-3-super-120b-a12b
```

- `nvidia/nemotron-...` 처럼 슬래시가 있는 게이트웨이 모델 ID는 저장 시 자동으로 `openai/nvidia/nemotron-...` 로 정규화됩니다(2.4 규칙, 코드로 직접 확인함).
- Channels/YAML 모드에서는 분석기가 LiteLLM `Router` 를 `num_retries=2` 로 생성하므로 일시적 503은 자동 재시도됩니다(`src/analyzer.py`).
- LiteLLM 네이티브 NIM provider(`nvidia_nim/`)를 쓰고 싶다면 채널 모델을 `LLM_NVIDIA_MODELS=nvidia_nim/nvidia/nemotron-3-ultra-550b-a55b` 처럼 적으면 그대로 유지됩니다(`nvidia_nim` 은 실제 LiteLLM provider prefix라 래핑되지 않음, 코드로 확인). 이 경우 `LLM_NVIDIA_BASE_URL` 은 비워도 NIM 기본 엔드포인트를 사용합니다. 예:

```env
LLM_CHANNELS=nvidia
LLM_NVIDIA_PROTOCOL=openai
LLM_NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxx
LLM_NVIDIA_MODELS=nvidia_nim/nvidia/nemotron-3-ultra-550b-a55b
LITELLM_MODEL=nvidia_nim/nvidia/nemotron-3-ultra-550b-a55b
```

### 6.4 `enable_thinking` 같은 NVIDIA 확장 파라미터

Channels 계층은 채널별 `extra_body` 를 노출하지 않습니다. 다음 중 하나를 쓰세요.

- **그대로 두기(권장)**: 이 모델은 별도 파라미터 없이도 thinking을 수행하고 응답에 `reasoning_content` 를 함께 반환합니다(아래 실측). 프로젝트의 Agent 어댑터는 `reasoning_content` 를 인식해 다중 턴에 되돌려 보냅니다.
- **YAML로 명시**:

```yaml
model_list:
  - model_name: openai/nvidia/nemotron-3-ultra-550b-a55b
    litellm_params:
      model: openai/nvidia/nemotron-3-ultra-550b-a55b
      api_base: https://integrate.api.nvidia.com/v1
      api_key: "os.environ/NVIDIA_API_KEY"
      extra_body:
        chat_template_kwargs:
          enable_thinking: true
router_settings:
  num_retries: 2
```

YAML의 `extra_body` / `router_settings` 형태는 이 저장소의 [예시 파일](examples/litellm_config.example.yaml)에 이미 쓰이고 있는 패턴입니다(NVIDIA 엔드포인트 대상 실측은 이 문서 작성 시점에 미수행).

### 6.5 실측 기록(2026-10-20, LiteLLM 1.98.1, Python 3.12)

| 항목 | 결과 |
| --- | --- |
| `GET /v1/models` | HTTP 200, 81개 모델, `nvidia/nemotron-3-ultra-550b-a55b` 포함 |
| LiteLLM `openai/nvidia/nemotron-3-ultra-550b-a55b` + `api_base` | 성공(non-stream, 최초 성공까지 약 20초) |
| LiteLLM `nvidia_nim/nvidia/nemotron-3-ultra-550b-a55b`(Base URL 생략) | 성공 |
| 응답 구조 | `content` 와 함께 `reasoning_content` 반환(thinking) |
| `extra_body={"chat_template_kwargs":{"enable_thinking":true}}` | 오류 없이 통과 |
| 안정성 | HTTP 503 `Service temporarily overloaded` 가 **비스트림·스트림 모두에서 간헐 발생**. 첫 시도 실패 후 재시도 성공 사례 다수 |
| fallback 동작 | 프로젝트 `.env`(6.3) 구성 + LiteLLM `Router`(`num_retries=2`)로 재현: ultra가 503을 반환하자 분석기 레벨 fallback인 `nvidia/nemotron-3-super-120b-a12b` 로 자동 전환되어 정상 응답(1.2초). fallback은 primary → fallback 순서로 순차 시도됩니다(`src/analyzer.py`) |
| 스트리밍 | 스트림 도중 503 → LiteLLM `MidStreamFallbackError` 발생(표본 3회 중 1회만 완주). 스트리밍 경로는 특히 불안정 |

**해석**: 실패는 프로젝트 설정 문제가 아니라 NVIDIA 측 용량(overloaded) 문제입니다. 같은 요청을 재시도하면 대체로 성공합니다.

### 6.6 Nemotron 사용 시 체크리스트

- [ ] `max_tokens` 를 충분히 크게: reasoning 모델은 **thinking 토큰이 출력 예산을 먼저 소비**합니다. `max_tokens` 가 작으면 `content` 가 빈 문자열로 돌아오고 프로젝트는 `null_content` 로 판단할 수 있습니다(실측: `max_tokens=64` 에서 `content=""`, `max_tokens=1024` 에서 `"OK"`).
- [ ] `LITELLM_FALLBACK_MODELS` 에 실제로 사용 가능한 다른 모델(예: NVIDIA 내 다른 모델 또는 Gemini) 지정
- [ ] 스트리밍이 필요한 기능(Web 채팅/리포트 스트리밍) 사용 시 실패율을 감안해 재시도 또는 비스트림 경로 유지
- [ ] Web 「연결 테스트」는 첫 모델에만 요청합니다. 실패 시 6.2로 모델 ID와 계정 권한을 먼저 확인
- [ ] 회사/학교망에서 `integrate.api.nvidia.com` 접근이 막히면 `.env` 의 `USE_PROXY` / `PROXY_HOST` / `PROXY_PORT` 검토
- [x] 검증됨(2026-10-20): 한국 종목(005930.KS) 일반 분석 파이프라인 E2E — 데이터 수집 → LLM(Nemotron 3 Ultra) 분석 → `REPORT_LANGUAGE=ko` 리포트 파일 저장까지 성공. 같은 실행에서 시장 리뷰(`MARKET_REVIEW_REGION=kr`)도 KOSPI/KOSDAQ 2개 지수만 사용하는 한국어 리포트로 저장되었습니다.
- [x] 검증됨(2026-10-20): Nemotron 3 Ultra의 **function calling** — LiteLLM 경유 tools/tool_choice 로 `get_investor_flow` 호출(`{"stock_code": "005930.KS"}`)을 실제로 생성했습니다.
- [ ] 미검증 항목: Agent 도구 호출을 Web `/chat` 부터 끝까지 돌린 E2E, Vision 입력, 그리고 `AGENT_MODE=true` 인 다단계 일일 분석(기본 `AGENT_MAX_STEPS=10` 에서 예산 초과 실패를 1회 관측). 도구 호출이 필요한 Agent 모드보다 **일반 분석/리포트 경로부터** 검증하는 것을 권장합니다.

## 7. 프로젝트 기능 개요

### 7.1 파이프라인

```text
데이터 수집(A주/홍콩/미국)
  → 기술적 지표 / 수급 / 보조 데이터
  → 뉴스·정보 검색(선택, 검색 키 필요)
  → LLM 분석(개별 종목 + 시장 리뷰)
  → 리포트 생성 → 알림 발송 → SQLite 저장 / 백테스트
```

### 7.2 주요 실행 명령

```bash
python main.py                    # 기본 분석 실행
python main.py --dry-run          # LLM 없이 데이터만 수집(설정 점검용)
python main.py --stocks 600519,hk00700,AAPL
python main.py --market-review    # 시장 리뷰만
python main.py --portfolio futu   # 푸투 OpenD 실계좌 보유 종목 가져오기
python main.py --schedule         # 스케줄 모드
python main.py --webui            # Web UI + 분석
python main.py --serve-only       # Web/API 서버만
python main.py --backtest         # 백테스트
python main.py --etf-rotation     # ETF 듀얼 모멘텀 로테이션(LLM 불필요)
```

### 7.3 자주 쓰는 `.env` 옵션

| 변수 | 기본/예시 | 설명 |
| --- | --- | --- |
| `STOCK_LIST` | `600519,300750,002594` | 분석 대상. `hk00700`, `AAPL` 등 시장 접두사 지원 |
| `REPORT_LANGUAGE` | `zh` | `zh` / `en` / **`ko`(한국어 지원)** |
| `REPORT_TYPE` | `simple` | `simple` / `full` / `brief` |
| `REPORT_SUMMARY_ONLY` | `false` | `true` 면 요약만 알림 |
| `MARKET_REVIEW_ENABLED` | `true` | 시장 리뷰 사용 여부 |
| `MARKET_REVIEW_REGION` | `cn` | `cn` / `hk` / `us` / `jp` / `kr` / `both`, 콤마로 조합 가능 |
| `MARKET_REVIEW_COLOR_SCHEME` | `green_up` | `green_up`(상승=초록)/ `red_up` |
| `AGENT_MODE` | (미설정) | 미설정 시 Web 问股/AI 도구 호출은 자동 감지로 사용 가능(`is_agent_available()=true`), 일일 분석은 기존 경로 유지. `true` 로 켜면 **일일 종목 분석도 Agent(다단계) 경로로 전환**되며 느려지고 `AGENT_MAX_STEPS`(기본 10) 초과 시 분석이 실패할 수 있습니다. `false` 로 두면 AI 도구 호출이 차단됩니다. |
| `AGENT_ARCH` | `single` | `multi` 시 오케스트레이터 모드 사용 |
| `SCREENING_ENABLED` | `false` | 종목 스크리닝 |
| `BACKTEST_ENABLED` | `true` | 분석 결과 자동 백테스트 |
| `SCHEDULE_ENABLED` / `SCHEDULE_TIME` | `false` / `18:00` | 정기 실행 |
| `WEBUI_ENABLED` / `WEBUI_HOST` / `WEBUI_PORT` | `false` / `127.0.0.1` / `8000` | Web UI. 외부 공개 시 `0.0.0.0` + 인증 설정 필요 |
| `ADMIN_AUTH_ENABLED` | `false` | Web 비밀번호 보호 |
| `DATABASE_PATH` | `./data/stock_analysis.db` | SQLite 경로 |
| `LOG_DIR` / `LOG_LEVEL` | `./logs` / `INFO` | 로그 |
| `USE_PROXY` / `PROXY_HOST` / `PROXY_PORT` | `false` / `127.0.0.1` / `10809` | 로컬 프록시 |

알림(Webhook/Telegram/Discord/Slack/메일/Pushover/ntfy/Gotify/PushPlus/Server酱 등), 데이터 소스 우선순위, 포트폴리오, 컨텍스트 스냅샷 등 나머지 옵션은 [.env.example](../.env.example)과 [full-guide.md](full-guide.md)에 정리되어 있습니다.

### 7.4 데이터 소스(A주 기준 fallback 순서)

`efinance(0) > akshare(1) > tushare/pytdx/tickflow(2) > baostock(3) > yfinance(4) > tencent(5)`. 단일 소스 실패가 전체 분석을 중단시키지 않도록 설계되어 있고, 우선순위는 `*_PRIORITY` 변수로 조정합니다. 자세한 내용은 [data-source-stability.md](data-source-stability.md).

### 7.5 컴포넌트

- `src/core/` 파이프라인, `src/services/` 비즈니스 로직, `src/reports/` 리포트, `data_provider/` 데이터 소스 어댑터
- `api/` FastAPI, `apps/dsa-web/` Web 프론트, `apps/dsa-desktop/` Electron 데스크톱, `bot/` 봇 연동, `templates/` 리포트 템플릿

## 8. 롤백 방법

| 상황 | 조치 |
| --- | --- |
| 채널 설정을 되돌리기 | `.env` 백업에서 `LLM_*`, `LITELLM_MODEL`, `AGENT_LITELLM_MODEL`, `VISION_MODEL`, `LITELLM_FALLBACK_MODELS` 복원 |
| Channels → legacy | `LLM_CHANNELS` 삭제/비우기, 기존 provider Key와 `LITELLM_MODEL` 유지 |
| YAML → Channels/legacy | `LITELLM_CONFIG` / `LITELLM_CONFIG_YAML` 제거 후 재시작 |
| Web 설정 | Web/데스크톱의 설정 내보내기 백업으로 복원, 채널 비활성화 |

## 9. 미검증 / 주의 사항 요약

- 이 문서의 실측은 **LLM 연결 경로** 중심입니다. Nemotron으로 전체 분석·Agent·Vision E2E를 통과시킨 검증은 없습니다.
- NVIDIA 모델 목록·요금·thinking 파라미터는 NVIDIA 정책에 따라 바뀔 수 있습니다. 최종 판단은 `/v1/models` 응답과 계정 콘솔 기준입니다.
- 이 문서는 문서 전용 변경입니다(코드·설정 기본값·런타임 동작 변경 없음). 기존 설정은 그대로 동작하며, 되돌리려면 이 문서 파일과 INDEX/CHANGELOG 항목을 revert 하면 됩니다.
