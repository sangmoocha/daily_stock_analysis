import type { SettingsHelpMap } from './settingsHelp';

export const settingsHelpKo: SettingsHelpMap = {
  "settings.base.STOCK_LIST": {
    "title": "관심종목",
    "summary": "분석 작업과 알림 리포트에서 사용할 종목 코드를 정의합니다.",
    "usage": "영문 쉼표 사용을 권장합니다. 붙여넣은 중국어 쉼표, 열거 쉼표, 세미콜론, 공백, 줄바꿈도 인식하며 저장 시 영문 쉼표로 정규화합니다.",
    "valueNotes": [
      "예약 모드는 각 실행 전에 저장된 STOCK_LIST를 다시 읽습니다.",
      "임시 --stocks 인수는 해당 수동 실행에만 적용됩니다.",
      "STOCK_GROUP_N은 STOCK_LIST의 하위 집합이어야 하며 그룹 이메일 라우팅에만 영향을 줍니다."
    ],
    "impact": [
      "분석 범위, 알림 내용, 저장된 이력 리포트에 영향을 줍니다."
    ],
    "notes": [
      "저장된 STOCK_LIST 값은 영문 쉼표로 기록됩니다.",
      "이후 작업이 설정을 읽을 수 있도록 먼저 저장하세요."
    ]
  },
  "settings.ai_model.GENERATION_BACKEND": {
    "title": "분석 생성 방식",
    "showFieldKey": false,
    "summary": "종목 분석, 시황 리뷰, 일반 텍스트 응답을 생성하는 방식을 선택합니다.",
    "usage": "일반적으로 기본 모델 설정을 유지하세요. 해당 CLI가 이 머신에 설치되어 로그인되어 있고 분석 내용 처리를 신뢰할 수 있는 경우에만 로컬 CLI 백엔드를 선택하세요.",
    "valueNotes": [
      "로컬 CLI 백엔드는 오프라인 모델이 아니라 로컬 명령줄 프로그램입니다. 그 뒤의 서비스가 종목 심볼, 뉴스, 포지션 컨텍스트, 분석 요청, 리포트 초안을 처리할 수 있습니다.",
      "Docker, 클라우드 서버, CI에는 로컬 로그인 상태가 자동으로 존재하지 않습니다. DSA는 Codex/Claude/OpenCode 자격 증명 파일을 읽지 않지만, 해당 CLI 자체는 로그인 상태를 사용할 수 있습니다."
    ],
    "impact": [
      "일반 분석, 시황 리뷰, 텍스트 생성 진입점에 영향을 줍니다. 종목 질의 어시스턴트의 도구 실행 방식은 바뀌지 않습니다."
    ],
    "notes": [
      "기본 동작으로 되돌리려면 “기본 모델 설정”을 선택하고 저장하세요.",
      "로컬 CLI 백엔드는 아직 실험적입니다. 출력이 불안정하거나 실패가 잦으면 기본 모델 설정으로 되돌리세요.",
      "기본 모델 설정은 기존 API 키, 모델 채널, fallback 모델 설정을 계속 사용합니다."
    ],
    "examples": []
  },
  "settings.ai_model.GENERATION_FALLBACK_BACKEND": {
    "title": "대체 생성 방식",
    "showFieldKey": false,
    "summary": "로컬 CLI 생성 실패 시 오류로 중단할지, 기본 모델 설정을 이어서 시도할지 선택합니다.",
    "usage": "비활성화는 로컬 실패를 즉시 반환합니다. 기본 모델 설정은 구성된 일반 모델을 다음으로 시도합니다.",
    "valueNotes": [
      "모델 간 fallback에는 fallback 모델을 사용하세요. 이 필드는 로컬 CLI 백엔드와 기본 모델 설정 간의 전환만 처리합니다.",
      "기본 생성 방식이 이미 기본 모델 설정이면 이 필드는 추가 효과가 없습니다."
    ],
    "impact": [
      "종목 분석, 시황 리뷰, 자유 형식 텍스트 생성에서 로컬 CLI 실패 처리가 영향을 받습니다."
    ],
    "notes": [
      "로컬 CLI 실패를 즉시 확인하려면 비활성화를, 클라우드 모델로의 복구를 허용하려면 기본 모델 설정을 선택하세요."
    ],
    "examples": []
  },
  "settings.ai_model.OPENCODE_CLI_MODEL": {
    "title": "OpenCode CLI 모델",
    "showFieldKey": true,
    "summary": "OpenCode 실행 시 --model로 전달되는 선택적 모델 이름입니다.",
    "usage": "분석 생성 방식이 OpenCode CLI일 때만 적용됩니다. 비워두면 DSA가 --model을 전달하지 않으므로 OpenCode가 로컬 기본 모델 구성을 사용합니다.",
    "valueNotes": [
      "모델 가용성과 인증은 로컬 OpenCode 설정에서 처리합니다.",
      "설정 시 값은 하나의 argv 토큰으로 전달되며 공백이나 셸 메타 문자를 포함해서는 안 됩니다."
    ],
    "impact": [
      "OpenCode CLI를 통한 일반 분석, 시황 리뷰, 텍스트 생성에 영향을 줍니다. 종목 질의 어시스턴트에는 영향을 주지 않습니다."
    ],
    "examples": [
      "OPENCODE_CLI_MODEL=provider/model"
    ]
  },
  "settings.ai_model.GENERATION_BACKEND_TIMEOUT_SECONDS": {
    "title": "생성 타임아웃(초)",
    "summary": "한 번의 모델 생성이 대기할 수 있는 시간을 제한합니다.",
    "usage": "기본값은 300초입니다. 주로 로컬 CLI 생성에 적용됩니다.",
    "valueNotes": [
      "타임아웃 시 생성을 중단하고 명확한 타임아웃 오류를 기록합니다."
    ]
  },
  "settings.ai_model.GENERATION_BACKEND_MAX_OUTPUT_BYTES": {
    "title": "최대 출력 크기(바이트)",
    "summary": "로컬 명령줄 생성 한 번이 읽을 수 있는 출력량을 제한합니다.",
    "usage": "기본값은 1048576바이트입니다. 출력이 너무 크면 파싱을 중단하고 출력 초과 오류를 기록합니다.",
    "valueNotes": [
      "로그에는 전체 분석 내용, 환경 변수, 비밀 값, 로컬 경로가 아닌 마스킹된 일부만 표시됩니다."
    ]
  },
  "settings.ai_model.GENERATION_BACKEND_MAX_CONCURRENCY": {
    "title": "모델 생성 최대 동시 실행 수",
    "summary": "동시에 실행할 수 있는 모델 생성 작업 수를 제한합니다.",
    "usage": "기본값은 1입니다. 로컬 CLI 백엔드 사용 시 실제 동시성은 로컬 명령 최대 동시 실행 수에 의해서도 제한됩니다.",
    "valueNotes": [
      "기본 모델 설정 사용 시 분석 워커 작업 수는 바뀌지 않습니다."
    ]
  },
  "settings.ai_model.LOCAL_CLI_BACKEND_MAX_CONCURRENCY": {
    "title": "로컬 명령 최대 동시 실행 수",
    "summary": "동시에 실행할 수 있는 로컬 명령줄 생성 프로세스 수를 제한합니다.",
    "usage": "기본값은 1로, 여러 로컬 CLI 프로세스가 동시에 시작되어 머신이 느려지는 것을 방지합니다.",
    "valueNotes": [
      "최종 동시성은 모델 생성 최대 동시 실행 수를 초과하지 않습니다."
    ]
  },
  "settings.ai_model.LITELLM_MODEL": {
    "title": "기본 모델",
    "summary": "일반 분석 흐름의 기본 LLM 모델을 선택합니다.",
    "usage": "provider/model 형식을 사용하세요. 예: deepseek/deepseek-v4-flash, gemini/gemini-3.1-pro-preview, ollama/qwen3:8b.",
    "valueNotes": [
      "런타임 우선순위는 LITELLM_CONFIG > LLM_CHANNELS > 레거시 제공자 키입니다.",
      "비어 있으면 사용 가능한 API 키나 채널에서 모델을 추론합니다.",
      "Agent는 AGENT_LITELLM_MODEL을 사용할 수 있으며, 비어 있으면 기본 모델을 상속합니다."
    ],
    "impact": [
      "일반 종목 분석, 시황 리뷰, 리포트 생성, 전용 모델이 없는 Agent 호출에 영향을 줍니다."
    ],
    "notes": [
      "제공자 접두사가 없으면 LiteLLM이 어떤 API 키를 사용할지 알 수 없을 수 있습니다.",
      "Ollama는 OPENAI_BASE_URL 대신 OLLAMA_API_BASE 또는 Ollama 채널을 사용하세요."
    ]
  },
  "settings.ai_model.LLM_CHANNELS": {
    "title": "LLM 채널",
    "summary": "다중 제공자, 키, fallback, 시각적 채널 관리를 위한 모델 채널을 선언합니다.",
    "usage": "deepseek,aihubmix처럼 쉼표로 구분된 이름을 사용한 뒤 각 채널에 LLM_<NAME>_BASE_URL, LLM_<NAME>_API_KEY(S), LLM_<NAME>_MODELS를 구성하세요.",
    "valueNotes": [
      "채널 모드가 활성화되면 런타임 선택은 채널 구성을 먼저 읽습니다.",
      "Docker 또는 GitHub Actions에서 주입된 환경 변수는 Web 설정 페이지에서 저장한 값을 덮어쓸 수 있습니다.",
      "채널 편집기에서 저장하면 제출된 키만 갱신되며 모든 기존 구성을 조용히 마이그레이션하지는 않습니다."
    ],
    "impact": [
      "기본, Agent, fallback, Vision 모델에 사용할 수 있는 소스에 영향을 줍니다."
    ],
    "notes": [
      "레거시 키와 채널이 동시에 활성화된다고 가정하지 마세요.",
      "GitHub Actions에서 사용자 정의 채널 이름은 보통 워크플로 env 매핑을 명시해야 합니다."
    ]
  },
  "settings.ai_model.AGENT_LITELLM_MODEL": {
    "title": "Agent 기본 모델",
    "summary": "Agent 워크플로 전용 모델을 설정합니다.",
    "usage": "provider/model 형식을 사용하세요. 비어 있으면 Agent는 일반 기본 모델을 상속합니다. 값은 보존되지만 Codex 로컬 Agent Chat에서는 사용되지 않습니다.",
    "valueNotes": [
      "Agent에 더 강한 추론이나 더 긴 컨텍스트가 필요할 때 유용합니다.",
      "Agent 흐름에만 영향을 줍니다."
    ],
    "impact": [
      "기본 모델 Agent 채팅, 전략 선택, Agent 도구 호출에 영향을 주며 Codex 로컬 Agent에는 영향을 주지 않습니다."
    ],
    "notes": [
      "모델이 활성화된 채널, YAML 라우팅, 레거시 제공자 키를 통해 접근 가능한지 확인하세요."
    ]
  },
  "settings.ai_model.LITELLM_FALLBACK_MODELS": {
    "title": "Fallback 모델",
    "summary": "기본 모델 실패 시 순서대로 시도할 모델입니다.",
    "usage": "쉼표로 구분된 provider/model 값을 사용하세요.",
    "valueNotes": [
      "Fallback은 기본 모델 실패 후에만 실행됩니다.",
      "채널 편집기는 저장 시 접근 불가능한 관리형 제공자 참조를 제거합니다."
    ],
    "impact": [
      "LLM 가용성을 높이지만 비용, 지연 시간, 제공자 동작이 달라질 수 있습니다."
    ],
    "notes": [
      "Fallback 목록에 기본 모델을 중복으로 넣지 마세요."
    ]
  },
  "settings.ai_model.LITELLM_CONFIG": {
    "title": "고급 라우팅 YAML",
    "summary": "전문가용 라우팅 구성을 위해 네이티브 LiteLLM YAML 라우팅 파일을 지정합니다.",
    "usage": "./litellm_config.yaml처럼 실행 중인 프로세스에서 접근 가능한 경로를 사용하세요.",
    "valueNotes": [
      "유효한 model_list는 채널과 레거시 키보다 우선합니다.",
      "Web 채널 편집기는 YAML 파일을 편집하지 않습니다."
    ],
    "impact": [
      "모델 라우팅, fallback, 사용 가능한 모델 선언에 영향을 줍니다."
    ],
    "notes": [
      "YAML 파싱에 실패하면 시스템은 채널 또는 레거시 구성으로 대체합니다."
    ]
  },
  "settings.ai_model.LLM_TEMPERATURE": {
    "title": "Temperature",
    "summary": "출력의 무작위성을 제어합니다.",
    "usage": "0.0에서 2.0 사이를 사용하세요. 값이 낮을수록 결정적이고, 높을수록 다양합니다.",
    "valueNotes": [
      "안정적인 구조화 출력에는 낮은 값을 사용하세요.",
      "일반적인 기본값은 0.7입니다."
    ],
    "impact": [
      "리포트 문구와 구조화 출력 안정성에 영향을 줍니다."
    ],
    "notes": [
      "제공자별 제한이 다를 수 있습니다."
    ]
  },
  "settings.ai_model.LLM_PROMPT_CACHE_TELEMETRY_ENABLED": {
    "title": "Prompt 캐시 텔레메트리",
    "summary": "제공자 prompt 캐시 사용량과 정규화된 진단 정보를 기록합니다.",
    "usage": "기본적으로 활성화됩니다. 비활성화하면 제공자 원시 usage JSON, 정규화된 캐시 필드, 캐시 결정 진단이 저장되지 않으며 기본 토큰 사용량은 계속 호환됩니다.",
    "valueNotes": [
      "제공자의 암시적 캐시를 제어하지 않으며 요청 파라미터를 변경하지 않습니다."
    ],
    "impact": [
      "llm_usage의 제공자/캐시 텔레메트리 완전성에 영향을 줍니다."
    ],
    "notes": [
      "캐시 적중/미적중이나 제공자 usage 형태를 조사할 때는 활성화 상태를 유지하세요."
    ]
  },
  "settings.ai_model.LLM_PROMPT_CACHE_HINTS_ENABLED": {
    "title": "Prompt 캐시 힌트",
    "summary": "주 분석 경로가 검증된 제공자별 캐시 힌트를 전송할 수 있도록 허용합니다.",
    "usage": "기본적으로 비활성화됩니다. 활성화하면 prompt_cache_key, cache_control, user_id 같은 힌트가 레지스트리에서 검증되었거나 스모크 테스트를 통과한 제공자/라우트 항목에만 전송됩니다.",
    "valueNotes": [
      "알 수 없는 OpenAI 호환 게이트웨이는 텔레메트리 전용으로 유지되며 캐시 파라미터를 자동으로 받지 않습니다."
    ],
    "impact": [
      "주 분석 경로에 한해 제공자 요청 형태가 바뀔 수 있습니다. Agent 경로는 현재 진단만 기록하고 힌트를 능동적으로 전송하지 않습니다."
    ],
    "notes": [
      "현재 LiteLLM 버전과 제공자 라우트가 요청 형태 테스트를 통과한 후에만 활성화하세요."
    ]
  },
  "settings.ai_model.LLM_PROMPT_CACHE_DIAGNOSTICS_LEVEL": {
    "title": "Prompt 캐시 진단",
    "summary": "prompt 캐시 기능과 힌트 결정 진단을 제어합니다.",
    "usage": "허용 값은 off, basic, debug입니다. 잘못된 값은 off로 대체됩니다.",
    "valueNotes": [
      "basic은 provider, API surface, verification status, hint applied, disabled reason 같은 enum만 포함합니다.",
      "debug는 HMAC에서 파생된 route/cache 진단과 matched caps id를 포함할 수 있지만, 원시 prompt, 요청 본문, 메시지 내용, webhook, API 키는 여전히 제외합니다."
    ],
    "impact": [
      "캐시 기능 매칭과 힌트 하향 처리에 대한 유지보수자 가시성에 영향을 줍니다."
    ],
    "notes": [
      "Debug 진단은 마스킹된 로그와 테스트 관찰 객체에만 사용되며 provider_usage_json에는 기록되지 않습니다."
    ]
  },
  "settings.ai_model.LLM_USAGE_HMAC_SECRET": {
    "title": "LLM 사용량 HMAC 시크릿",
    "summary": "LLM 사용 텔레메트리용 메시지 수준 HMAC 지문에 서명합니다.",
    "usage": "일반적으로 비워두면 백엔드가 로컬 시크릿 파일을 생성합니다. 배포에서 의도적으로 비교 가능한 HMAC이 필요할 때만 설정하고, openssl rand -hex 32처럼 엔트로피가 높은 임의 값을 사용하세요.",
    "valueNotes": [
      "이 시크릿은 제공자에게 전송되지 않으며 prompt, 모델 파라미터, 리포트를 변경하지 않습니다.",
      "교체 시 LLM_USAGE_HMAC_KEY_VERSION도 함께 갱신하세요."
    ],
    "impact": [
      "llm_usage의 messages_hmac, system_message_hmac, user_message_hmac 비교 가능성에 영향을 줍니다."
    ],
    "notes": [
      "로그인 세션 시크릿을 재사용하거나 실제 값을 버전 관리, 이슈, 로그, 스크린샷에 커밋/노출하지 마세요."
    ]
  },
  "settings.ai_model.LLM_USAGE_HMAC_KEY_VERSION": {
    "title": "LLM 사용량 HMAC 키 버전",
    "summary": "현재 LLM 사용량 HMAC 키 버전을 표시합니다.",
    "usage": "LLM_USAGE_HMAC_SECRET 교체 시 갱신하세요. 예: prod-2026-06.",
    "valueNotes": [
      "설정하지 않으면 local-v1이 기본값입니다."
    ],
    "impact": [
      "서로 다른 HMAC 키나 배포 간의 실수로 인한 비교를 방지합니다."
    ],
    "notes": [
      "이 값은 버전 라벨일 뿐 시크릿이 아닙니다."
    ]
  },
  "settings.ai_model.provider_keys": {
    "title": "제공자 API 키",
    "summary": "모델 제공자 또는 게이트웨이의 자격 증명을 구성합니다.",
    "usage": "제공자 콘솔에서 키를 생성하세요. 관련 다중 키 변형은 로테이션 또는 로드 밸런싱을 위해 영문 쉼표를 사용합니다.",
    "valueNotes": [
      "시크릿 필드는 Web 설정 페이지에서 마스킹됩니다.",
      "채널 모드는 LLM_<NAME>_API_KEY(S)를 먼저 읽습니다."
    ],
    "impact": [
      "해당 제공자의 모델 호출, 연결 테스트, 모델 검색에 영향을 줍니다."
    ],
    "notes": [
      "이슈, 로그, 스크린샷에 실제 키를 노출하지 마세요."
    ]
  },
  "settings.ai_model.anspire_llm": {
    "title": "Anspire LLM 게이트웨이",
    "summary": "Anspire API 키를 OpenAI 호환 LLM 게이트웨이로 사용합니다.",
    "usage": "ANSPIRE_LLM_ENABLED는 이 호환 경로를 제어하고, ANSPIRE_LLM_BASE_URL은 게이트웨이 엔드포인트를, ANSPIRE_LLM_MODEL은 기본 모델이 명시되지 않았을 때의 기본 모델을 설정합니다.",
    "valueNotes": [
      "이 경로는 주로 LLM_CHANNELS나 LITELLM_MODEL이 없는 단순 구성용입니다.",
      "LITELLM_CONFIG, LLM_CHANNELS 또는 명시적 LITELLM_MODEL이 구성된 경우 런타임 선택은 기존 우선순위를 따릅니다."
    ],
    "impact": [
      "Anspire 키가 LLM 호출에 참여할 때 사용되는 기본 게이트웨이와 모델에 영향을 줍니다."
    ],
    "notes": [
      "Anspire 키를 재사용하면서 Base URL을 다른 제공자로 지정하지 마세요."
    ]
  },
  "settings.ai_model.legacy_provider_params": {
    "title": "레거시 제공자 파라미터",
    "summary": "레거시 제공자별 경로의 모델 이름, temperature, 토큰 한도를 구성합니다.",
    "usage": "이 필드는 이전 구성을 보존합니다. 새 구성에는 LITELLM_MODEL, LITELLM_FALLBACK_MODELS, VISION_MODEL, LLM_TEMPERATURE 또는 LLM 채널 사용을 권장합니다.",
    "valueNotes": [
      "LLM 채널이 활성화되면 관련 레거시 필드는 일반 폼에서 숨겨지는 경우가 많습니다.",
      "이 필드는 일치하는 레거시 제공자 경로에만 영향을 주며 채널로 자동 마이그레이션되지 않습니다."
    ],
    "impact": [
      "채널/YAML 라우팅을 사용하지 않을 때 레거시 제공자 모델 선택과 샘플링 파라미터에 영향을 줍니다."
    ],
    "notes": [
      "레거시 필드와 채널이 모두 있으면 설정 페이지에 표시되는 런타임 소스를 신뢰하세요."
    ]
  },
  "settings.ai_model.OPENAI_BASE_URL": {
    "title": "OpenAI 호환 Base URL",
    "summary": "OpenAI 호환 서비스의 엔드포인트 루트를 설정합니다.",
    "usage": "보통 /v1로 끝납니다. 공식 API, 게이트웨이, 로컬 서비스는 서로 다른 URL을 사용합니다.",
    "valueNotes": [
      "Base URL은 API 키 제공자와 일치해야 합니다.",
      "Gemini 또는 Anthropic 공식 경로는 보통 OPENAI_BASE_URL을 사용하지 않습니다."
    ],
    "impact": [
      "레거시 OpenAI 호환 모델 호출에 영향을 줍니다."
    ],
    "notes": [
      "채널 모드에서는 채널별 LLM_<NAME>_BASE_URL을 우선 사용하세요."
    ]
  },
  "settings.data_source.TUSHARE_TOKEN": {
    "title": "Tushare Token",
    "summary": "Tushare Pro 데이터 접근에 사용하는 Token입니다.",
    "usage": "Tushare 계정의 Token을 붙여넣으세요.",
    "valueNotes": [
      "사용 가능한 API는 Tushare 권한 수준에 따라 다릅니다."
    ],
    "impact": [
      "일부 A주 기초 데이터, 종목 목록, 보강 데이터에 영향을 줍니다."
    ],
    "notes": [
      "Token을 커밋하거나 공개 로그에 출력하지 마세요."
    ]
  },
  "settings.data_source.TICKFLOW_API_KEY": {
    "title": "TickFlow API 키",
    "summary": "선택적 TickFlow A주 일봉 K-line, 실시간 시세, 종목 목록/이름 조회, 시황 리뷰 데이터를 활성화합니다.",
    "usage": "TickFlow API 키를 여기에 붙여넣으세요. 비어 있으면 시스템은 다른 데이터 소스와 fallback 경로로 계속 진행합니다.",
    "valueNotes": [
      "이 키는 선택 사항이며 주 분석 흐름에 필요하지 않습니다.",
      "배치 일봉 K-line, 실시간 시세, ex-factor, depth 권한은 TickFlow 요금제에 따라 다를 수 있습니다."
    ],
    "impact": [
      "A주 일봉 데이터 fallback, 실시간 시세, 종목 목록/이름 조회, 시황 리뷰 범위에 영향을 줍니다."
    ],
    "notes": [
      "이슈, 로그, 스크린샷에 실제 키를 노출하지 마세요."
    ]
  },
  "settings.data_source.MX_APIKEY": {
    "title": "MiaoXiang (MX_API) API 키",
    "summary": "공개 eastmoney 엔드포인트가 실패하거나 호출 제한에 걸릴 때 칩 분포와 종목별 자금 흐름을 보완하는 MiaoXiang 보조 데이터 소스를 활성화합니다.",
    "usage": "MiaoXiang Skills API 키를 여기에 붙여넣으세요. 비워 두면 시스템 동작은 변경되지 않습니다.",
    "valueNotes": [
      "선택적 보조 키이며 일봉 K-line 체인에는 참여하지 않습니다."
    ],
    "impact": [
      "eastmoney 엔드포인트가 비정상일 때 칩 분포 및 자금 흐름 가용성에 영향을 줍니다."
    ],
    "notes": [
      "이슈, 로그, 스크린샷에 실제 키를 노출하지 마세요."
    ]
  },
  "settings.data_source.MX_PRIORITY": {
    "title": "MiaoXiang 데이터 소스 우선순위",
    "summary": "MiaoXiang 보조 데이터 소스가 폴백 체인에서 어느 위치에 놓이는지 제어합니다.",
    "usage": "정수를 사용하세요. 숫자가 작을수록 먼저 시도합니다. 기본값은 6입니다. MX_APIKEY가 설정된 경우에만 적용됩니다.",
    "valueNotes": [
      "이 데이터 소스는 일봉 K-line을 제공하지 않으며, 우선순위는 보조 블록의 순서만 정합니다."
    ],
    "impact": [
      "보조 데이터 블록의 폴백 순서에 영향을 줍니다."
    ],
    "notes": [
      "대부분의 환경에서는 기본값이 적합합니다."
    ]
  },
  "settings.data_source.TICKFLOW_PRIORITY": {
    "title": "TickFlow 일봉 K-line 우선순위",
    "summary": "TickFlow가 범용 A주 일봉 K-line 데이터 소스 폴백 체인에서 어느 위치에 놓이는지 제어합니다.",
    "usage": "정수를 사용하세요. 숫자가 작을수록 먼저 시도합니다. 기본값은 2입니다. TICKFLOW_API_KEY가 설정된 경우에만 적용됩니다. 등록된 지수는 고정된 Tencent → AkShare → TickFlow → YFinance 체인을 사용하며 이 설정을 무시합니다.",
    "valueNotes": [
      "이 설정은 범용 A주 일봉 K-line에만 적용되며, 등록 지수나 실시간 시세의 데이터 소스 순서는 제어하지 않습니다."
    ],
    "impact": [
      "범용 A주 일봉 K-line 조회의 데이터 소스 순서에 영향을 줍니다. 등록 지수와 실시간 시세는 별도 순서를 사용합니다."
    ],
    "notes": [
      "TickFlow 일봉 K-line을 더 먼저 시도하려는 경우에만 값을 낮추세요. 실시간 폴백 체인에서 TickFlow 실시간 시세를 사용하려면 REALTIME_SOURCE_PRIORITY에 tickflow를 추가하세요."
    ]
  },
  "settings.data_source.TICKFLOW_KLINE_ADJUST": {
    "title": "TickFlow K-line 조정 모드",
    "summary": "TickFlow 일봉 K-line의 조정 모드를 제어합니다.",
    "usage": "허용 값은 none, forward, backward, forward_additive, backward_additive이며 기본값은 none입니다.",
    "valueNotes": [
      "none은 기존 미조정 기술적 지표 기준선을 유지합니다."
    ],
    "impact": [
      "TickFlow 일봉 K-line에서 계산되는 이동평균, 가격 변동 및 기타 기술적 지표에 영향을 줍니다."
    ],
    "notes": [
      "의도적으로 조정된 일봉 K-line 입력을 원하지 않는 한 기본값 none을 유지하세요."
    ]
  },
  "settings.data_source.TICKFLOW_BATCH_DAILY_ENABLED": {
    "title": "TickFlow 일봉 배치 프리페치",
    "summary": "배치 분석 시 TickFlow 배치 API를 통해 일봉 K-line 캐시를 먼저 예열할지 제어합니다.",
    "usage": "기본적으로 활성화됩니다. 현재 요금제에 일봉 배치 권한이 없으면 해당 실패를 잠시 네거티브 캐시하고 폴백을 계속합니다.",
    "valueNotes": [
      "공개 get_daily_data 호출 경로는 변경되지 않으며, 종목별 호출 전에 프로세스 로컬 캐시만 예열합니다."
    ],
    "impact": [
      "배치 권한이 있는 상태에서 여러 A주 종목을 분석할 때 반복되는 일봉 K-line 요청을 줄일 수 있습니다."
    ],
    "notes": [
      "권한 실패는 fail-open으로 처리되며 기존 데이터 소스 폴백을 차단하지 않습니다."
    ]
  },
  "settings.data_source.TICKFLOW_BATCH_SIZE": {
    "title": "TickFlow 배치 크기",
    "summary": "일봉 K-line 및 실시간 시세에 대한 TickFlow 배치 요청당 최대 종목 수를 제어합니다.",
    "usage": "양의 정수를 사용하세요. 기본값은 100입니다. 종목 목록이 더 길면 여러 요청으로 분할됩니다.",
    "valueNotes": [
      "너무 큰 배치는 요금제나 서버 한도에 걸릴 수 있으므로 보통 기본값이 적절합니다."
    ],
    "impact": [
      "TickFlow 배치 프리페치의 요청 수와 요청당 부하에 영향을 줍니다."
    ],
    "notes": [
      "이 설정은 TickFlow 배치 경로에만 적용됩니다."
    ]
  },
  "settings.data_source.FUTU_OPEND_HOST": {
    "title": "Futu OpenD 호스트",
    "summary": "Futu OpenD 서비스 주소를 설정합니다. 비워 두면 Futu가 비활성화됩니다.",
    "usage": "IPv4 주소 또는 IPv4로 확인되는 호스트명을 사용하세요.",
    "valueNotes": [
      "OpenD 서비스는 DSA 컨테이너에서 접근 가능해야 합니다."
    ],
    "impact": [
      "Futu 홍콩 실시간, 과거 및 펀더멘털 데이터 접근에 영향을 줍니다."
    ],
    "notes": [
      "Futu 계정 자격 증명이 아니라 서비스 주소입니다."
    ]
  },
  "settings.data_source.FUTU_OPEND_PORT": {
    "title": "Futu OpenD 포트",
    "summary": "Futu OpenD TCP 포트를 설정합니다.",
    "usage": "1~65535 범위의 포트를 사용하세요. 기본값은 11111입니다.",
    "valueNotes": [
      "포트는 OpenD 리스너와 일치해야 합니다."
    ],
    "impact": [
      "DSA의 Futu OpenD 연결에 영향을 줍니다."
    ],
    "notes": [
      "변경 후에는 보통 DSA 재시작이 필요합니다."
    ]
  },
  "settings.data_source.FUTU_HK_REALTIME_SOURCE_PRIORITY": {
    "title": "Futu 홍콩 실시간 데이터 소스 우선순위",
    "summary": "홍콩 실시간 시세의 Futu/Longbridge/AkShare/Yfinance 순서를 설정합니다.",
    "usage": "쉼표로 구분된 futu, longbridge, akshare, yfinance 값을 사용하세요.",
    "valueNotes": [
      "앞의 데이터 소스를 먼저 시도하며 실패하면 자동으로 폴백합니다."
    ],
    "impact": [
      "홍콩 실시간 시세에만 영향을 주며 A주 실시간 우선순위에는 영향을 주지 않습니다."
    ],
    "notes": [
      "OpenD가 설정되지 않은 경우 futu 항목은 건너뜁니다."
    ]
  },
  "settings.data_source.stock_index_remote": {
    "title": "원격 종목 인덱스",
    "summary": "GitHub main에서 최신 종목 자동완성 인덱스를 가져와 로컬에 캐시합니다.",
    "usage": "기본적으로 활성화됩니다. GitHub raw에 접근할 수 없으면 비활성화하세요. URL, 확인 주기, 타임아웃은 시스템 내장 값입니다.",
    "valueNotes": [
      "시스템은 잦은 GitHub 접근을 피하기 위해 48시간마다 업데이트를 확인합니다.",
      "원격 확인 실패는 WebUI나 분석을 차단하지 않습니다."
    ],
    "impact": [
      "Web 자동완성의 종목명 최신성과 백엔드 종목명 확인에 영향을 줍니다."
    ],
    "notes": [
      "원격 다운로드가 실패하면 앱은 기존 캐시나 번들 인덱스를 계속 사용합니다."
    ]
  },
  "settings.base.SCREENING_ENABLED": {
    "title": "종목 선별",
    "summary": "AlphaSift를 참고해 구현된 종목 선별 전략을 제어합니다.",
    "usage": "기본적으로 비활성화됩니다. 종목 선별은 내비게이션에 남아 있으며, true로 설정하면 종목 선별 전략을 실행합니다.",
    "valueNotes": [
      "종목 선별 결과는 연구 지원용이며 투자 조언이 아닙니다."
    ],
    "impact": [
      "내비게이션 항목을 숨기지 않으면서 전략 로딩과 종목 선별 API에 영향을 줍니다."
    ],
    "notes": [
      "비활성화해도 기존 분석, 보고서, 알림에는 영향을 주지 않습니다."
    ]
  },
  "settings.data_source.REALTIME_SOURCE_PRIORITY": {
    "title": "실시간 데이터 소스 우선순위",
    "summary": "실시간 시세의 데이터 소스 순서를 설정합니다.",
    "usage": "쉼표로 구분된 데이터 소스 이름을 사용하세요. 시스템이 순서대로 시도합니다.",
    "valueNotes": [
      "앞의 데이터 소스를 우선하며 실패하면 뒤의 데이터 소스로 폴백합니다."
    ],
    "impact": [
      "현재가, 장중 분석 및 실시간 가격에 의존하는 보고서 필드에 영향을 줍니다."
    ],
    "notes": [
      "단일 데이터 소스 실패 시 다음 소스로 폴백해야 합니다."
    ]
  },
  "settings.data_source.realtime_quotes": {
    "title": "실시간 시세",
    "summary": "실시간 시세와 장중 기술적 지표 사용 여부를 제어합니다.",
    "usage": "스위치 필드는 true/false를 사용합니다. 데이터 소스 순서는 REALTIME_SOURCE_PRIORITY로 별도 설정합니다.",
    "valueNotes": [
      "실시간 시세를 비활성화하면 과거 종가 쪽으로 폴백합니다.",
      "실시간 기술적 지표는 장중 가격을 사용합니다."
    ],
    "impact": [
      "현재가, 기술적 지표, 장중 분석 및 보고서 필드에 영향을 줍니다."
    ],
    "notes": [
      "단일 데이터 소스 실패 시 다음 소스로 폴백해야 합니다."
    ]
  },
  "settings.data_source.search_api_keys": {
    "title": "검색 API 키",
    "summary": "뉴스 및 웹 컨텍스트용 서드파티 검색 서비스를 설정합니다.",
    "usage": "다중 키 필드는 영문 쉼표를 사용합니다.",
    "valueNotes": [
      "검색 결과는 뉴스, 공시, 시장 컨텍스트를 보강합니다."
    ],
    "impact": [
      "보고서나 Agent 흐름의 뉴스 커버리지와 외부 정보에 영향을 줍니다."
    ],
    "notes": [
      "검색 서비스마다 할당량, 호출 제한, 지역 가용성이 다를 수 있습니다."
    ]
  },
  "settings.data_source.SEARXNG_BASE_URLS": {
    "title": "SearXNG URL",
    "summary": "자체 호스팅 또는 신뢰할 수 있는 SearXNG 검색 인스턴스를 설정합니다.",
    "usage": "쉼표로 구분된 URL을 사용하세요. 자체 호스팅 인스턴스는 JSON 출력을 활성화해야 합니다.",
    "valueNotes": [
      "공개 탐색이 비활성화되면 이 인스턴스만 사용됩니다."
    ],
    "impact": [
      "상용 검색 키가 없을 때 폴백 웹 검색에 영향을 줍니다."
    ],
    "notes": [
      "프로덕션에서는 공개 인스턴스보다 자체 호스팅 또는 신뢰할 수 있는 인스턴스를 권장합니다."
    ]
  },
  "settings.data_source.ENABLE_CHIP_DISTRIBUTION": {
    "title": "칩 분포",
    "summary": "칩 분포 분석을 켜고 끕니다.",
    "usage": "클라우드 배포나 데이터 소스가 불안정할 때 false로 설정하세요.",
    "valueNotes": [
      "비활성화하면 관련 데이터 호출과 실패 노이즈가 줄어듭니다."
    ],
    "impact": [
      "보고서의 칩 분포 및 매물대 분석에 영향을 줍니다."
    ],
    "notes": [
      "이 기능은 외부 데이터 소스 안정성에 의존합니다."
    ]
  },
  "settings.data_source.BIAS_THRESHOLD": {
    "title": "BIAS 임계값",
    "summary": "MA5 대비 가격 이탈에 대한 리스크 경고 임계값을 설정합니다.",
    "usage": "백분율을 입력하세요. MA5 대비 가격 이탈이 임계값을 초과하면 보고서에서 추격 매수 경고나 평균 회귀 리스크를 강조할 수 있습니다.",
    "valueNotes": [
      "강한 추세 종목은 런타임 규칙에 따라 임계값이 넓어질 수 있습니다."
    ],
    "impact": [
      "추격 매수, MA 이탈 및 매매 조언 관련 기술적 분석 경고에 영향을 줍니다."
    ],
    "notes": [
      "너무 낮으면 경고가 많아지고, 너무 높으면 추격 리스크 알림이 약해질 수 있습니다."
    ]
  },
  "settings.data_source.pytdx": {
    "title": "Pytdx 서버",
    "summary": "Tongdaxin 시세 서버를 설정하고 내장 기본값을 재정의합니다.",
    "usage": "단일 서버에는 PYTDX_HOST/PYTDX_PORT를, 여러 ip:port 항목에는 PYTDX_SERVERS를 사용하세요. PYTDX_SERVERS가 우선합니다.",
    "valueNotes": [
      "여러 서버는 영문 쉼표로 구분하세요. 런타임 데이터 소스 로직이 설정된 순서대로 시도합니다."
    ],
    "impact": [
      "Pytdx 데이터 소스를 사용할 때 시세 연결성과 가용성에 영향을 줍니다."
    ],
    "notes": [
      "서버에 접근할 수 없으면 데이터 소스 폴백에 의존하고, 불안정한 단일 엔드포인트 사용은 피하세요."
    ]
  },
  "settings.data_source.news_window": {
    "title": "뉴스 기간",
    "summary": "분석 컨텍스트에서 제외되기 전까지 뉴스가 얼마나 오래된 것까지 허용되는지 제어합니다.",
    "usage": "NEWS_MAX_AGE_DAYS가 상한을 설정하고 NEWS_STRATEGY_PROFILE이 프로필을 선택합니다.",
    "valueNotes": [
      "실효 기간은 두 값에 의해 제한됩니다."
    ],
    "impact": [
      "뉴스 컨텍스트 크기, 최신성 및 보고서 길이에 영향을 줍니다."
    ],
    "notes": [
      "너무 넓으면 오래된 뉴스가 포함되고, 너무 좁으면 느리게 진행되는 이벤트를 놓칠 수 있습니다."
    ]
  },
  "settings.notification.FEISHU_WEBHOOK_URL": {
    "title": "Feishu Webhook URL",
    "summary": "커스텀 봇 Webhook을 통해 분석 보고서를 Feishu 그룹으로 전송합니다.",
    "usage": "대상 Feishu 그룹에서 커스텀 봇을 만들고 open-apis/bot/v2/hook Webhook URL을 여기에 붙여넣으세요.",
    "valueNotes": [
      "서명이 활성화된 경우 FEISHU_WEBHOOK_SECRET도 설정하세요.",
      "키워드 보호가 활성화된 경우 FEISHU_WEBHOOK_KEYWORD도 설정하세요. 발신 시 자동으로 앞에 추가됩니다.",
      "FEISHU_APP_ID / FEISHU_APP_SECRET은 앱, 클라우드 문서 또는 Stream Bot 모드용이며 그룹 Webhook 전송을 활성화하지 않습니다."
    ],
    "impact": [
      "Feishu 알림 채널에만 영향을 주며, 전송 실패가 메인 분석 흐름을 차단해서는 안 됩니다."
    ],
    "notes": [
      "FEISHU_APP_SECRET을 FEISHU_WEBHOOK_SECRET으로 사용하지 마세요.",
      "Feishu에서 IP 허용 목록이 활성화된 경우 런타임 환경의 아웃바운드 IP를 추가하세요."
    ]
  },
  "settings.notification.FEISHU_STREAM_ENABLED": {
    "title": "Feishu Stream 모드",
    "summary": "Feishu 애플리케이션 봇 / Stream Bot 장기 연결 모드를 활성화합니다. Feishu 그룹 Webhook 스위치가 아닙니다.",
    "usage": "Feishu 앱을 생성, 게시, 권한 부여 및 이벤트 구성한 후에만 활성화하세요. FEISHU_APP_ID와 FEISHU_APP_SECRET도 필요합니다.",
    "valueNotes": [
      "true이면 런타임 Feishu 앱 봇 Stream 모드를 허용합니다.",
      "false이면 Stream 모드를 비활성화하며, 그룹 메시지 전송은 계속 FEISHU_WEBHOOK_URL을 사용합니다.",
      "앱 자격 증명이나 이 스위치만으로는 그룹 Webhook 전송이 활성화되지 않습니다."
    ],
    "impact": [
      "Feishu 애플리케이션 봇 상호작용 또는 Stream Bot 경로에 영향을 줍니다.",
      "FEISHU_WEBHOOK_URL 그룹 Webhook 전송 동작은 변경하지 않습니다."
    ],
    "notes": [
      "저장 후 관련 봇/서비스 프로세스를 재시작하세요. 기존 장기 연결은 자동으로 재구성되지 않습니다.",
      "실패는 Feishu 앱 봇 경로에만 영향을 주어야 하며 메인 분석 흐름에는 영향을 주지 않아야 합니다."
    ]
  },
  "settings.notification.FEISHU_CHAT_ID": {
    "title": "Feishu 앱 봇 전송 대상",
    "summary": "Feishu 앱 봇 알림 전송을 위한 대상 chat_id(그룹 모드) 또는 open_id(P2P 모드)를 설정합니다.",
    "usage": "FEISHU_APP_ID와 FEISHU_APP_SECRET도 설정해야 합니다. 그룹은 oc_로 시작하는 chat_id를, P2P는 ou_로 시작하는 open_id를 사용하고 FEISHU_RECEIVE_ID_TYPE을 open_id로 설정하세요.",
    "valueNotes": [
      "FEISHU_APP_ID / FEISHU_APP_SECRET만으로는 그룹 Webhook 전송이 활성화되지 않습니다.",
      "앱 봇 모드와 Webhook 모드는 상호 배타적입니다. Webhook URL이 우선하며, Webhook URL이 설정되지 않은 경우에만 앱 봇을 사용합니다."
    ],
    "impact": [
      "Feishu 앱 봇 알림 채널의 대상지에 영향을 줍니다.",
      "전송 실패가 메인 분석 흐름을 차단해서는 안 됩니다."
    ],
    "notes": [
      "앱 봇에는 im:message:send_as_bot 권한이 필요합니다.",
      "P2P 메시지의 경우 대상 사용자가 Feishu에서 앱 봇과 이전에 대화를 시작한 적이 있어야 합니다."
    ]
  },
  "settings.notification.FEISHU_RECEIVE_ID_TYPE": {
    "title": "Feishu 수신 ID 유형",
    "summary": "FEISHU_CHAT_ID의 유형을 지정합니다. 그룹 채팅은 chat_id, P2P 개인 메시지는 open_id입니다.",
    "usage": "그룹에는 chat_id를, 특정 사용자에게 P2P 메시지를 보내려면 open_id를 선택하세요.",
    "valueNotes": [
      "FEISHU_CHAT_ID도 설정된 경우에만 적용됩니다.",
      "유형이 실제 ID와 일치하지 않으면 잘못된 receive_id 오류로 전송이 실패합니다."
    ],
    "impact": [
      "Feishu 앱 봇 메시지 라우팅에 영향을 줍니다."
    ],
    "notes": [
      "chat_id가 대부분의 사용 사례를 커버합니다. 값이 chat_id나 open_id가 아니면 런타임은 chat_id로 폴백합니다."
    ]
  },
  "settings.notification.FEISHU_DOMAIN": {
    "title": "Feishu API 도메인",
    "summary": "Feishu API 리전을 선택합니다. 중국 본토는 feishu(feishu.cn), 국제는 lark(larksuite.com)입니다.",
    "usage": "중국 본토 사용자는 feishu를, 국제/Lark 사용자는 lark를 선택하세요.",
    "valueNotes": [
      "앱 봇 알림 전송에 사용되는 API 도메인에만 영향을 주며 Webhook URL에는 영향을 주지 않습니다.",
      "잘못된 도메인을 선택하면 API 오류가 발생합니다(SDK가 잘못된 서버에 연결)."
    ],
    "impact": [
      "Feishu 앱 봇 알림 전송의 API 연결성에 영향을 줍니다."
    ],
    "notes": [
      "값이 feishu나 lark가 아니면 런타임은 feishu로 폴백합니다."
    ]
  },
  "settings.notification.DINGTALK_STREAM_ENABLED": {
    "title": "DingTalk Stream 모드",
    "summary": "DingTalk 애플리케이션 봇 장기 연결 모드를 활성화합니다. 일반 DingTalk 그룹 Webhook 스위치가 아닙니다.",
    "usage": "먼저 DingTalk 애플리케이션 봇을 구성한 다음 DINGTALK_APP_KEY와 DINGTALK_APP_SECRET을 제공하세요.",
    "valueNotes": [
      "true이면 런타임 DingTalk 앱 봇 Stream/장기 연결 모드를 허용합니다.",
      "false이면 해당 장기 연결 모드를 비활성화하며, CUSTOM_WEBHOOK_URLS의 DingTalk 그룹 Webhook URL은 계속 커스텀 Webhook 경로를 사용합니다."
    ],
    "impact": [
      "DingTalk 애플리케이션 봇 상호작용 또는 장기 연결 경로에 영향을 줍니다.",
      "커스텀 Webhook 알림 전송은 변경하지 않습니다."
    ],
    "notes": [
      "저장 후 관련 봇/서비스 프로세스를 재시작하세요. 기존 장기 연결은 자동으로 재구성되지 않습니다.",
      "Stream 모드와 그룹 봇 Webhook을 동일한 전송 경로로 취급하지 마세요."
    ]
  },
  "settings.notification.DINGTALK_WEBHOOK_URL": {
    "title": "DingTalk 그룹 봇 Webhook",
    "summary": "App/Stream 모드와 별도로, 일반 DingTalk 그룹 봇 Webhook을 통해 알림을 전송합니다.",
    "usage": "DingTalk 그룹에서 사용자 지정 봇을 추가하고 oapi.dingtalk.com/robot/send로 시작하는 Webhook URL을 붙여넣으세요.",
    "valueNotes": [
      "Webhook에는 access_token이 포함되므로 보안 비밀로 취급해야 합니다.",
      "키워드 보안이 활성화된 경우 알림 내용에 설정된 키워드가 포함되어야 합니다."
    ],
    "impact": [
      "DingTalk 그룹 봇 알림의 수신 대상을 제어합니다."
    ],
    "notes": [
      "여기에 App Key를 입력하지 마세요. App/Stream 모드는 별도 설정을 사용합니다."
    ]
  },
  "settings.notification.DINGTALK_SECRET": {
    "title": "DingTalk 그룹 봇 서명 시크릿",
    "summary": "DingTalk 그룹 봇 보안 설정의 SEC 접두사 서명 시크릿을 구성합니다.",
    "usage": "봇에 서명이 활성화된 경우에만 설정하고, 그렇지 않으면 비워 두세요.",
    "valueNotes": [
      "민감한 자격 증명이므로 Web 설정에서 마스킹됩니다."
    ],
    "impact": [
      "설정하면 발신 시 각 Webhook 요청에 timestamp와 sign 파라미터를 추가합니다."
    ],
    "notes": [
      "DingTalk는 키워드와 서명 보안을 모두 요구할 수 있으며, 각각 독립적으로 구성해야 합니다."
    ]
  },
  "settings.notification.webhooks": {
    "title": "기업용 WeChat Webhook",
    "summary": "보고서 전송을 위한 기업용 WeChat 그룹 봇 Webhook을 구성합니다.",
    "usage": "기업용 WeChat에서 그룹 봇을 만들고 qyapi.weixin.qq.com/cgi-bin/webhook/send로 시작하는 Webhook URL을 붙여넣으세요.",
    "valueNotes": [
      "Webhook URL에는 민감한 Token이 포함되는 경우가 많습니다.",
      "플랫폼마다 메시지 길이, 형식, 속도 제한이 다릅니다."
    ],
    "impact": [
      "해당 Webhook 채널의 전송에 영향을 줍니다."
    ],
    "notes": [
      "단일 알림 실패가 메인 분석 흐름을 막아서는 안 됩니다."
    ]
  },
  "settings.notification.CUSTOM_WEBHOOK_URLS": {
    "title": "사용자 지정 Webhook",
    "summary": "POST JSON을 허용하는 모든 서비스로 보고서를 전송합니다.",
    "usage": "쉼표로 구분된 URL을 사용하세요. CUSTOM_WEBHOOK_BODY_TEMPLATE로 JSON 본문을 사용자 지정할 수 있습니다.",
    "valueNotes": [
      "템플릿은 JSON 객체로 렌더링되어야 합니다.",
      "잘못된 JSON을 피하려면 $content_json과 $title_json을 사용하는 것이 좋습니다.",
      "Docker는 이러한 플레이스홀더를 .env에 $$content_json / $$title_json으로 저장하고, 런타임에서 단일 $ 형식으로 복원합니다.",
      "이 설정은 사용자 지정 Webhook 페이로드 동작에만 영향을 주며 LLM 공급자/모델/Base URL이나 런타임 라우팅 우선순위를 변경하지 않습니다."
    ],
    "impact": [
      "AstrBot, NapCat 또는 자체 호스팅 푸시 연동에 영향을 줍니다."
    ],
    "notes": [
      "여러 대상을 추가하기 전에 Webhook 하나를 먼저 검증하세요."
    ]
  },
  "settings.notification.WEBHOOK_VERIFY_SSL": {
    "title": "Webhook SSL 검증",
    "summary": "Webhook 요청에 대한 HTTPS 인증서 검증을 제어합니다.",
    "usage": "기본값인 true를 유지하세요. 신뢰할 수 있는 내부 자체 서명 인증서에만 false를 사용하세요.",
    "valueNotes": [
      "검증을 비활성화하면 MITM 보호가 약화됩니다."
    ],
    "impact": [
      "사용자 지정 Webhook HTTPS 요청의 TLS 검증에 영향을 줍니다."
    ],
    "notes": [
      "공용 네트워크에서는 SSL 검증을 비활성화하지 마세요."
    ]
  },
  "settings.notification.telegram": {
    "title": "Telegram 전송",
    "summary": "Telegram Bot을 통해 보고서를 전송합니다.",
    "usage": "@BotFather로 봇을 만든 뒤 Bot Token과 Chat ID를 설정하세요. 토픽 전송 시 Thread ID도 설정할 수 있습니다.",
    "valueNotes": [
      "봇이 대상 그룹에 추가되어 게시 권한이 있어야 합니다."
    ],
    "impact": [
      "Telegram 알림에 영향을 줍니다."
    ],
    "notes": [
      "그룹 Chat ID는 음수이거나 -100으로 시작하는 경우가 많습니다."
    ]
  },
  "settings.notification.email": {
    "title": "이메일 전송",
    "summary": "SMTP를 통해 분석 보고서를 전송합니다.",
    "usage": "발신자, SMTP 인증 코드, 쉼표로 구분된 수신자를 설정하세요.",
    "valueNotes": [
      "EMAIL_PASSWORD는 보통 앱 인증 코드이며 웹 로그인 비밀번호가 아닙니다.",
      "STOCK_GROUP_N과 EMAIL_GROUP_N으로 그룹별 수신자를 다르게 지정할 수 있습니다."
    ],
    "impact": [
      "이메일 보고서, 그룹별 수신자, 시황 리뷰 이메일에 영향을 줍니다."
    ],
    "notes": [
      "먼저 메일 서비스에서 SMTP를 활성화하세요."
    ]
  },
  "settings.notification.chat_bots": {
    "title": "채팅 플랫폼 봇",
    "summary": "Discord, Slack, Pushover, ServerChan 및 유사 채널을 구성합니다.",
    "usage": "플랫폼에 맞게 Webhook 또는 Bot Token 모드를 선택하세요. Bot 모드는 보통 채널 ID도 필요합니다.",
    "valueNotes": [
      "Bot과 Webhook이 모두 구성된 경우 기존 코드는 한쪽 모드를 우선할 수 있습니다."
    ],
    "impact": [
      "해당 채팅 알림 채널에 영향을 줍니다."
    ],
    "notes": [
      "Bot Token, Webhook URL, SendKey는 비밀 정보입니다."
    ]
  },
  "settings.notification.report_output": {
    "title": "보고서 출력",
    "summary": "알림 상세 수준, 기본 출력 언어, 템플릿 출력을 제어합니다.",
    "usage": "REPORT_TYPE은 simple/full/brief를 지원합니다. REPORT_LANGUAGE는 zh/en/ko를 지원합니다. Agent Chat은 context.report_language가 생략된 경우에만 이 기본값을 따릅니다.",
    "valueNotes": [
      "보고서 언어는 기본 템플릿, 알림 텍스트, 언어를 명시하지 않은 Agent Chat 응답에 영향을 주며 Web UI 언어는 변경하지 않습니다."
    ],
    "impact": [
      "알림 길이, 언어, 기본 언어에 의존하는 Agent Chat 응답의 가독성에 영향을 줍니다."
    ],
    "notes": [
      "전체 보고서는 길어서 일부 플랫폼에서 분할될 수 있습니다."
    ]
  },
  "settings.system.WEBUI_HOST": {
    "title": "WebUI 호스트",
    "summary": "WebUI 서비스가 바인딩할 네트워크 주소를 제어합니다.",
    "usage": "로컬 전용 접속에는 127.0.0.1을 사용하세요. 클라우드, Docker 또는 외부 접속에는 0.0.0.0을 사용하세요.",
    "valueNotes": [
      "시작 시 명시적 --host가 더 높은 우선순위를 가집니다. --host가 없으면 런타임에 구성된 WEBUI_HOST(또는 기본값)가 사용됩니다.",
      "설정 페이지에서 저장하면 .env에 기록되고 런타임 구성 객체를 다시 로드하지만, 실행 중인 WebUI/API 프로세스의 호스트 바인딩은 변경되지 않습니다.",
      "Docker Compose는 보통 컨테이너 내부에서 0.0.0.0으로 바인딩하며, 호스트 접속은 포트 매핑에도 영향을 받습니다."
    ],
    "impact": [
      "재시작 후 WebUI에 로컬, LAN, 공용 인터넷에서 접속할 수 있는지에 영향을 줍니다."
    ],
    "notes": [
      "WEBUI_HOST를 변경한 후 프로세스, Docker 컨테이너 또는 서비스 관리자를 재시작하세요.",
      "서비스를 공개할 때는 ADMIN_AUTH_ENABLED를 활성화하세요.",
      "리버스 프록시 뒤에서는 로그인 속도 제한과 실제 IP 감지를 위해 TRUST_X_FORWARDED_FOR도 검토하세요."
    ]
  },
  "settings.system.WEBUI_PORT": {
    "title": "WebUI 포트",
    "summary": "WebUI 서비스가 수신 대기할 포트를 제어합니다.",
    "usage": "기본값은 8000입니다. 필요하면 1-65535 범위의 다른 포트를 사용하세요.",
    "valueNotes": [
      "시작 시 명시적 --port가 더 높은 우선순위를 가집니다. --port가 없으면 런타임에 구성된 WEBUI_PORT(또는 기본값)가 사용됩니다.",
      "Docker 또는 클라우드 접속은 호스트 포트 매핑과 방화벽 규칙에도 영향을 받습니다.",
      "설정 페이지에서 저장하면 .env에만 기록되며 실행 중인 WebUI/API 프로세스는 다시 바인딩되지 않습니다."
    ],
    "impact": [
      "재시작 후 WebUI를 열 때 사용하는 브라우저 URL에 영향을 줍니다."
    ],
    "notes": [
      "WEBUI_PORT를 변경한 후 프로세스, Docker 컨테이너 또는 서비스 관리자를 재시작하세요."
    ]
  },
  "settings.system.LOG_DIR": {
    "title": "로그 디렉터리",
    "summary": "애플리케이션 로그가 기록되는 위치를 구성합니다.",
    "usage": "런타임 사용자 또는 컨테이너가 쓸 수 있는 디렉터리를 사용하세요. 로컬 기본값은 ./logs이며, 컨테이너 배포에서는 보통 /app/logs를 사용합니다.",
    "valueNotes": [
      "상대 경로는 프로세스 작업 디렉터리 기준으로 해석됩니다.",
      "Longbridge SDK 같은 구성 요소도 이 디렉터리에 로그 파일을 기록할 수 있습니다."
    ],
    "impact": [
      "애플리케이션 로그, 일부 SDK 로그, 문제 해결용 파일에 영향을 줍니다."
    ],
    "notes": [
      "이 필드를 변경한 후 프로세스를 재시작하세요. 이미 초기화된 로거는 즉시 전환되지 않을 수 있습니다.",
      "Docker, 데스크톱, 소스 배포는 쓰기 가능한 경로가 다를 수 있습니다."
    ]
  },
  "settings.system.WEBUI_ENABLED": {
    "title": "기본 WebUI 시작",
    "summary": "시작 시 기본으로 WebUI/API 서비스 모드를 사용할지 제어합니다.",
    "usage": "시작 시점의 호환성 플래그입니다. 저장해도 현재 WebUI 프로세스가 즉시 시작되거나 중지되지 않습니다.",
    "valueNotes": [
      "true이면 이후 기본 진입점 시작 시 WebUI/API 서비스 모드를 우선합니다.",
      "false이면 WebUI가 아닌 기본 시작 동작을 유지하며, 명시적 CLI 인수로 재정의할 수 있습니다."
    ],
    "impact": [
      "다음 main.py 또는 서비스 진입점 시작 시 기본 모드에 영향을 줍니다."
    ],
    "notes": [
      "변경 사항을 적용하려면 해당 프로세스를 재시작하세요.",
      "이 스위치를 현재 설정 페이지의 즉시 켜기/끄기 제어로 오해하지 마세요."
    ]
  },
  "settings.system.WEBUI_AUTO_BUILD": {
    "title": "Web 프론트엔드 자동 빌드",
    "summary": "백엔드 WebUI 시작 시 프론트엔드 정적 자산을 자동으로 확인하고 빌드할지 제어합니다.",
    "usage": "소스 배포에서는 true를 유지하세요. 사전 빌드된 이미지, 오프라인 환경, 제한된 런타임에서는 false로 설정하세요.",
    "valueNotes": [
      "true이면 시작 시 apps/dsa-web 정적 자산을 준비합니다.",
      "false이면 기존 빌드 산출물만 확인합니다. 자산이 없으면 WebUI를 사용할 수 없거나 백엔드 경고만 기록될 수 있습니다."
    ],
    "impact": [
      "다음 WebUI 백엔드 시작 시 프론트엔드 자산 준비에 영향을 줍니다."
    ],
    "notes": [
      "저장해도 즉시 빌드되지 않습니다. 백엔드 프로세스를 재시작하세요.",
      "Docker나 패키지에서 비활성화하기 전에 빌드된 자산이 이미 포함되어 있는지 확인하세요."
    ]
  },
  "settings.system.ADMIN_AUTH_ENABLED": {
    "title": "웹 로그인 보호",
    "summary": "WebUI에 관리자 비밀번호 보호를 활성화합니다.",
    "usage": "WebUI 인증 설정 항목에서 활성화하거나 비활성화하세요. 필요하면 python -m src.auth reset_password로 재설정할 수 있습니다.",
    "valueNotes": [
      "공개, 공유 LAN, 리버스 프록시 배포에 권장합니다.",
      "이 필드는 인증 설정 흐름을 우회하지 않도록 일반 구성 페이지에서 읽기 전용으로 표시됩니다."
    ],
    "impact": [
      "WebUI 로그인, 설정 접근, 관리자 작업에 영향을 줍니다."
    ],
    "notes": [
      "배포 환경에서 인증 데이터가 영속되는지 확인하세요. .env를 직접 수정한 경우 프로세스 재시작 또는 인증 설정 흐름을 통해 상태를 갱신해야 합니다."
    ]
  },
  "settings.system.TRUST_X_FORWARDED_FOR": {
    "title": "X-Forwarded-For 신뢰",
    "summary": "신뢰할 수 있는 리버스 프록시 뒤에서 클라이언트 IP 감지에 X-Forwarded-For를 사용합니다.",
    "usage": "신뢰할 수 있는 리버스 프록시 하나 뒤에 있을 때만 true로 설정하세요. 공용 직접 접속에서는 false를 유지하세요.",
    "valueNotes": [
      "프록시나 CDN이 여러 개면 속도 제한 키가 엣지 프록시 IP로 축소될 수 있습니다."
    ],
    "impact": [
      "로그인 속도 제한, 감사, 클라이언트 IP 감지에 영향을 줍니다."
    ],
    "notes": [
      "신뢰할 수 없는 프록시 체인에서는 활성화하지 마세요."
    ]
  },
  "settings.system.schedule": {
    "title": "스케줄",
    "summary": "일일 예약 분석과 시작 시 즉시 실행 여부를 제어합니다.",
    "usage": "SCHEDULE_TIME은 HH:MM 24시간 형식을 사용합니다. SCHEDULE_TIMES는 쉼표로 구분된 HH:MM 값을 허용합니다. SCHEDULE_ENABLED는 런타임 스케줄러 활성화 여부를 제어합니다. DSA_RUNTIME_SCHEDULER_TIMEOUT_SECONDS는 각 Web/API 예약 분석의 최대 제한 시간을 설정합니다(기본 2700초, 최소 60).",
    "valueNotes": [
      "이미 실행 중인 스케줄 모드는 다음 스케줄러 확인 시 새로운 SCHEDULE_TIME / SCHEDULE_TIMES 값을 읽고 일일 작업을 다시 구성합니다.",
      "장기 실행 WebUI/API/Desktop 프로세스는 SCHEDULE_ENABLED, SCHEDULE_TIME, SCHEDULE_TIMES 저장 후 런타임 스케줄러를 시작, 중지 또는 재구성합니다.",
      "DSA_RUNTIME_SCHEDULER_TIMEOUT_SECONDS 변경 후 다음 분석부터 새 값을 사용하며 일일 작업을 재구성하지 않습니다. 시간 초과 시 격리된 분석 프로세스가 종료됩니다.",
      "예약 실행은 현재 저장된 STOCK_LIST를 읽습니다."
    ],
    "impact": [
      "스케줄 모드에서 자동 분석 빈도, 시작 동작, 알림 시점에 영향을 줍니다."
    ],
    "notes": [
      "특히 컨테이너와 서버에서 런타임 시간대를 확인하세요.",
      "SCHEDULE_RUN_IMMEDIATELY는 시작 시점 설정으로 유지됩니다. 저장해도 즉시 분석이 실행되지는 않습니다."
    ]
  },
  "settings.system.RUN_IMMEDIATELY": {
    "title": "즉시 실행",
    "summary": "스케줄 모드가 아닌 시작 시 분석을 즉시 한 번 실행할지 제어합니다.",
    "usage": "분석 없이 서비스를 시작하려면 false로 설정하세요.",
    "valueNotes": [
      "SCHEDULE_RUN_IMMEDIATELY는 스케줄 모드를 별도로 제어합니다."
    ],
    "impact": [
      "서비스 시작 후 첫 분석에 영향을 줍니다."
    ],
    "notes": [
      "스케줄 모드가 아닌 경우의 시작 시점 설정입니다. 저장해도 실행 중인 WebUI/API 프로세스에서 분석이 트리거되지 않습니다.",
      "CLI 인수와 실행 모드도 최종 동작에 영향을 줄 수 있습니다. 변경 사항을 적용하려면 스케줄 모드가 아닌 프로세스를 재시작하세요."
    ]
  },
  "settings.system.TRADING_DAY_CHECK_ENABLED": {
    "title": "거래일 확인",
    "summary": "휴장일에 분석을 건너뛸지 제어합니다.",
    "usage": "기본값은 true입니다. 재정의하려면 false로 설정하거나 --force-run을 사용하세요.",
    "valueNotes": [
      "A주, 홍콩, 미국 및 기타 지원 시장의 시장 캘린더를 사용합니다."
    ],
    "impact": [
      "휴일의 예약 작업, CLI 실행, GitHub Actions 수동 실행에 영향을 줍니다. Web/API 시황 리뷰 버튼은 직접 제출합니다."
    ],
    "notes": [
      "비활성화하면 휴장 시장에서 실시간 시세가 누락된 보고서가 생성될 수 있습니다."
    ]
  },
  "settings.system.HTTP_PROXY": {
    "title": "네트워크 프록시",
    "summary": "외부 API, 모델, 검색 요청에 사용할 프록시를 설정합니다.",
    "usage": "http://host:port 형식을 사용하세요. HTTPS 프록시에는 HTTPS_PROXY를 사용할 수 있습니다.",
    "valueNotes": [
      "적용 여부는 기반 라이브러리와 환경 처리 방식에 따라 달라집니다."
    ],
    "impact": [
      "데이터 소스, LLM, 검색, 알림 네트워크 호출에 영향을 줍니다."
    ],
    "notes": [
      "컨테이너 내부에서 127.0.0.1은 호스트가 아닌 컨테이너를 가리킵니다."
    ]
  },
  "settings.llm_channel.channel_name": {
    "title": "채널 이름",
    "summary": "LLM_<NAME>_* 환경 변수 이름을 생성합니다.",
    "usage": "소문자, 숫자, 밑줄만 사용하세요. 저장하면 LLM_CHANNELS도 함께 기록됩니다.",
    "valueNotes": [
      "deepseek는 LLM_DEEPSEEK_BASE_URL, LLM_DEEPSEEK_API_KEY(S), LLM_DEEPSEEK_MODELS에 매핑됩니다."
    ],
    "impact": [
      "환경 변수 키 이름, 런타임 선택, GitHub Actions 매핑에 영향을 줍니다."
    ],
    "notes": [
      "이름을 변경해도 모든 외부 환경 변수가 자동으로 마이그레이션되지는 않습니다."
    ]
  },
  "settings.llm_channel.protocol": {
    "title": "채널 프로토콜",
    "summary": "채널이 사용하는 호환 프로토콜을 선언합니다.",
    "usage": "OpenAI Compatible은 대부분의 게이트웨이에 적합합니다. 공식 Gemini, Anthropic, DeepSeek은 해당 프로토콜을 사용할 수 있습니다.",
    "valueNotes": [
      "프로토콜은 모델 접두사 정규화, 연결 테스트, 검색에 영향을 줍니다."
    ],
    "impact": [
      "요청 어댑터, 모델 파싱, 런타임 모델 참조에 영향을 줍니다."
    ],
    "notes": [
      "프로토콜, Base URL, API Key는 같은 서비스에 속해야 합니다."
    ]
  },
  "settings.llm_channel.api_surface": {
    "title": "API 인터페이스",
    "summary": "채널이 Chat Completions를 호출할지 Responses API를 호출할지 선택합니다.",
    "usage": "대부분의 호환 서비스에서는 기본값을 유지하세요. 모델이 요구할 때만 Responses를 선택하세요.",
    "valueNotes": [
      "한 채널의 모든 모델은 동일한 API 인터페이스를 공유합니다. 라우트 별칭도 채널 간 인터페이스를 혼합할 수 없으므로 둘 다 필요하면 별도 별칭을 사용하세요."
    ],
    "impact": [
      "연결 테스트, 분석, Agent, 스트리밍, 도구 호출에 실제로 사용되는 엔드포인트에 영향을 줍니다."
    ],
    "notes": [
      "현재 Responses는 OpenAI Compatible 프로토콜이 필요하며, 모델은 anthropic/, gemini/, xai/ 같은 다른 LiteLLM 공급자 접두사를 명시적으로 사용할 수 없습니다. 실패 후 자동 전환되지 않습니다."
    ]
  },
  "settings.llm_channel.base_url": {
    "title": "Base URL",
    "summary": "이 채널의 엔드포인트 루트입니다.",
    "usage": "OpenAI 호환 서비스는 보통 /v1 URL을 사용합니다. 일부 공식 SDK 채널은 비워 둘 수 있습니다.",
    "valueNotes": [
      "공급자 프리셋은 참고용이며, 실제 사용 가능 여부는 계정, 지역, 공급자 API에 따라 달라집니다."
    ],
    "impact": [
      "연결 테스트, 모델 검색, 채널을 통한 모든 호출에 영향을 줍니다."
    ],
    "notes": [
      "한 공급자의 키와 다른 공급자의 Base URL을 혼용하지 마세요."
    ]
  },
  "settings.llm_channel.api_key": {
    "title": "API Key",
    "summary": "이 채널에서 사용하는 자격 증명입니다.",
    "usage": "키 하나를 직접 사용하거나, 영어 쉼표로 구분해 여러 키를 사용하세요.",
    "valueNotes": [
      "Ollama처럼 로컬에서 인증이 없는 서비스는 비워 둘 수 있습니다."
    ],
    "impact": [
      "연결 테스트, 검색, 런타임 호출, 키 교체에 영향을 줍니다."
    ],
    "notes": [
      "스크린샷, 로그, 이슈에 실제 키를 노출하지 마세요."
    ]
  },
  "settings.llm_channel.models": {
    "title": "채널 모델",
    "summary": "런타임에서 선택할 수 있는 모델을 선언합니다.",
    "usage": "/models를 지원하는 경우 모델 탐색을 사용하고, 그렇지 않으면 쉼표로 구분한 모델 이름을 직접 입력하세요.",
    "valueNotes": [
      "런타임 기본, Agent, Vision, fallback 선택은 이 목록을 참조합니다."
    ],
    "impact": [
      "선택 가능한 모델, 만료된 모델 정리, 라우팅에 영향을 줍니다."
    ],
    "notes": [
      "실제 사용 가능 여부는 여전히 제공자 권한과 런타임 테스트에 따라 달라집니다."
    ]
  },
  "settings.llm_channel.capability_checks": {
    "title": "런타임 기능 검사",
    "summary": "현재 채널 모델의 JSON, 도구, 스트림, Vision 지원 여부를 수동으로 검사합니다.",
    "usage": "기능을 선택하고 검사를 실행하세요. 실제 LLM 요청을 전송합니다.",
    "valueNotes": [
      "여러 검사를 실행하면 20~40초가 걸리고 할당량이 소모될 수 있습니다."
    ],
    "impact": [
      "페이지 진단에만 영향을 주며 저장된 설정은 변경하지 않습니다."
    ],
    "notes": [
      "기능 라벨은 참고용이며, 런타임 검사와 실제 호출이 최종 판단 기준입니다."
    ]
  },
  "settings.llm_channel.temperature": {
    "title": "Temperature",
    "summary": "런타임 샘플링 temperature를 통합 설정합니다.",
    "usage": "슬라이더 범위는 0~2입니다. 낮을수록 안정적이고 높을수록 무작위성이 커집니다.",
    "valueNotes": [
      "저장 시 LLM_TEMPERATURE에 기록됩니다."
    ],
    "impact": [
      "일반 분석, Agent 출력, 보고서에 영향을 줍니다."
    ],
    "notes": [
      "구조화 출력이 불안정하면 먼저 이 값을 낮추세요."
    ]
  },
  "settings.llm_channel.primary_model": {
    "title": "기본 모델",
    "summary": "일반 분석에 사용하는 기본 런타임 모델입니다.",
    "usage": "활성화된 채널 모델 중에서 선택하세요. Auto는 사용 가능한 첫 번째 모델을 사용합니다.",
    "valueNotes": [
      "저장 시 LITELLM_MODEL에 기록됩니다."
    ],
    "impact": [
      "종목 분석, 시황 리뷰, 기본 보고서 생성에 영향을 줍니다."
    ],
    "notes": [
      "연결할 수 없는 관리형 제공자 모델은 저장 시 정리될 수 있습니다."
    ]
  },
  "settings.llm_channel.agent_primary_model": {
    "title": "Agent 기본 모델",
    "summary": "Agent 흐름 전용 기본 모델입니다.",
    "usage": "독립 모델을 선택하거나 일반 기본 모델을 자동 상속하세요.",
    "valueNotes": [
      "저장 시 AGENT_LITELLM_MODEL에 기록됩니다."
    ],
    "impact": [
      "Agent 채팅, 전략 워크플로, 도구 호출에 영향을 줍니다."
    ],
    "notes": [
      "더 강력한 Agent 모델은 비용과 지연 시간도 높일 수 있습니다."
    ]
  },
  "settings.llm_channel.fallback_models": {
    "title": "Fallback 모델",
    "summary": "기본 모델 실패 시 사용하는 백업 모델입니다.",
    "usage": "하나 이상의 모델을 선택하세요. 기본 모델은 fallback에 중복 포함되지 않습니다.",
    "valueNotes": [
      "저장 시 LITELLM_FALLBACK_MODELS에 기록됩니다."
    ],
    "impact": [
      "LLM 장애 복구와 제공자 간 전환 동작에 영향을 줍니다."
    ],
    "notes": [
      "먼저 연결 테스트나 실제 호출로 fallback 모델을 검증하세요."
    ]
  },
  "settings.llm_channel.vision_model": {
    "title": "Vision 모델",
    "summary": "이미지 또는 스크린샷 입력에 사용하는 모델입니다.",
    "usage": "이미지 입력을 지원하는 모델을 선택하거나 자동 Vision 기본값을 사용하세요.",
    "valueNotes": [
      "저장 시 VISION_MODEL에 기록됩니다."
    ],
    "impact": [
      "스크린샷 추출과 Vision 분석에 영향을 줍니다."
    ],
    "notes": [
      "텍스트 전용 모델은 Vision을 지원하지 않을 수 있으므로 기능 검사로 확인하세요."
    ]
  },
  "settings.agent.AGENT_MODE": {
    "title": "Agent 모드",
    "summary": "단일 턴 LLM 흐름을 대체하는 ReAct Agent를 종목 분석에 사용합니다.",
    "usage": "활성화하면 도구 호출, 뉴스 검색, 복잡한 추론 체인을 수행할 수 있는 다단계 추론 Agent를 사용합니다.",
    "valueNotes": [
      "비활성화하면 일반 단일 턴 LLM 분석을 사용합니다.",
      "Agent 모드는 AGENT_ARCH와 결합하여 single(클래식 ReAct) 또는 multi(오케스트레이터 파이프라인)를 선택할 수 있습니다."
    ],
    "impact": [
      "종목 분석 흐름, 보고서 품질, LLM 호출 횟수에 영향을 줍니다."
    ],
    "notes": [
      "Agent 모드는 더 많은 토큰과 시간을 소모하므로 심층 추론이 필요한 시나리오에 적합합니다."
    ]
  },
  "settings.agent.AGENT_BACKEND": {
    "title": "종목 질문 방식",
    "showFieldKey": false,
    "summary": "종목 질문 채팅에서 기본 모델 설정을 사용할지, DSA가 실행 중인 기기에서 Codex를 사용할지 선택합니다.",
    "usage": "DSA가 실행 중인 기기에 Codex가 설치되어 로그인되어 있지 않다면 Auto(권장)를 유지하세요. Auto는 실험적 Codex 경로를 절대 활성화하지 않습니다.",
    "valueNotes": [
      "Auto(권장)와 기본 모델 설정은 모두 기존 모델 및 API 경로를 유지합니다.",
      "Codex 로컬 Agent(실험적)는 현재 단일 Agent 채팅만 지원하며 Codex Multi Agent 또는 Codex Deep Research는 지원하지 않습니다.",
      "Codex 로컬 Agent는 현재 macOS, Linux, 그리고 WSL 내부에서 완전히 실행되는 DSA 백엔드를 지원합니다. 네이티브 Windows 백엔드는 아직 지원하지 않습니다.",
      "로컬 Agent는 오프라인 모델이 아니며, 종목 질문과 도구 결과는 Codex에 구성된 서비스에서 처리될 수 있습니다."
    ],
    "impact": [
      "종목 질문 채팅에만 영향을 줍니다. 일반 보고서, 예약 분석, 기존 Multi Agent, Deep Research는 변경되지 않습니다."
    ],
    "notes": [
      "DSA는 Codex 자격 증명을 읽거나 저장하지 않습니다. Codex 프로세스는 자체 로그인 상태를 사용합니다.",
      "설정 검사는 구성, Codex 명령, 필요한 프로토콜만 확인합니다. 로그인, 모델 호출, 종목 데이터 읽기는 수행하지 않으며 “시도 가능”은 검증된 성공을 의미하지 않습니다.",
      "저장 후 채팅에서 바로 질문하세요. 첫 질문이 첫 실제 실행이며, 로그인이나 Codex 서비스가 실패하면 채팅은 질문을 보존하고 발생한 상황을 설명합니다.",
      "원래 동작으로 되돌리려면 Auto(권장)를 선택하고 저장하세요."
    ],
    "examples": []
  },
  "settings.agent.AGENT_GENERATION_BACKEND": {
    "title": "종목 질문 생성 방식",
    "showFieldKey": false,
    "summary": "종목 질문 어시스턴트가 답변을 생성하고 시장, 뉴스, 이력 도구를 조회하는 방식을 선택합니다.",
    "usage": "일반적으로 Auto를 유지하세요. 시스템이 현재 사용 가능한 방식으로 질문에 답하고 데이터 도구를 호출하며, 어시스턴트 방식을 고정해야 할 때만 변경하세요.",
    "valueNotes": [
      "확실하지 않다면 Auto를 선택하세요.",
      "어시스턴트를 일반 모델 설정에 명시적으로 고정하려는 경우에만 “기본 모델 설정”을 선택하세요.",
      "로컬 CLI 백엔드는 현재 종목 질문 어시스턴트의 데이터 도구 호출을 직접 실행할 수 없으며, 수동으로 명시 설정하면 해당 기능을 사용할 수 없는 것으로 보고합니다."
    ],
    "impact": [
      "어시스턴트 답변 경로와 도구 진입점에 영향을 줍니다. 어시스턴트가 사용할 수 있는 도구 자체는 변경하지 않습니다."
    ],
    "notes": [
      "기본 동작으로 되돌리려면 Auto를 선택하고 저장하세요.",
      "이 설정은 종목 질문 어시스턴트에만 영향을 줍니다. 일반 종목 분석이나 시황 리뷰 생성은 변경하지 않습니다."
    ],
    "examples": []
  },
  "settings.agent.AGENT_MAX_STEPS": {
    "title": "Agent 최대 단계",
    "summary": "종목 질문 한 턴당 기본 모델 Agent의 추론 단계와 Codex 도구 호출 수를 제한합니다.",
    "usage": "기본 모델 Agent에서는 기본값일 때 각 하위 Agent가 자체 프리셋을 유지하며, 값을 높이면 모든 하위 Agent의 상한이 올라가고 낮추면 더 큰 프리셋도 제한됩니다. Codex에서는 한 번의 종목 질문 턴에서 수행할 수 있는 데이터 도구 호출 수를 제한합니다.",
    "valueNotes": [
      "단계가 높을수록 더 깊은 추론이 가능하지만 시간과 토큰 비용이 증가합니다.",
      "복잡한 시나리오(예: 다중 전략 오케스트레이션)에는 더 높은 값이 필요할 수 있습니다."
    ],
    "impact": [
      "기본 모델의 추론 깊이 또는 턴당 Codex 데이터 도구 호출 수와 함께 소요 시간, 토큰 소모에 영향을 줍니다."
    ],
    "notes": [
      "값이 너무 낮으면 추론이 불완전해질 수 있습니다."
    ]
  },
  "settings.agent.AGENT_SKILLS": {
    "title": "Agent 전략",
    "summary": "Agent가 사용할 전략 스킬 목록을 지정합니다.",
    "usage": "쉼표로 구분한 전략 이름을 사용하세요. 비워 두면 기본값(bull_trend)을 사용합니다. all로 설정하면 모든 전략을 활성화합니다.",
    "valueNotes": [
      "특정 전략(all 제외)을 설정하면 예약 작업이 자동으로 Agent 파이프라인을 사용합니다.",
      "사용 가능한 전략은 strategies/ 디렉터리의 정의 파일에 따라 달라집니다."
    ],
    "impact": [
      "Agent 분석의 전략 선택과 최종 신호 집계에 영향을 줍니다."
    ],
    "notes": [
      "사용자 정의 전략은 AGENT_SKILL_DIR 디렉터리에 배치해야 합니다."
    ]
  },
  "settings.agent.AGENT_SKILL_DIR": {
    "title": "전략 디렉터리",
    "summary": "Agent 전략 정의 파일이 있는 디렉터리입니다.",
    "usage": "프로젝트 루트 기준 상대 경로를 입력하세요. 디렉터리에는 YAML 또는 SKILL.md 전략 정의가 포함될 수 있습니다.",
    "valueNotes": [
      "기본 전략 디렉터리에는 내장 전략이 포함되어 있습니다."
    ],
    "impact": [
      "Agent가 탐색할 수 있는 전략에 영향을 줍니다."
    ],
    "notes": [
      "디렉터리를 변경한 후에는 유효한 전략 정의 파일이 포함되어 있는지 확인하세요."
    ]
  },
  "settings.agent.AGENT_NL_ROUTING": {
    "title": "자연어 라우팅",
    "summary": "봇 디스패처가 자연어를 통해 종목 질문을 Agent로 라우팅할 수 있게 합니다.",
    "usage": "활성화하면 개인 채팅의 신뢰도 높은 종목 메시지(또는 그룹의 @멘션)가 명시적 명령 없이 자동으로 Agent로 라우팅됩니다.",
    "valueNotes": [
      "봇 통합(Feishu, Telegram 등)에만 영향을 주며 Web API에는 영향을 주지 않습니다."
    ],
    "impact": [
      "봇 상호작용 경험과 Agent 트리거 방식에 영향을 줍니다."
    ],
    "notes": [
      "Agent 모드와 해당 봇 채널이 모두 활성화되어 있어야 합니다."
    ]
  },
  "settings.agent.AGENT_ARCH": {
    "title": "Agent 아키텍처",
    "summary": "Agent 실행 아키텍처를 선택합니다.",
    "usage": "single은 클래식 ReAct 실행기를 사용하고, multi는 전문 하위 Agent와 함께 오케스트레이터 파이프라인을 사용합니다.",
    "valueNotes": [
      "single은 추론 체인이 짧은 단순한 시나리오에 적합합니다.",
      "multi는 기술적 분석, 인텔리전스, 리스크 등 전문 하위 Agent 간 협업을 지원합니다."
    ],
    "impact": [
      "Agent 분석 흐름, 하위 Agent 스케줄링, 보고서 구조에 영향을 줍니다."
    ],
    "notes": [
      "multi를 선택한 경우 AGENT_ORCHESTRATOR_MODE로 파이프라인을 조정하세요."
    ]
  },
  "settings.agent.AGENT_ORCHESTRATOR_MODE": {
    "title": "오케스트레이터 모드",
    "summary": "AGENT_ARCH=multi일 때만 적용됩니다. 파이프라인에 포함할 하위 Agent를 제어합니다.",
    "usage": "quick: 기술→결정; standard: 기술→인텔리전스→결정; full: 기술→인텔리전스→리스크→결정; specialist: full + 전략별 Agent.",
    "valueNotes": [
      "더 완전한 모드는 더 깊은 분석을 제공하지만 시간과 토큰을 더 소모합니다.",
      "specialist 모드는 각 전략마다 전용 Agent를 시작합니다."
    ],
    "impact": [
      "다중 Agent 분석 깊이와 리소스 소모에 영향을 줍니다."
    ],
    "notes": [
      "이 필드는 AGENT_ARCH=multi일 때만 적용됩니다."
    ]
  },
  "settings.agent.AGENT_ORCHESTRATOR_TIMEOUT_S": {
    "title": "Agent 타임아웃",
    "summary": "Agent 실행에 공유되는 타임아웃 예산(초)입니다.",
    "usage": "single 모드에서는 전체 ReAct 루프 예산, multi 모드에서는 협업 파이프라인 예산입니다. 0으로 설정하면 비활성화됩니다.",
    "valueNotes": [
      "타임아웃되면 Agent는 부분 결과를 반환합니다.",
      "다중 종목 분석이나 specialist 모드에서는 값을 높이는 것을 고려하세요."
    ],
    "impact": [
      "Agent 분석의 최대 대기 시간에 영향을 줍니다."
    ],
    "notes": [
      "타임아웃은 분석 파이프라인의 다른 종목에는 영향을 주지 않습니다."
    ]
  },
  "settings.agent.AGENT_SKILL_CONCURRENCY": {
    "title": "전략 스킬 동시성",
    "summary": "specialist 모드에서 동시에 실행할 수 있는 전문 전략 Agent 수를 제어합니다.",
    "usage": "기본값은 3이며 허용 범위는 1~4입니다. 값을 낮추면 최대 모델 부하가 줄고, 높이면 다중 전략 배치 지연 시간을 단축할 수 있습니다.",
    "valueNotes": [
      "이 값은 specialist 배치 동시성만 제한하며 합성에 참여하는 전략은 변경하지 않습니다.",
      "전체 Agent 타임아웃은 공유 예산으로 유지되며, 전략 수가 동시성보다 많으면 각 스킬은 웨이브 수에 따라 예산을 분할받습니다."
    ],
    "impact": [
      "specialist 다중 전략 동시성, 지연 시간, 최대 모델 호출 수에 영향을 줍니다."
    ],
    "notes": [
      "단일 전략 실패나 타임아웃은 진단에 기록되며 다른 전략이나 최종 결정을 막지 않습니다."
    ]
  },
  "settings.agent.AGENT_RISK_OVERRIDE": {
    "title": "리스크 Agent 거부권",
    "summary": "중요한 리스크 플래그가 감지되면 리스크 Agent가 매수 신호를 거부할 수 있게 합니다.",
    "usage": "활성화하면 full/specialist 모드의 리스크 Agent가 매수 추천을 보유 또는 매도로 하향할 수 있습니다.",
    "valueNotes": [
      "AGENT_ORCHESTRATOR_MODE에 리스크 단계가 포함된 경우에만 적용됩니다."
    ],
    "impact": [
      "최종 투자 추천의 리스크 보수성에 영향을 줍니다."
    ],
    "notes": [
      "비활성화하면 리스크 Agent 의견은 참고용이며 결정을 뒤집을 수 없습니다."
    ]
  },
  "settings.agent.DEEP_RESEARCH": {
    "title": "Deep Research",
    "summary": "Deep Research의 토큰 예산과 타임아웃을 제어합니다.",
    "usage": "AGENT_DEEP_RESEARCH_BUDGET은 최대 토큰 예산을, AGENT_DEEP_RESEARCH_TIMEOUT은 타임아웃(초)을 설정합니다.",
    "valueNotes": [
      "예산은 계획, 후속 조사, 최종 합성을 모두 포함합니다.",
      "예산이 높을수록 더 깊은 조사가 가능하지만 비용이 증가합니다."
    ],
    "impact": [
      "Deep Research의 깊이와 소요 시간에 영향을 줍니다."
    ],
    "notes": [
      "Deep Research는 Agent 모드에서 사용할 수 있습니다."
    ]
  },
  "settings.agent.AGENT_MEMORY_ENABLED": {
    "title": "Agent 메모리",
    "summary": "시간에 따른 예측 정확도를 추적하는 메모리 및 보정 시스템을 활성화합니다.",
    "usage": "활성화하면 각 예측을 기록하고 실제 결과와 비교하여 향후 신뢰도를 보정합니다.",
    "valueNotes": [
      "보정은 충분한 예측 데이터가 누적된 후에 적용됩니다."
    ],
    "impact": [
      "Agent 신뢰도 보정과 장기 분석 품질에 영향을 줍니다."
    ],
    "notes": [
      "백테스트 기능과 함께 사용할 때 가장 효과적입니다."
    ]
  },
  "settings.agent.AGENT_SKILL_AUTOWEIGHT": {
    "title": "전략 자동 가중치",
    "summary": "충분한 샘플이 있는 실제 귀속 가능한 Skill Outcomes를 기반으로 전략에 보수적으로 가중치를 부여합니다.",
    "usage": "활성화하면 하나의 Skill, 호라이즌, 평가자 버전이 각각 독립적으로 30개의 평가된 Outcome에 도달한 후에만 베이지안 축소 성과가 신호 가중치를 조정합니다.",
    "valueNotes": [
      "Outcome 누락, 샘플 부족, 유효하지 않은 통계의 경우 중립 가중치 1.0을 유지합니다."
    ],
    "impact": [
      "다중 전략 집계의 상대 가중치에 영향을 주며, 각 성과 계수는 약 0.833~1.2 범위로 제한됩니다."
    ],
    "notes": [
      "전체 백테스트 승률은 Skill 성과를 대체하지 않으며, 평균 방향 수익률은 현재 설명용으로만 제공됩니다."
    ]
  },
  "settings.agent.AGENT_SKILL_ROUTING": {
    "title": "전략 라우팅 모드",
    "summary": "전략 선택 방식을 제어합니다.",
    "usage": "auto 모드는 시장 국면을 감지하여 관련 전략을 선택하고, manual 모드는 AGENT_SKILLS에 나열된 전략만 사용합니다.",
    "valueNotes": [
      "auto 모드는 시장 상황(강세/약세/횡보)에 따라 전략 선택을 동적으로 조정합니다."
    ],
    "impact": [
      "Agent 분석 중 전략 적용 범위에 영향을 줍니다."
    ],
    "notes": [
      "manual 모드에서는 AGENT_SKILLS가 올바르게 구성되어 있는지 확인하세요."
    ]
  },
  "settings.agent.context_compression": {
    "title": "종목 질문 컨텍스트 압축",
    "summary": "표시되는 종목 질문 채팅 이력에 대한 롤링 요약 압축을 제어합니다. 기존 동작을 유지하기 위해 기본적으로 꺼져 있습니다.",
    "usage": "AGENT_CONTEXT_COMPRESSION_ENABLED가 켜져 있으면 동일한 session_id 아래의 표시되는 사용자/어시스턴트 텍스트 이력만 압축하며, 프로필은 기본 트리거 임계값과 보호 턴 수를 제어합니다.",
    "valueNotes": [
      "cost, balanced, long_context_raw_first는 각각 토큰 절약, 균형 동작, 더 많은 원본 컨텍스트 유지를 우선합니다.",
      "AGENT_CONTEXT_COMPRESSION_TRIGGER_TOKENS와 AGENT_CONTEXT_PROTECTED_TURNS는 비워 두면 현재 프로필 프리셋을 따르고, 명시적으로 설정하면 프리셋을 재정의합니다."
    ],
    "impact": [
      "긴 종목 질문 대화에서 토큰 사용량을 줄이지만, 오래된 세부 정보는 이후 답변에 요약 형태로 반영될 수 있습니다."
    ],
    "notes": [
      "이 기능은 제공자 트레이스, 사고 블록, 도구 호출, 도구 결과를 처리하지 않으며 같은 턴의 도구 전달 방식도 변경하지 않습니다.",
      "표시되는 종목 질문 이력 압축에만 영향을 주며 LLM 제공자, 모델, Base URL, 저장 정리, 런타임 우선순위 의미는 변경하지 않습니다.",
      "이 LLM 압축은 현재 기본 모델 종목 질문에만 적용됩니다. Codex Agent는 항상 최근 사용자 표시 메시지 20개를 사용하며 요약을 위해 Agent 기본 모델을 호출하지 않습니다. 저장된 설정은 유지되며 기본 모델로 다시 전환하면 다시 적용됩니다."
    ]
  },
  "settings.agent.event_monitor": {
    "title": "이벤트 모니터",
    "summary": "예약 모드에서 주기적 규칙 폴링을 통한 백그라운드 이벤트 모니터링을 활성화합니다.",
    "usage": "AGENT_EVENT_MONITOR_ENABLED는 모니터링을 켜고, AGENT_EVENT_MONITOR_INTERVAL_MINUTES는 폴링 간격을 설정합니다.",
    "valueNotes": [
      "예약 모드에서만 적용됩니다.",
      "간격이 너무 짧으면 API 호출 빈도가 증가할 수 있습니다."
    ],
    "impact": [
      "백그라운드 알림 감지 빈도와 알림 시점에 영향을 줍니다."
    ],
    "notes": [
      "알림 규칙과 함께 사용해야 합니다."
    ]
  },
  "settings.agent.EVENT_ALERT_RULES_JSON": {
    "title": "이벤트 알림 규칙 (레거시 JSON)",
    "summary": "JSON 배열로 기본 가격 및 거래량 알림 규칙을 설정합니다.",
    "usage": "JSON 배열 형식입니다. 각 규칙에는 alert_type, stock_code, condition 필드가 있으며 price_cross, price_change_percent, volume_spike만 지원합니다.",
    "valueNotes": [
      "기술 지표, 관심종목, 포트폴리오, 시장 등락 규칙은 이 JSON이 아니라 Alert API 또는 웹 알림 센터에서 관리합니다.",
      "규칙은 스케줄 모드에서 이벤트 모니터가 주기적으로 평가합니다."
    ],
    "impact": [
      "백그라운드 알림 감지 및 알림 전송에 영향을 줍니다."
    ],
    "notes": [
      "레거시 설정 방식입니다. 고급 규칙은 알림 센터를 사용하세요."
    ]
  },
  "settings.backtest.BACKTEST_ENABLED": {
    "title": "백테스트 스위치",
    "summary": "과거 분석 백테스트를 사용하거나 사용하지 않도록 설정합니다.",
    "usage": "활성화하면 시스템이 주기적으로 과거 분석 결과와 이후 실제 가격 움직임을 비교하여 전략 정확도를 평가합니다.",
    "valueNotes": [
      "백테스트 기록은 계속해서 과거 평가와 기존 메모리 보정 경로를 지원하며, Skill 자동 가중치는 별도의 귀속 Outcome 데이터를 사용합니다.",
      "백테스트를 비활성화하면 새 평가는 중단되지만 기존 기록은 유지됩니다."
    ],
    "impact": [
      "과거 백테스트, 메모리 보정, 백테스트 보고서에 영향을 주며 Skill Outcome 가중치를 직접 제어하지는 않습니다."
    ],
    "notes": [
      "AGENT_SKILL_AUTOWEIGHT는 더 이상 전역 백테스트 승률에 의존하지 않습니다."
    ]
  },
  "settings.backtest.eval_params": {
    "title": "백테스트 평가 파라미터",
    "summary": "평가 기간, 최소 기록 경과 시간, 중립 수익률 구간을 제어합니다.",
    "usage": "BACKTEST_EVAL_WINDOW_DAYS는 거래일 단위 평가 기간을, BACKTEST_MIN_AGE_DAYS는 해당 일수보다 오래된 기록만 평가하도록, BACKTEST_NEUTRAL_BAND_PCT는 중립 수익률 구간 비율을 설정합니다.",
    "valueNotes": [
      "평가 기간이 길수록 더 많은 거래일이 포함되어 결과가 안정적이지만 지연됩니다.",
      "BACKTEST_MIN_AGE_DAYS는 충분한 후속 가격 데이터가 확보될 때까지 최근 분석 기록을 제외합니다.",
      "BACKTEST_NEUTRAL_BAND_PCT 이내의 수익률은 중립으로 표시되며 정답 또는 오답으로 판정하지 않습니다."
    ],
    "impact": [
      "백테스트 판정 기준, 적용 범위, 전략 가중치 계산에 영향을 줍니다."
    ],
    "notes": [
      "세 파라미터는 함께 백테스트 결과에 영향을 주므로 함께 조정하세요."
    ]
  },
  "settings.backtest.BACKTEST_ENGINE_VERSION": {
    "title": "백테스트 엔진 버전",
    "summary": "백테스트 엔진 버전 레이블입니다.",
    "usage": "일반적으로 변경할 필요가 없습니다. 현재 평가 로직 버전을 식별하는 레이블입니다.",
    "valueNotes": [
      "버전에 따라 평가 알고리즘이나 판정 규칙이 다를 수 있습니다."
    ],
    "impact": [
      "평가 알고리즘과 결과에 영향을 줍니다."
    ],
    "notes": [
      "버전 전환 지시가 없는 한 기본값을 유지하세요."
    ]
  },
  "settings.report.REPORT_SUMMARY_ONLY": {
    "title": "요약만 표시",
    "summary": "종목별 상세 없이 분석 요약만 전송합니다. 많은 종목을 추적할 때 빠른 개요 확인에 유용합니다.",
    "usage": "활성화하면 알림에 전체 요약 정보만 포함됩니다. 비활성화하면 종목별 상세 분석이 포함됩니다.",
    "valueNotes": [
      "많은 종목을 추적할 때 알림 길이를 줄이려면 활성화하세요."
    ],
    "impact": [
      "알림 내용의 상세 수준에 영향을 줍니다."
    ],
    "notes": [
      "WebUI의 보고서 조회에는 영향을 주지 않습니다."
    ]
  },
  "settings.report.REPORT_SHOW_LLM_MODEL": {
    "title": "보고서에 모델명 표시",
    "summary": "보고서 하단에 LLM 모델명을 표시합니다.",
    "usage": "활성화하면 알림 하단에 모델 식별자가 표시됩니다. 비활성화하면 숨겨집니다.",
    "valueNotes": [
      "모델 선택, 라우팅, 마이그레이션에는 영향을 주지 않고 보고서 렌더링에만 영향을 줍니다."
    ],
    "impact": [
      "알림 보고서의 모델 정보 노출에 영향을 줍니다."
    ],
    "notes": [
      "모델 전환 문제를 진단할 때 일시적으로 활성화하세요."
    ]
  },
  "settings.report.REPORT_TEMPLATES_DIR": {
    "title": "보고서 템플릿 디렉터리",
    "summary": "Jinja2 보고서 템플릿 디렉터리입니다.",
    "usage": "프로젝트 루트 기준 상대 경로를 입력하세요. 해당 디렉터리에 Jinja2 템플릿 파일을 배치합니다.",
    "valueNotes": [
      "템플릿이 적용되려면 REPORT_RENDERER_ENABLED도 켜져 있어야 합니다."
    ],
    "impact": [
      "보고서 렌더링에 사용되는 템플릿 소스에 영향을 줍니다."
    ],
    "notes": [
      "사용자 정의 템플릿은 Jinja2 문법을 따르고 필수 변수 플레이스홀더를 포함해야 합니다."
    ]
  },
  "settings.report.REPORT_RENDERER_ENABLED": {
    "title": "보고서 렌더링 엔진",
    "summary": "보고서 출력에 Jinja2 템플릿 렌더링 엔진을 사용합니다.",
    "usage": "기본값은 꺼짐입니다. 활성화하면 Jinja2 템플릿을 통해 보고서를 렌더링하여 형식을 사용자 정의할 수 있습니다.",
    "valueNotes": [
      "회귀 위험을 없애기 위해 기본값은 꺼짐입니다."
    ],
    "impact": [
      "최종 보고서 출력 형식에 영향을 줍니다."
    ],
    "notes": [
      "활성화하기 전에 REPORT_TEMPLATES_DIR에 유효한 템플릿 파일이 있는지 확인하세요."
    ]
  },
  "settings.report.REPORT_INTEGRITY_ENABLED": {
    "title": "보고서 무결성 검사",
    "summary": "LLM 출력 후 필수 필드를 검증하고, 누락된 필드는 재시도하거나 플레이스홀더로 대체합니다.",
    "usage": "활성화하면 보고서에 필수 분석 필드가 있는지 확인합니다. REPORT_INTEGRITY_RETRY는 재시도 횟수를 제어합니다.",
    "valueNotes": [
      "누락된 필드는 플레이스홀더로 채워집니다.",
      "재시도하면 LLM 호출 수와 지연이 증가합니다."
    ],
    "impact": [
      "보고서 완성도와 LLM 호출 수에 영향을 줍니다."
    ],
    "notes": [
      "REPORT_INTEGRITY_RETRY=0이면 재시도를 비활성화하고 플레이스홀더만 사용합니다."
    ]
  },
  "settings.report.REPORT_HISTORY_COMPARE_N": {
    "title": "과거 신호 비교",
    "summary": "종목별 최근 N회 분석 신호 비교를 표시합니다. 0으로 설정하면 비활성화됩니다.",
    "usage": "활성화하면 보고서에 최근 N회 분석 신호 비교 표가 포함됩니다.",
    "valueNotes": [
      "N이 클수록 비교 범위는 넓어지지만 표가 길어집니다."
    ],
    "impact": [
      "보고서의 과거 신호 비교 섹션에 영향을 줍니다."
    ],
    "notes": [
      "0으로 설정하면 비활성화됩니다."
    ]
  },
  "settings.report.SINGLE_STOCK_NOTIFY": {
    "title": "종목별 즉시 알림",
    "summary": "모든 결과를 모아서 보내지 않고 각 종목 분석 직후 바로 전송합니다.",
    "usage": "활성화하면 종목 분석마다 별도 알림을 보냅니다. 비활성화하면 결과를 모아서 전송합니다.",
    "valueNotes": [
      "활성화 모드는 더 신속하지만 전송 빈도가 높아집니다."
    ],
    "impact": [
      "알림 시점과 빈도에 영향을 줍니다."
    ],
    "notes": [
      "많은 종목을 추적하는 경우 활성화하면 알림이 대량으로 발생할 수 있습니다."
    ]
  },
  "settings.report.MERGE_EMAIL_NOTIFICATION": {
    "title": "이메일 알림 병합",
    "summary": "종목 분석과 시황 리뷰를 하나의 이메일로 병합합니다.",
    "usage": "활성화하면 종목 분석과 시황 리뷰가 하나의 이메일로 합쳐집니다.",
    "valueNotes": [
      "종목 분석과 시황 리뷰가 모두 활성화된 경우에만 적용됩니다."
    ],
    "impact": [
      "이메일 수와 내용 구성에 영향을 줍니다."
    ],
    "notes": [
      "비활성화하면 종목 분석과 시황 리뷰가 별도 이메일로 전송됩니다."
    ]
  },
  "settings.notification.channel_routing": {
    "title": "알림 채널 라우팅",
    "summary": "알림 유형별 대상 전송 채널을 지정합니다.",
    "usage": "세 가지 라우팅 필드가 보고서 전송, 알림 전송, 시스템 오류 전송의 대상 채널을 제어합니다. 채널 이름은 쉼표로 구분하세요. 비워 두면 설정된 모든 채널로 전송합니다.",
    "valueNotes": [
      "NOTIFICATION_REPORT_CHANNELS는 일일 분석 보고서 전달을 제어합니다.",
      "NOTIFICATION_ALERT_CHANNELS는 이벤트 알림 전달을 제어합니다.",
      "NOTIFICATION_SYSTEM_ERROR_CHANNELS는 시스템 오류 전달을 제어합니다.",
      "사용 가능한 채널은 설정된 알림 채널(예: email, feishu, telegram)에 따라 달라집니다."
    ],
    "impact": [
      "알림 유형별 전송 대상에 영향을 줍니다."
    ],
    "notes": [
      "지정한 채널이 제대로 설정되어 있어야 작동합니다."
    ]
  },
  "settings.notification.dedup": {
    "title": "알림 중복 제거 및 쿨다운",
    "summary": "정적 알림의 중복 제거 기간과 쿨다운 기간을 제어합니다.",
    "usage": "NOTIFICATION_DEDUP_TTL_SECONDS는 동일한 중복 제거 키가 한 번만 전송되는 중복 제거 기간을, NOTIFICATION_COOLDOWN_SECONDS는 동일한 쿨다운 키의 쿨다운 기간을 설정합니다.",
    "valueNotes": [
      "두 메커니즘은 독립적으로 작동합니다.",
      "둘 중 하나를 0으로 설정하면 해당 메커니즘이 비활성화됩니다."
    ],
    "impact": [
      "알림 전송 빈도와 중복 제어에 영향을 줍니다."
    ],
    "notes": [
      "동적 알림(예: 이벤트 알림)은 독립적인 트리거 및 쿨다운 로직을 사용합니다."
    ]
  },
  "settings.notification.quiet_hours": {
    "title": "방해 금지 시간",
    "summary": "지정한 시간대에는 알림 전송을 억제합니다.",
    "usage": "NOTIFICATION_QUIET_HOURS는 HH:MM-HH:MM 형식을 사용하며 자정을 넘는 범위를 지원합니다. NOTIFICATION_TIMEZONE은 시간대를 지정합니다.",
    "valueNotes": [
      "비워 두면 방해 금지 시간이 비활성화됩니다.",
      "시간대가 비어 있으면 시스템 로컬 시간대를 사용합니다."
    ],
    "impact": [
      "알림 전송 시점에 영향을 줍니다."
    ],
    "notes": [
      "방해 금지 시간 중 정적 알림은 억제되어 건너뛰며, 나중에 전송하도록 대기열에 저장되지 않습니다."
    ]
  },
  "settings.notification.MIN_SEVERITY": {
    "title": "최소 알림 심각도",
    "summary": "지정한 심각도 미만의 정적 알림을 필터링합니다.",
    "usage": "warning으로 설정하면 warning 이상만 전송됩니다. 비워 두면 현재 동작을 유지합니다.",
    "valueNotes": [
      "심각도는 낮은 순서부터 info, warning, error, critical입니다."
    ],
    "impact": [
      "정적 알림 양에 영향을 줍니다."
    ],
    "notes": [
      "동적 알림(예: 이벤트 알림)은 독립적인 이벤트 및 심각도 평가를 사용합니다."
    ]
  },
  "settings.notification.DAILY_DIGEST_ENABLED": {
    "title": "일일 다이제스트 (예약)",
    "summary": "예약된 기능 플래그입니다. 현재는 일일 다이제스트를 전송하지 않습니다.",
    "usage": "P4 예약 기능입니다. 현재 활성화해도 효과가 없습니다.",
    "valueNotes": [
      "향후 일일 다이제스트 집계 기능을 위해 유지됩니다."
    ],
    "impact": [
      "현재 영향 없음."
    ],
    "notes": [
      "향후 버전에서 당일 알림을 하나의 다이제스트로 집계하여 전송할 예정입니다."
    ]
  },
  "settings.system.LOG_LEVEL": {
    "title": "로그 레벨",
    "summary": "애플리케이션 로그의 상세 수준을 제어합니다.",
    "usage": "DEBUG, INFO, WARNING, ERROR, CRITICAL 중에서 선택하세요. 레벨이 높을수록 로그가 적게 출력됩니다.",
    "valueNotes": [
      "DEBUG는 가장 상세한 로그를 출력하며 문제 해결에 유용합니다.",
      "일부 런타임 구성 요소는 새 레벨을 완전히 적용하려면 재시작이 필요할 수 있습니다."
    ],
    "impact": [
      "로그 출력량과 상세 수준에 영향을 줍니다."
    ],
    "notes": [
      "일부 런타임 구성 요소는 완전히 적용하려면 재시작이 필요할 수 있습니다."
    ]
  },
  "settings.system.DEBUG": {
    "title": "디버그 모드",
    "summary": "상세 로그가 포함된 디버그 모드를 활성화합니다.",
    "usage": "활성화하면 더 많은 내부 상태와 디버그 정보가 출력됩니다.",
    "valueNotes": [
      "프로덕션에서는 로그량을 줄이기 위해 비활성화하세요."
    ],
    "impact": [
      "로그 상세 수준과 런타임 동작에 영향을 줍니다."
    ],
    "notes": [
      "디버그 모드는 성능에 영향을 줄 수 있으므로 장기 사용은 권장하지 않습니다."
    ]
  },
  "settings.system.MAX_WORKERS": {
    "title": "최대 워커 수",
    "summary": "동시 종목 분석 스레드 수를 제어합니다.",
    "usage": "병렬 분석 워커 수를 설정하세요. 값이 클수록 동시성이 높아지지만 API 속도 제한 위험도 커집니다.",
    "valueNotes": [
      "데이터 소스 또는 LLM API 속도 제한을 피하려면 낮게 유지하세요.",
      "API 키 할당량과 네트워크 대역폭에 의해 제한됩니다."
    ],
    "impact": [
      "전체 분석 시간과 API 호출 빈도에 영향을 줍니다."
    ],
    "notes": [
      "워커 수가 너무 많으면 API 속도 제한 오류가 발생할 수 있습니다."
    ]
  },
  "settings.system.ANALYSIS_DELAY": {
    "title": "분석 지연",
    "summary": "속도 제한을 위한 종목 분석 간 지연 시간(초)입니다.",
    "usage": "지연 없음은 0으로 설정하세요. 양수이면 각 종목 분석 후 지정한 초만큼 대기한 뒤 다음 종목을 시작합니다.",
    "valueNotes": [
      "API 속도 제한이 엄격할 때 유용합니다."
    ],
    "impact": [
      "전체 분석 시간에 영향을 줍니다."
    ],
    "notes": [
      "전체 시간 ≈ 종목 수 × 종목당 시간 + (종목 수-1) × ANALYSIS_DELAY."
    ]
  },
  "settings.system.SAVE_CONTEXT_SNAPSHOT": {
    "title": "컨텍스트 스냅샷 저장",
    "summary": "전체 분석 이력의 context_snapshot을 데이터베이스에 저장할지 제어합니다.",
    "usage": "기본적으로 활성화됩니다. 비활성화하면 새 이력 기록에 enhanced_context, market_phase_summary, AnalysisContextPack 개요, 진단 스냅샷 및 기타 context_snapshot 내용이 저장되지 않습니다.",
    "valueNotes": [
      "비활성화하면 이력 상세, 완료된 작업 상태, 웹 보고서 페이지에서 저장된 기록의 저민감도 입력 블록 요약을 읽을 수 없습니다.",
      "이 스위치는 현재 실행에 대한 AnalysisContextPack 생성은 비활성화하지 않으며 LLM Prompt에서 저민감도 팩 요약도 제거하지 않습니다.",
      "CLI --no-context-snapshot 플래그는 이 값을 false로 설정하는 것과 동일한 저장 효과를 가집니다."
    ],
    "impact": [
      "이력 투명성, 컨텍스트 스냅샷에 의존하는 진단, 웹 보고서의 데이터 소스 요약에 영향을 줍니다."
    ],
    "notes": [
      "P3-P5 팩 통합 자체를 비활성화하려면 관련 코드를 롤백해야 하며, 런타임 팩 마스터 스위치는 없습니다."
    ]
  },
  "settings.system.market_review": {
    "title": "시황 리뷰",
    "summary": "시황 리뷰 기능(켜기/끄기, 시장 하위 집합 입력, 색상 체계)을 제어합니다.",
    "usage": "MARKET_REVIEW_ENABLED는 시황 리뷰를 켜고 끕니다. DAILY_MARKET_CONTEXT_ENABLED는 기본적으로 켜져 있으며 일일 시장 요약을 종목 분석 Prompt와 보수적 가드레일에 주입할지 제어합니다. MARKET_REVIEW_REGION은 쉼표로 구분된 지역 하위 집합(예: cn,us,jp 또는 cn,us,jp,kr)을 허용하며 `both`는 지원되는 모든 시장을 유지합니다. 잘못되었거나 비어 있는 값은 `cn`으로 대체됩니다. MARKET_REVIEW_COLOR_SCHEME은 색상을 선택합니다.",
    "valueNotes": [
      "cn은 A주, hk는 홍콩, us는 미국 주식, jp는 일본, kr은 한국을 의미하며 both는 전체(cn,hk,us,jp,kr)를 의미합니다.",
      "MARKET_REVIEW_REGION은 자유 텍스트 입력이며 cn,us 또는 cn,us,jp,kr처럼 쉼표로 구분된 하위 집합을 입력할 수 있습니다.",
      "DAILY_MARKET_CONTEXT_ENABLED는 기본적으로 활성화되어 있습니다. false로 설정하면 시장 요약을 종목 분석에 주입하거나 매수/추가 매수 조언을 완화하지 않은 채 시황 리뷰 보고서를 계속 실행합니다.",
      "색상 체계는 지수 등락 표시 방식에 영향을 줍니다. green_up = 상승 시 녹색/하락 시 적색, red_up = 상승 시 적색/하락 시 녹색입니다."
    ],
    "impact": [
      "분석 보고서의 시장 개요 섹션에 영향을 줍니다."
    ],
    "notes": [
      "시황 리뷰는 선택한 시장의 지수 데이터 소스 가용성에 따라 달라집니다."
    ]
  }
};
