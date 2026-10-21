import type { UiLanguage } from '../../i18n/uiText';

export type ChannelProtocol = 'openai' | 'deepseek' | 'gemini' | 'anthropic' | 'vertex_ai' | 'ollama';
export type LLMProviderCapability =
  | 'openai-compatible'
  | 'aggregator'
  | 'official-api'
  | 'model-discovery'
  | 'vision'
  | 'local-runtime';

export const MODELFLARE_APP_REGISTRATION_URL =
  'https://modelflare.dev/sign-up?utm_source=daily_stock_analysis&utm_campaign=app';
export const MODELFLARE_DEFAULT_MODEL = 'gpt-6.1-sol';

export interface LLMProviderTemplate {
  channelId: string;
  label: string;
  protocol: ChannelProtocol;
  baseUrl: string;
  placeholderModels: string;
  capabilities: LLMProviderCapability[];
  configHint?: string;
  officialSources: Array<{
    label: string;
    url: string;
  }>;
}

export const LLM_PROVIDER_CAPABILITY_LABELS: Record<LLMProviderCapability, { label: string; hint: string }> = {
  'openai-compatible': {
    label: 'OpenAI 兼容',
    hint: '按 OpenAI-compatible endpoint 配置 Base URL，不额外拼接 /chat/completions。',
  },
  aggregator: {
    label: '聚合平台',
    hint: '模型可见性、路由和价格可能随账号权限与平台策略变化。',
  },
  'official-api': {
    label: '官方 API',
    hint: '使用服务商官方协议或官方兼容入口。',
  },
  'model-discovery': {
    label: '可获取模型',
    hint: '支持尝试通过 /models 获取模型列表；实际结果仍取决于账号权限和 API Key。',
  },
  vision: {
    label: 'Vision 提示',
    hint: '模板提示该 provider 常用于 Vision 场景；具体模型能力仍以账号和模型列表为准。',
  },
  'local-runtime': {
    label: '本地运行',
    hint: '需要当前运行环境能访问对应本地服务。',
  },
};

