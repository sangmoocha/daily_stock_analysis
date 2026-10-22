import type { UiLanguage } from './uiText';

export type LocalizedSkillText = {
  name: string;
  description: string;
};

type TranslatedSkillText = Record<'en' | 'ko', LocalizedSkillText>;

/**
 * Built-in strategy skills ship Chinese display names from the backend
 * (`strategies/*.yaml`). Chinese UIs can use those values as-is, while English
 * and Korean UIs need a client-side translation keyed by the stable skill id.
 * Custom skills that are not listed here fall back to the backend text.
 */
const CHAT_SKILL_TEXT: Record<string, TranslatedSkillText> = {
  bull_trend: {
    en: {
      name: 'Default bull trend',
      description: 'Default priority strategy for stock analysis, identifying bullish alignment, trend continuation, and pullback entries.',
    },
    ko: {
      name: '기본 상승 추세',
      description: '기본 종목 분석 우선 전략으로 상승 배열, 추세 지속, 눌림목 매수 기회를 식별합니다.',
    },
  },
  ma_golden_cross: {
    en: {
      name: 'MA golden cross',
      description: 'Detects moving-average golden crosses confirmed by volume. A classic trend reversal or continuation signal.',
    },
    ko: {
      name: '이동평균 골든크로스',
      description: '거래량 확인을 동반한 이동평균 골든크로스 신호를 감지합니다. 고전적인 추세 반전 또는 지속 신호입니다.',
    },
  },
  volume_breakout: {
    en: {
      name: 'Volume breakout',
      description: 'Detects volume-backed breakouts above resistance. Suitable when price approaches a known resistance level.',
    },
    ko: {
      name: '거래량 돌파',
      description: '저항선을 거래량과 함께 돌파하는 신호를 감지합니다. 주가가 알려진 저항선에 근접할 때 적합합니다.',
    },
  },
  hot_theme: {
    en: {
      name: 'Hot theme',
      description: 'Tracks policy, industry, and market hotspots to gauge theme strength, sector diffusion, and relative strength.',
    },
    ko: {
      name: '핫 테마',
      description: '정책, 산업, 시장 핫스팟을 추적해 테마 강도, 섹터 확산, 종목 상대 강도를 판단합니다.',
    },
  },
  shrink_pullback: {
    en: {
      name: 'Shrinking-volume pullback',
      description: 'Detects shrinking-volume pullbacks to moving-average support. An ideal entry for a continuing trend.',
    },
    ko: {
      name: '거래량 감소 눌림목',
      description: '이동평균 지지를 확인하는 거래량 감소 눌림목 신호를 감지합니다. 추세 지속 시 이상적인 진입점입니다.',
    },
  },
  event_driven: {
    en: {
      name: 'Event driven',
      description: 'Evaluates catalyst strength, realization odds, and risk boundaries around earnings, policy, M&A, orders, and launches.',
    },
    ko: {
      name: '이벤트 드리븐',
      description: '실적, 정책, 인수합병, 수주, 제품 출시 등의 이벤트를 중심으로 촉매 강도, 실현 가능성, 리스크 경계를 평가합니다.',
    },
  },
  box_oscillation: {
    en: {
      name: 'Box oscillation',
      description: 'Identifies price ranges and buys near the box bottom while trimming near the top. Suited to sideways markets.',
    },
    ko: {
      name: '박스권 횡보',
      description: '가격 박스권을 식별해 박스 하단에서 매수하고 상단에서 비중을 줄입니다. 횡보장에 적합합니다.',
    },
  },
  growth_quality: {
    en: {
      name: 'Growth quality',
      description: 'Combines revenue and profit growth, ROE, cash flow, and industry runway to find quality growth and stall risk.',
    },
    ko: {
      name: '성장 품질',
      description: '매출·이익 성장, ROE, 현금흐름, 산업 성장 공간을 결합해 고품질 성장주와 성장 둔화 리스크를 식별합니다.',
    },
  },
  bottom_volume: {
    en: {
      name: 'Bottom volume surge',
      description: 'Detects volume surges at the bottom after a prolonged decline. A potential trend-reversal signal.',
    },
    ko: {
      name: '바닥 거래량 급증',
      description: '장기 하락 후 바닥에서의 거래량 급증 신호를 감지합니다. 잠재적 추세 반전 신호입니다.',
    },
  },
  expectation_repricing: {
    en: {
      name: 'Expectation repricing',
      description: 'Analyzes shifts in earnings, policy, and valuation expectations to find expectation gaps or overheating risk.',
    },
    ko: {
      name: '기대 재평가',
      description: '실적, 정책, 밸류에이션 기대치의 변화를 분석해 기대 격차 회복 또는 과열 후 조정 리스크를 찾습니다.',
    },
  },
  chan_theory: {
    en: {
      name: 'Chan Theory',
      description: 'Uses Chan Theory strokes, segments, and pivots to judge trend level, entry points, and divergence signals.',
    },
    ko: {
      name: '찬룬 이론',
      description: '찬룬 이론의 필, 선분, 중추 구조를 기반으로 추세 수준, 매매점, 배치 신호를 판단합니다.',
    },
  },
  wave_theory: {
    en: {
      name: 'Wave Theory',
      description: 'Uses Elliott Wave impulse and corrective structures to judge the current wave position and potential targets.',
    },
    ko: {
      name: '파동 이론',
      description: '엘리엇 파동 이론의 추진파와 조정파 구조를 기반으로 현재 파동 위치와 잠재 목표가를 판단합니다.',
    },
  },
  dragon_head: {
    en: {
      name: 'Sector leader',
      description: 'Identifies sector leaders during rotation. Suited to sector launches or industry catalysts.',
    },
    ko: {
      name: '주도주 전략',
      description: '섹터 로테이션에서 주도주를 식별합니다. 섹터가 출발하거나 업종 촉매가 나타날 때 적합합니다.',
    },
  },
  emotion_cycle: {
    en: {
      name: 'Sentiment cycle',
      description: 'Uses market sentiment, turnover, and price-volume structure to find sentiment lows and highs for contrarian positioning.',
    },
    ko: {
      name: '감정 사이클',
      description: '시장 심리, 회전율, 가격·거래량 구조를 기반으로 심리 저점과 고점을 식별해 역발상으로 접근합니다.',
    },
  },
  one_yang_three_yin: {
    en: {
      name: 'One yang, three yin',
      description: 'Detects the one-bullish-three-bearish candle consolidation pattern. A trend-continuation entry signal.',
    },
    ko: {
      name: '양봉 하나, 음봉 셋',
      description: '양봉 하나와 음봉 셋으로 구성된 캔들 정리 패턴을 감지합니다. 추세 지속 진입 신호입니다.',
    },
  },
};

export function localizeChatSkill(
  skill: { id: string; name: string; description: string },
  language: UiLanguage,
): LocalizedSkillText {
  const fallback = { name: skill.name, description: skill.description };
  if (language === 'zh') {
    return fallback;
  }
  return CHAT_SKILL_TEXT[skill.id]?.[language] ?? fallback;
}
