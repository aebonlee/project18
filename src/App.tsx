import { useMemo, useState } from 'react';
import { AppLayout, Chip, useLocalStorage, type Meta } from './ui';
import { ask, hasKey } from './lib/ai';

/* ──────────────────────────────────────────────────────────────────────────
 * 뉴스로 배우는 핵심 용어·어휘 학습
 * 분야·난이도 선택 → 엄선된 용어 카드 학습(나만의 사전) → 4지선다 퀴즈로 복습.
 * ────────────────────────────────────────────────────────────────────────── */
const M: Meta = {
  id: 18, icon: '📰', title: '뉴스로 배우는 핵심 용어', tagline: '관심 분야의 뉴스 핵심 용어·어휘를 매일 익히고, 퀴즈로 복습해 나만의 용어사전을 만드는 서비스',
  members: ['모집 중'], color: '#3b82f6', ai: true, note: '학생 제안',
  problem:
    '뉴스를 읽어도 핵심 용어를 모르면 맥락이 안 잡힙니다. 한국어 문해력·영어·IT·경제 등 분야마다 꼭 필요한 용어를 ' +
    '매일 조금씩, 예문과 함께 익히고 퀴즈로 복습하면 문해력이 쌓입니다. 이 앱은 분야·난이도별로 엄선된 용어를 카드로 학습하고 ' +
    '내가 익힌 용어를 모아 나만의 사전을 만들도록 돕습니다.',
  features: [
    { icon: '🗂️', title: '분야별 용어', desc: '문해력·영어·IT·경제 등 분야와 난이도를 골라 핵심 용어 학습' },
    { icon: '📇', title: '용어 카드', desc: '뜻 + 뉴스 예문 + 한 줄 해설로 맥락까지 이해' },
    { icon: '✅', title: '나만의 사전', desc: '익힌 용어를 체크하면 브라우저에 저장돼 진도가 남음' },
    { icon: '🧩', title: '4지선다 퀴즈', desc: '학습한 용어로 즉석 퀴즈를 풀고 점수로 복습' },
    { icon: '🤖', title: 'AI 예문 생성', desc: '(선택) 고른 용어로 새 뉴스 문맥 예문을 만들어 줌' },
  ],
  howto: [
    '관심 분야를 선택합니다',
    '용어 카드를 넘기며 뜻·예문을 익히고 "익힘"을 체크하세요',
    '퀴즈 탭에서 4지선다로 복습하고 점수를 확인합니다',
  ],
  facts: [
    { value: '4분야', label: '문해력·영어·IT·경제' },
    { value: '예문', label: '뉴스 맥락 제공' },
    { value: '퀴즈', label: '즉석 4지선다' },
    { value: '저장', label: '나만의 사전' },
  ],
  info: [
    { title: '왜 용어부터인가', body: '문장의 의미는 핵심어가 좌우합니다. 모르는 용어 1~2개가 전체 문단의 이해를 막습니다. 용어를 먼저 잡으면 같은 기사도 더 빠르고 정확히 읽힙니다.' },
    { title: '간격 반복(spaced)', body: '한 번에 외우기보다 매일 조금씩, 퀴즈로 반복하는 편이 장기 기억에 유리합니다. 익힌 용어 체크는 약한 용어부터 복습하는 기준이 됩니다.' },
  ],
  targets: ['뉴스를 깊이 읽고 싶은 사람', '분야별 용어가 약한 학습자', '매일 어휘를 쌓고 싶은 사람'],
  goals: [
    '분야별 핵심 용어를 예문과 함께 학습한다',
    '퀴즈로 복습해 나만의 사전을 구성한다',
    'API 키가 없어도 카드·퀴즈가 동작하게 한다',
  ],
  scenarios: [
    '관심 분야를 고른다',
    '용어 카드를 넘기며 익히고 "익힘"을 체크한다',
    '퀴즈 탭에서 4지선다로 복습한다',
  ],
  screens: [
    { name: '분야 선택', desc: '문해력·영어·IT·경제 분야 + 익힘 진도' },
    { name: '용어 카드', desc: '뜻 + 뉴스 예문 + 익힘 표시 + AI 예문 생성' },
    { name: '퀴즈', desc: '용어 뜻 4지선다 + 점수' },
  ],
  pipelineDetail: [
    { step: '용어 선택', detail: '분야를 고르면 내장 용어 은행에서 카드를 구성한다.' },
    { step: '학습 · 진도', detail: '카드의 뜻·예문을 익히고 "익힘"을 localStorage(nv_learned)에 저장한다.' },
    { step: '퀴즈 생성', detail: '같은 분야 용어로 정답+오답 보기를 섞어 4지선다를 만든다.' },
    { step: 'AI 예문(선택)', detail: '키가 있으면 고른 용어로 새 뉴스 예문·쉬운 풀이를 생성한다.' },
  ],
  promptNotes: [
    '고른 용어와 뜻을 담아 실제 뉴스에 나올 법한 예문 2개와 초보자용 쉬운 풀이를 생성하도록 system 프롬프트로 지시한다.',
    '용어 카드·퀴즈는 내장 용어 은행으로 키 없이도 완전히 동작한다.',
  ],
  architecture:
    '백엔드 없는 React SPA. 공통 레이아웃·5탭은 src/ui.tsx, 학습 기능은 src/App.tsx가 담당한다. ' +
    '용어 카드·퀴즈는 내장 데이터로 동작하고, AI 예문은 src/lib/ai.ts(선택)로 생성하며, 익힘 진도는 브라우저 localStorage에 저장한다.',
  structure: [
    { path: 'src/App.tsx', desc: '분야별 용어 카드·퀴즈·AI 예문 + 메타(M)' },
    { path: 'src/ui.tsx', desc: '공통 레이아웃·5탭·UI 헬퍼' },
    { path: 'src/lib/ai.ts', desc: 'OpenAI chat 헬퍼(선택 예문 생성)' },
    { path: 'src/index.css', desc: '테마·카드/퀴즈 스타일' },
  ],
  dataModel: [
    { name: 'Term', desc: '용어·뜻·뉴스 예문' },
    { name: '진도', desc: 'localStorage "nv_field"(분야)·"nv_learned"(익힘)' },
  ],
  deploy:
    'Vite 빌드(base: "./") 후 GitHub Actions(deploy.yml)가 main push 시 GitHub Pages로 자동 배포 → aebonlee.github.io/project18/',
  stack: ['React 18', 'TypeScript', 'Vite', 'localStorage', 'OpenAI(선택)'],
};