export const LLM_PROVIDER_TEMPLATES: LLMProviderTemplate[] = [
  {
    channelId: 'modelflare',
    label: 'Modelflare（聚合平台）',
    protocol: 'openai',
    baseUrl: 'https://modelflare.dev/v1',
    placeholderModels: MODELFLARE_DEFAULT_MODEL,
    capabilities: ['openai-compatible', 'aggregator', 'model-discovery'],
    configHint:
      'API Key 的路由分组需支持所选模型；模型 ID 请以控制台或获取模型的结果为准。modelflare 渠道的 Base URL 留空时使用默认 /v1 地址，可按需覆盖，不额外拼接 /chat/completions。',
    officialSources: [
      { label: 'Modelflare 专属注册', url: MODELFLARE_APP_REGISTRATION_URL },
      { label: 'Modelflare Docs', url: 'https://docs.modelflare.dev/' },
      { label: 'Modelflare Models & Pricing', url: 'https://modelflare.dev/pricing' },
    ],
  },
  {
    channelId: 'aihubmix',
    label: 'AIHubmix（聚合平台）',
    protocol: 'openai',
    baseUrl: 'https://aihubmix.com/v1',
    placeholderModels: 'gpt-5.5,claude-sonnet-4-6,gemini-3.1-pro-preview',
    capabilities: ['openai-compatible', 'aggregator'],
    officialSources: [{ label: 'AIHubmix', url: 'https://inferera.com/?aff=CfMq' }],
  },
  {
    channelId: 'anspire',
    label: 'Anspire Open',
    protocol: 'openai',
    baseUrl: 'https://open-gateway.anspire.cn/v6',
    placeholderModels: 'Doubao-Seed-2.0-lite,Doubao-Seed-2.0-pro,qwen3.5-flash,MiniMax-M2.7',
    capabilities: ['openai-compatible'],
    configHint:
      '同一 ANSPIRE_API_KEYS 可复用到搜索与 LLM 渠道。以下模型与网关为配置示例，实际可用性请以账号权限和控制台为准；建议先点“测试连接”确认。',
    officialSources: [
      { label: 'Anspire Open', url: 'https://open.anspire.cn/dsa?share_code=QFBC0FYC' },
      {
        label: 'LiteLLM OpenAI-compatible',
        url: 'https://docs.litellm.ai/docs/providers/openai_compatible',
      },
    ],
  },
  {
    channelId: 'deepseek',
    label: 'DeepSeek 官方',
    protocol: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    placeholderModels: 'deepseek-v4-flash,deepseek-v4-pro',
    capabilities: ['official-api', 'openai-compatible'],
    officialSources: [{ label: 'DeepSeek API Docs', url: 'https://api-docs.deepseek.com/' }],
  },
  {
    channelId: 'dashscope',
    label: '通义千问（Dashscope）',
    protocol: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    placeholderModels: 'qwen3.6-plus,qwen3.6-flash',
    capabilities: ['openai-compatible', 'model-discovery'],
    officialSources: [
      { label: 'DashScope Text Generation', url: 'https://help.aliyun.com/zh/model-studio/text-generation-model/' },
    ],
  },
  {
    channelId: 'zhipu',
    label: '智谱 GLM',
    protocol: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    placeholderModels: 'glm-5.1,glm-4.7-flash',
    capabilities: ['openai-compatible'],
    officialSources: [{ label: 'Zhipu Model Overview', url: 'https://docs.bigmodel.cn/cn/guide/start/model-overview' }],
  },
  {
    channelId: 'moonshot',
    label: 'Moonshot（月之暗面）',
    protocol: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    placeholderModels: 'kimi-k2.6,kimi-k2.5',
    capabilities: ['openai-compatible'],
    officialSources: [{ label: 'Kimi Platform Docs', url: 'https://platform.kimi.com/docs/models' }],
  },
  {
    channelId: 'minimax',
    label: 'MiniMax 官方',
    protocol: 'openai',
    baseUrl: 'https://api.minimax.io/v1',
    placeholderModels: 'MiniMax-M3,MiniMax-M2.7,MiniMax-M2.7-highspeed',
    capabilities: ['openai-compatible'],
    officialSources: [
      { label: 'MiniMax OpenAI API', url: 'https://platform.minimax.io/docs/api-reference/text-chat' },
      { label: 'MiniMax Models', url: 'https://platform.minimax.io/docs/api-reference/models/openai/list-models' },
    ],
  },
  {
    channelId: 'volcengine',
    label: '火山方舟（豆包）',
    protocol: 'openai',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    placeholderModels: 'doubao-seed-1-6-251015,doubao-seed-1-6-thinking-251015',
    capabilities: ['openai-compatible'],
    configHint: '确认在线推理 endpoint / region 与 Coding Plan 专用入口不要混用。',
    officialSources: [
      { label: 'Volcengine Ark Inference', url: 'https://www.volcengine.com/docs/82379/2121998' },
      { label: 'Volcengine Ark Models', url: 'https://www.volcengine.com/docs/82379/1949118' },
    ],
  },
  {
    channelId: 'siliconflow',
    label: '硅基流动（SiliconFlow）',
    protocol: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    placeholderModels: 'deepseek-ai/DeepSeek-V3.2,Qwen/Qwen3-235B-A22B-Thinking-2507',
    capabilities: ['openai-compatible', 'model-discovery'],
    configHint: '模型列表和模型可见性依赖账号权限与 API Key。',
    officialSources: [{ label: 'SiliconFlow Models', url: 'https://docs.siliconflow.cn/quickstart/models' }],
  },
  {
    channelId: 'openrouter',
    label: 'OpenRouter',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    placeholderModels: '~anthropic/claude-sonnet-latest,~openai/gpt-latest',
    capabilities: ['openai-compatible', 'aggregator', 'model-discovery'],
    configHint: '模型列表和模型可见性依赖账号权限与 API Key。',
    officialSources: [
      { label: 'OpenRouter Models API', url: 'https://openrouter.ai/docs/api/api-reference/models/get-models' },
    ],
  },
  {
    channelId: 'requesty',
    label: 'Requesty',
    protocol: 'openai',
    baseUrl: 'https://router.requesty.ai/v1',
    placeholderModels: 'claude-sonnet-4-6,gpt-5.4',
    capabilities: ['openai-compatible', 'aggregator', 'model-discovery'],
    configHint: '模型列表和模型可见性依赖账号权限与 API Key；EU 区域可将 Base URL 改为 https://router.eu.requesty.ai/v1。',
    officialSources: [
      { label: 'Requesty Models API', url: 'https://docs.requesty.ai/api-reference/endpoint/models-list' },
    ],
  },
  {
    channelId: 'gemini',
    label: 'Gemini 官方',
    protocol: 'gemini',
    baseUrl: '',
    placeholderModels: 'gemini-3.1-pro-preview,gemini-3-flash-preview',
    capabilities: ['official-api', 'vision'],
    officialSources: [{ label: 'Gemini Models', url: 'https://ai.google.dev/gemini-api/docs/models' }],
  },
  {
    channelId: 'anthropic',
    label: 'Anthropic 官方',
    protocol: 'anthropic',
    baseUrl: '',
    placeholderModels: 'claude-sonnet-4-6,claude-opus-4-7',
    capabilities: ['official-api'],
    officialSources: [
      { label: 'Anthropic Models', url: 'https://docs.anthropic.com/en/docs/about-claude/models/all-models' },
    ],
  },
  {
    channelId: 'openai',
    label: 'OpenAI 官方',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    placeholderModels: 'gpt-5.5,gpt-5.4-mini',
    capabilities: ['official-api', 'openai-compatible', 'model-discovery'],
    officialSources: [{ label: 'OpenAI Models', url: 'https://platform.openai.com/docs/models' }],
  },
  {
    channelId: 'ollama',
    label: 'Ollama（本地）',
    protocol: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    placeholderModels: 'llama3.2,qwen2.5',
    capabilities: ['local-runtime'],
    configHint: '需要本机、Docker 或 self-hosted runner 能访问 Ollama 服务。',
    officialSources: [{ label: 'Ollama API', url: 'https://github.com/ollama/ollama/blob/main/docs/api.md' }],
  },
  {
    channelId: 'custom',
    label: '自定义渠道',
    protocol: 'openai',
    baseUrl: '',
    placeholderModels: 'model-name-1,model-name-2',
    capabilities: [],
    officialSources: [],
  },
];