type F = '문해력' | '영어' | 'IT' | '경제';
const FIELDS: F[] = ['문해력', '영어', 'IT', '경제'];
interface Term { term: string; meaning: string; example: string; }
const BANK: Record<F, Term[]> = {
  '문해력': [
    { term: '함의(含意)', meaning: '말이나 글 속에 담긴 속뜻', example: '그 발언의 함의를 두고 해석이 엇갈렸다.' },
    { term: '귀납', meaning: '개별 사례에서 일반 원리를 끌어내는 추론', example: '여러 사례를 모아 귀납적으로 결론을 내렸다.' },
    { term: '상충(相衝)', meaning: '서로 맞지 않고 어긋남', example: '두 정책의 목표가 상충한다는 지적이 나왔다.' },
    { term: '방증(傍證)', meaning: '간접적으로 증명에 도움을 주는 증거', example: '높은 참여율이 정책 효과의 방증이다.' },
  ],
  '영어': [
    { term: 'leverage', meaning: '(자원·강점을) 적극 활용하다', example: 'The startup leveraged AI to cut costs.' },
    { term: 'mitigate', meaning: '(위험·피해를) 완화하다', example: 'New rules aim to mitigate climate risks.' },
    { term: 'unprecedented', meaning: '전례 없는', example: 'The market saw unprecedented growth.' },
    { term: 'tentative', meaning: '잠정적인, 확정되지 않은', example: 'They reached a tentative agreement.' },
  ],
  'IT': [
    { term: 'LLM', meaning: '대규모 언어 모델(거대 텍스트로 학습한 AI)', example: 'LLM 기반 챗봇이 상담 업무를 대체하고 있다.' },
    { term: '온프레미스', meaning: '서버를 자체 전산실에 두고 운영하는 방식', example: '보안 때문에 온프레미스 배포를 택했다.' },
    { term: 'API', meaning: '프로그램끼리 기능을 주고받는 약속·창구', example: '결제 API를 연동해 기능을 붙였다.' },
    { term: '레이턴시', meaning: '요청부터 응답까지 걸리는 지연 시간', example: '레이턴시를 줄여 응답이 빨라졌다.' },
  ],
  '경제': [
    { term: '기준금리', meaning: '중앙은행이 정하는 정책 금리의 기준', example: '한은이 기준금리를 동결했다.' },
    { term: '인플레이션', meaning: '물가가 지속적으로 오르는 현상', example: '인플레이션 압력에 소비가 위축됐다.' },
    { term: '유동성', meaning: '자산을 현금으로 바꿀 수 있는 정도', example: '시장에 유동성이 풍부해졌다.' },
    { term: '디커플링', meaning: '함께 움직이던 지표가 따로 노는 현상', example: '주가와 경기의 디커플링이 나타났다.' },
  ],
};

const App = () => {
  const [field, setField] = useLocalStorage<F>('nv_field', '문해력');
  const [learned, setLearned] = useLocalStorage<Record<string, boolean>>('nv_learned', {});
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');
  const [aiText, setAiText] = useState(''); const [aiBusy, setAiBusy] = useState(false);

  const terms = BANK[field];
  const cur = terms[idx % terms.length];
  const learnedCount = terms.filter((t) => learned[`${field}:${t.term}`]).length;

  const [qi, setQi] = useState(0); const [score, setScore] = useState(0); const [picked, setPicked] = useState<number | null>(null);
  const quiz = useMemo(() => {
    const q = terms[qi % terms.length];
    const others = terms.filter((t) => t.term !== q.term).map((t) => t.meaning);
    const opts = [{ m: q.meaning, correct: true }, ...others.slice(0, 3).map((m) => ({ m, correct: false }))]
      .sort((a, b) => a.m.localeCompare(b.m));
    return { q, opts };
  }, [terms, qi]);

  const runAI = async () => {
    setAiBusy(true); setAiText('');
    try {
      const out = await ask(
        '너는 한국어 어휘 교육 도우미다. 주어진 용어로 실제 뉴스에 나올 법한 자연스러운 한국어 예문 2개와, 초보자용 한 줄 쉬운 풀이를 제시하라. 4줄 이내.',
        `용어: ${cur.term} (뜻: ${cur.meaning})`, { temperature: 0.7, max_tokens: 300 });
      setAiText(out);
    } catch { setAiText('AI 예문을 쓰려면 위에서 OpenAI 키를 입력하세요. (키 없이도 카드·퀴즈는 모두 동작합니다.)'); }
    finally { setAiBusy(false); }
  };

  const feature = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card">
        <div className="seclabel" style={{ color: M.color }}>🗂️ 분야 선택</div>
        <div className="chips" style={{ marginTop: 10 }}>
          {FIELDS.map((f) => <Chip key={f} active={field === f} color={M.color} onClick={() => { setField(f); setIdx(0); setQi(0); setScore(0); setPicked(null); }}>{f}</Chip>)}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--faint)', margin: '10px 0 0' }}>익힘 {learnedCount}/{terms.length}</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8 }}>
          <Chip active={mode === 'learn'} color={M.color} onClick={() => setMode('learn')}>📇 용어 카드</Chip>
          <Chip active={mode === 'quiz'} color={M.color} onClick={() => setMode('quiz')}>🧩 퀴즈</Chip>
        </div>

        {mode === 'learn' ? (
          <div style={{ marginTop: 16 }}>
            <div className="box" style={{ borderLeft: `4px solid ${M.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 20 }}>{cur.term}</strong>
                <span style={{ fontSize: 12, color: 'var(--faint)' }}>{(idx % terms.length) + 1}/{terms.length}</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 15 }}>{cur.meaning}</p>
              <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--sub)', fontStyle: 'italic' }}>📰 {cur.example}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => setIdx((i) => (i - 1 + terms.length) % terms.length)}>← 이전</button>
              <button className="btn" style={{ background: learned[`${field}:${cur.term}`] ? '#16a34a' : M.color }}
                onClick={() => setLearned({ ...learned, [`${field}:${cur.term}`]: !learned[`${field}:${cur.term}`] })}>
                {learned[`${field}:${cur.term}`] ? '✓ 익힘' : '익힘 표시'}
              </button>
              <button className="btn btn-ghost" onClick={() => setIdx((i) => (i + 1) % terms.length)}>다음 →</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: M.color }}>🤖 AI 예문</span>
              <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }} disabled={aiBusy} onClick={runAI}>{aiBusy ? '생성 중…' : hasKey() ? '예문 생성' : '키 입력 후 사용'}</button>
            </div>
            {aiText && <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8, marginTop: 10 }}>{aiText}</p>}
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--faint)', margin: '0 0 6px' }}>점수 {score} · 문항 {(qi % terms.length) + 1}/{terms.length}</p>
            <strong style={{ fontSize: 17 }}>"{quiz.q.term}" 의 뜻은?</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {quiz.opts.map((o, i) => {
                const show = picked !== null;
                const bg = show ? (o.correct ? '#dcfce7' : i === picked ? '#fee2e2' : 'var(--card)') : 'var(--card)';
                return (
                  <button key={i} className="box" style={{ textAlign: 'left', cursor: 'pointer', background: bg, fontSize: 14 }}
                    disabled={show} onClick={() => { setPicked(i); if (o.correct) setScore((s) => s + 1); }}>
                    {o.m}{show && o.correct ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <button className="btn" style={{ background: M.color, marginTop: 12 }} onClick={() => { setQi((q) => q + 1); setPicked(null); }}>다음 문항 →</button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return <AppLayout m={M} feature={feature} />;
};

export default App;