export const LLM_PROVIDER_TEMPLATE_BY_ID: Record<string, LLMProviderTemplate> = Object.fromEntries(
  LLM_PROVIDER_TEMPLATES.map((template) => [template.channelId, template]),
);

export function getProviderTemplate(channelId: string): LLMProviderTemplate | undefined {
  if (!Object.prototype.hasOwnProperty.call(LLM_PROVIDER_TEMPLATE_BY_ID, channelId)) {
    return undefined;
  }
  return LLM_PROVIDER_TEMPLATE_BY_ID[channelId];
}

export function isKnownProviderTemplate(channelId: string): boolean {
  return channelId !== 'custom' && Boolean(getProviderTemplate(channelId));
}

export const MODEL_PLACEHOLDERS_BY_PROTOCOL: Record<ChannelProtocol, string> = {
  openai: 'gpt-5.5,qwen3.6-plus',
  deepseek: 'deepseek-v4-flash,deepseek-v4-pro',
  gemini: 'gemini-3.1-pro-preview,gemini-3-flash-preview',
  anthropic: 'claude-sonnet-4-6,claude-opus-4-7',
  vertex_ai: 'gemini-3.1-pro-preview',
  ollama: 'llama3.2,qwen2.5',
};

type LocalizedProviderPresentation = {
  labels: Record<string, string>;
  configHints: Record<string, string>;
  sourceLabels: Record<string, string>;
  capabilities: Record<LLMProviderCapability, { label: string; hint: string }>;
};

const PROVIDER_PRESENTATION: Record<Exclude<UiLanguage, 'zh'>, LocalizedProviderPresentation> = {
  en: {
    labels: {
      modelflare: 'Modelflare (aggregator)',
      aihubmix: 'AIHubmix (aggregator)',
      anspire: 'Anspire Open',
      deepseek: 'DeepSeek official',
      dashscope: 'Qwen (DashScope)',
      zhipu: 'Zhipu GLM',
      moonshot: 'Moonshot (Kimi)',
      minimax: 'MiniMax official',
      volcengine: 'Volcengine Ark (Doubao)',
      siliconflow: 'SiliconFlow',
      openrouter: 'OpenRouter',
      requesty: 'Requesty',
      gemini: 'Gemini official',
      anthropic: 'Anthropic official',
      openai: 'OpenAI official',
      ollama: 'Ollama (local)',
      custom: 'Custom channel',
    },
    configHints: {
      modelflare:
        'The API key routing group must support the selected models; use the console or discovered models as the source of truth for model IDs. When the modelflare Base URL is empty, the default /v1 address is used. You can override it as needed; /chat/completions is not appended.',
      anspire:
        'The same ANSPIRE_API_KEYS can be reused for search and LLM channels. The models and gateway below are configuration examples; actual availability depends on account permissions and the console. Click "Test connection" first.',
      volcengine:
        'Make sure the online inference endpoint/region is not mixed with the Coding Plan dedicated endpoint.',
      siliconflow: 'Model list and model visibility depend on account permissions and the API key.',
      openrouter: 'Model list and model visibility depend on account permissions and the API key.',
      requesty:
        'Model list and model visibility depend on account permissions and the API key; for the EU region, change the Base URL to https://router.eu.requesty.ai/v1.',
      ollama: 'The host, Docker container, or self-hosted runner must be able to reach the Ollama service.',
    },
    sourceLabels: {
      'Modelflare 专属注册': 'Modelflare sign-up',
    },
    capabilities: {
      'openai-compatible': {
        label: 'OpenAI compatible',
        hint: 'Configure the Base URL as an OpenAI-compatible endpoint; /chat/completions is not appended.',
      },
      aggregator: {
        label: 'Aggregator',
        hint: 'Model visibility, routing, and pricing may vary with account permissions and platform policy.',
      },
      'official-api': {
        label: 'Official API',
        hint: "Uses the provider's official protocol or official compatible endpoint.",
      },
      'model-discovery': {
        label: 'Model discovery',
        hint: 'Can try to fetch the model list via /models; actual results still depend on account permissions and the API key.',
      },
      vision: {
        label: 'Vision hint',
        hint: 'The template indicates this provider is often used for vision; actual model capabilities depend on the account and model list.',
      },
      'local-runtime': {
        label: 'Local runtime',
        hint: 'The current runtime must be able to access the local service.',
      },
    },
  },
  ko: {
    labels: {
      modelflare: 'Modelflare(애그리게이터)',
      aihubmix: 'AIHubmix(애그리게이터)',
      anspire: 'Anspire Open',
      deepseek: 'DeepSeek 공식',
      dashscope: 'Qwen(DashScope)',
      zhipu: 'Zhipu GLM',
      moonshot: 'Moonshot(Kimi)',
      minimax: 'MiniMax 공식',
      volcengine: 'Volcengine Ark(Doubao)',
      siliconflow: 'SiliconFlow',
      openrouter: 'OpenRouter',
      requesty: 'Requesty',
      gemini: 'Gemini 공식',
      anthropic: 'Anthropic 공식',
      openai: 'OpenAI 공식',
      ollama: 'Ollama(로컬)',
      custom: '사용자 지정 채널',
    },
    configHints: {
      modelflare:
        'API Key의 라우팅 그룹이 선택한 모델을 지원해야 합니다. 모델 ID는 콘솔 또는 모델 검색 결과를 기준으로 하세요. modelflare 채널의 Base URL을 비워 두면 기본 /v1 주소를 사용하며, 필요에 따라 재정의할 수 있습니다. /chat/completions는 추가로 붙지 않습니다.',
      anspire:
        '동일한 ANSPIRE_API_KEYS를 검색과 LLM 채널에 함께 사용할 수 있습니다. 아래 모델과 게이트웨이는 구성 예시이며 실제 사용 가능 여부는 계정 권한과 콘솔을 기준으로 합니다. 먼저 “연결 테스트”를 눌러 확인하세요.',
      volcengine: '온라인 추론 endpoint/region과 Coding Plan 전용 엔드포인트를 혼용하지 마세요.',
      siliconflow: '모델 목록과 모델 가시성은 계정 권한과 API Key에 따라 달라집니다.',
      openrouter: '모델 목록과 모델 가시성은 계정 권한과 API Key에 따라 달라집니다.',
      requesty:
        '모델 목록과 모델 가시성은 계정 권한과 API Key에 따라 달라집니다. EU 리전에서는 Base URL을 https://router.eu.requesty.ai/v1로 변경할 수 있습니다.',
      ollama: '호스트, Docker 또는 self-hosted runner에서 Ollama 서비스에 접근할 수 있어야 합니다.',
    },
    sourceLabels: {
      'Modelflare 专属注册': 'Modelflare 전용 가입',
    },
    capabilities: {
      'openai-compatible': {
        label: 'OpenAI 호환',
        hint: 'OpenAI-compatible endpoint 기준으로 Base URL을 구성하며 /chat/completions를 추가로 붙이지 않습니다.',
      },
      aggregator: {
        label: '애그리게이터',
        hint: '모델 가시성, 라우팅, 가격은 계정 권한과 플랫폼 정책에 따라 달라질 수 있습니다.',
      },
      'official-api': {
        label: '공식 API',
        hint: '제공업체의 공식 프로토콜 또는 공식 호환 엔드포인트를 사용합니다.',
      },
      'model-discovery': {
        label: '모델 검색 가능',
        hint: '/models를 통해 모델 목록을 가져올 수 있으며 실제 결과는 계정 권한과 API Key에 따라 달라집니다.',
      },
      vision: {
        label: 'Vision 힌트',
        hint: '이 provider가 Vision 시나리오에 자주 사용됨을 나타내는 템플릿 힌트이며 실제 모델 능력은 계정과 모델 목록을 기준으로 합니다.',
      },
      'local-runtime': {
        label: '로컬 실행',
        hint: '현재 실행 환경에서 해당 로컬 서비스에 접근할 수 있어야 합니다.',
      },
    },
  },
};

export function getProviderTemplateLabel(template: LLMProviderTemplate, locale: UiLanguage = 'zh'): string {
  if (locale === 'zh') {
    return template.label;
  }
  return PROVIDER_PRESENTATION[locale].labels[template.channelId] ?? template.label;
}

export function getProviderTemplateConfigHint(
  template: LLMProviderTemplate,
  locale: UiLanguage = 'zh',
): string | undefined {
  if (!template.configHint || locale === 'zh') {
    return template.configHint;
  }
  return PROVIDER_PRESENTATION[locale].configHints[template.channelId] ?? template.configHint;
}

export function getProviderSourceLabel(
  source: LLMProviderTemplate['officialSources'][number],
  locale: UiLanguage = 'zh',
): string {
  if (locale === 'zh') {
    return source.label;
  }
  return PROVIDER_PRESENTATION[locale].sourceLabels[source.label] ?? source.label;
}

export function getProviderCapabilityMeta(
  capability: LLMProviderCapability,
  locale: UiLanguage = 'zh',
): { label: string; hint: string } {
  if (locale === 'zh') {
    return LLM_PROVIDER_CAPABILITY_LABELS[capability];
  }
  return PROVIDER_PRESENTATION[locale].capabilities[capability];
}
