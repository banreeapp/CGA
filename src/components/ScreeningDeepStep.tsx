import React from 'react';
import { ArrowLeft, ArrowRight, CheckSquare } from 'lucide-react';
import {
  EDUCATION_MMSE_INFO,
  MMSE_THAI_DOMAINS,
  SARC_F_OPTIONS,
  SARC_F_QUESTIONS,
  TGDS_15_QUESTIONS,
  THAI_FRAT_ITEMS,
} from '../data/cgaInstruments';
import { EducationLevel } from '../types/cga';

interface ScreeningDeepStepProps {
  educationLevel: EducationLevel;
  indications: {
    mmse: boolean;
    tgds: boolean;
    frat: boolean;
    sarc: boolean;
  };
  deepMmseEnabled: boolean;
  setDeepMmseEnabled: (v: boolean) => void;
  mmseScores: number[];
  setMmseScores: React.Dispatch<React.SetStateAction<number[]>>;
  deepTgdsEnabled: boolean;
  setDeepTgdsEnabled: (v: boolean) => void;
  tgdsAnswers: ('yes' | 'no')[];
  setTgdsAnswers: React.Dispatch<React.SetStateAction<('yes' | 'no')[]>>;
  deepFratEnabled: boolean;
  setDeepFratEnabled: (v: boolean) => void;
  fratChecks: boolean[];
  setFratChecks: React.Dispatch<React.SetStateAction<boolean[]>>;
  deepSarcEnabled: boolean;
  setDeepSarcEnabled: (v: boolean) => void;
  sarcAnswers: number[];
  setSarcAnswers: React.Dispatch<React.SetStateAction<number[]>>;
  calfCm: number;
  setCalfCm: (v: number) => void;
  gender: 'male' | 'female' | 'other';
  onBack: () => void;
  onNext: () => void;
}

export const ScreeningDeepStep: React.FC<ScreeningDeepStepProps> = ({
  educationLevel,
  indications,
  deepMmseEnabled,
  setDeepMmseEnabled,
  mmseScores,
  setMmseScores,
  deepTgdsEnabled,
  setDeepTgdsEnabled,
  tgdsAnswers,
  setTgdsAnswers,
  deepFratEnabled,
  setDeepFratEnabled,
  fratChecks,
  setFratChecks,
  deepSarcEnabled,
  setDeepSarcEnabled,
  sarcAnswers,
  setSarcAnswers,
  calfCm,
  setCalfCm,
  gender,
  onBack,
  onNext,
}) => {
  const eduInfo = EDUCATION_MMSE_INFO[educationLevel];

  const mmseTotal = MMSE_THAI_DOMAINS.reduce((sum, dom, idx) => {
    if (educationLevel === 'illiterate' && dom.requiresLiteracy) return sum;
    return sum + (mmseScores[idx] ?? 0);
  }, 0);
  const mmseAbnormal = mmseTotal <= eduInfo.cutoff;

  const tgdsTotal = TGDS_15_QUESTIONS.reduce((sum, q, idx) => {
    return sum + (tgdsAnswers[idx] === q.positiveAnswer ? 1 : 0);
  }, 0);

  const fratTotal = THAI_FRAT_ITEMS.reduce((sum, item, idx) => {
    return sum + (fratChecks[idx] ? item.weight : 0);
  }, 0);

  const sarcTotal = sarcAnswers.reduce((a, b) => a + b, 0);
  const calfCutoff = gender === 'male' ? 34 : 33;
  const calfAbnormal = calfCm > 0 && calfCm < calfCutoff;

  const hasAnyIndication =
    indications.mmse || indications.tgds || indications.frat || indications.sarc;

  return (
    <div className="space-y-4">
      <div
        className={`border rounded-xl p-4 text-sm ${
          hasAnyIndication
            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
            : 'bg-teal-50/60 border-teal-200 text-teal-900'
        }`}
      >
        {hasAnyIndication
          ? 'ผลการคัดกรองเบื้องต้นพบข้อบ่งชี้ให้ประเมินเจาะลึกเพิ่มเติม ระบบได้เปิดชุดประเมินที่เกี่ยวข้องให้โดยอัตโนมัติ (สามารถปรับเปิด-ปิดได้ตามดุลยพินิจเจ้าหน้าที่)'
          : 'ผลการคัดกรองเบื้องต้นยังไม่พบข้อบ่งชี้บังคับ แต่เจ้าหน้าที่สามารถติ๊กเปิดชุดประเมินเจาะลึกด้านล่างได้ตามต้องการ'}
      </div>

      {/* 1. MMSE-Thai 2002 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deepMmseEnabled}
              onChange={(e) => setDeepMmseEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-700 rounded"
            />
            <span className="text-base font-semibold text-teal-900">
              1. MMSE-Thai 2002 (ประเมินภาวะสมองเสื่อมเชิงลึก)
            </span>
          </label>
          <span className="text-xs font-medium text-slate-600 font-mono-tabular">
            {deepMmseEnabled
              ? `${mmseTotal}/${eduInfo.maxScore} · ${
                  mmseAbnormal
                    ? `สงสัยสมองเสื่อม (≤${eduInfo.cutoff})`
                    : `ปกติ (>${eduInfo.cutoff})`
                }`
              : indications.mmse
                ? 'แนะนำให้ประเมิน (Mini-Cog ≤ 2)'
                : 'ไม่ได้ประเมิน'}
          </span>
        </div>

        {deepMmseEnabled && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <p className="text-xs text-slate-500">
              เกณฑ์จุดตัดอัตโนมัติ: {eduInfo.label}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MMSE_THAI_DOMAINS.map((dom, idx) => {
                const disabled = educationLevel === 'illiterate' && dom.requiresLiteracy;
                return (
                  <div
                    key={dom.id}
                    className={`border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 ${
                      disabled ? 'bg-slate-50 opacity-60' : 'bg-white'
                    }`}
                  >
                    <span className="text-xs text-slate-800">{dom.title}</span>
                    {disabled ? (
                      <span className="text-xs text-slate-400 whitespace-nowrap">ข้ามข้อนี้</span>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={dom.max}
                          value={mmseScores[idx] ?? dom.max}
                          onChange={(e) => {
                            const val = Math.min(dom.max, Math.max(0, Number(e.target.value)));
                            setMmseScores((prev) => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }}
                          className="w-16 min-h-[36px] px-2 py-1 text-sm text-center border border-slate-300 rounded-md font-mono-tabular"
                        />
                        <span className="text-xs text-slate-400 font-mono-tabular">
                          /{dom.max}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. TGDS-15 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deepTgdsEnabled}
              onChange={(e) => setDeepTgdsEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-700 rounded"
            />
            <span className="text-base font-semibold text-teal-900">
              2. TGDS-15 (แบบวัดความเศร้าในผู้สูงอายุไทย 15 ข้อ)
            </span>
          </label>
          <span className="text-xs font-medium text-slate-600 font-mono-tabular">
            {deepTgdsEnabled
              ? `${tgdsTotal}/15 · ${
                  tgdsTotal >= 10
                    ? 'ซึมเศร้ารุนแรง'
                    : tgdsTotal >= 5
                      ? 'เสี่ยงภาวะซึมเศร้า'
                      : 'ปกติ'
                }`
              : indications.tgds
                ? 'แนะนำให้ประเมิน (2Q ≥ 1)'
                : 'ไม่ได้ประเมิน'}
          </span>
        </div>

        {deepTgdsEnabled && (
          <div className="mt-4 pt-4 border-t border-slate-100 divide-y divide-slate-100">
            {TGDS_15_QUESTIONS.map((q, idx) => (
              <div
                key={idx}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <span className="text-xs sm:text-sm text-slate-800">{q.text}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {(['yes', 'no'] as const).map((ans) => {
                    const selected = tgdsAnswers[idx] === ans;
                    return (
                      <button
                        key={ans}
                        type="button"
                        onClick={() =>
                          setTgdsAnswers((prev) => {
                            const next = [...prev];
                            next[idx] = ans;
                            return next;
                          })
                        }
                        className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                          selected
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {ans === 'yes' ? 'ใช่' : 'ไม่ใช่'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Thai-FRAT */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deepFratEnabled}
              onChange={(e) => setDeepFratEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-700 rounded"
            />
            <span className="text-base font-semibold text-teal-900">
              3. Thai-FRAT (ประเมินความเสี่ยงพลัดตกหกล้ม 6 ข้อ)
            </span>
          </label>
          <span className="text-xs font-medium text-slate-600 font-mono-tabular">
            {deepFratEnabled
              ? `${fratTotal}/11 · ${fratTotal >= 4 ? 'เสี่ยงหกล้มสูง (≥4)' : 'ความเสี่ยงต่ำ (<4)'}`
              : indications.frat
                ? 'แนะนำให้ประเมิน (TUGT ≥ 12 วิ)'
                : 'ไม่ได้ประเมิน'}
          </span>
        </div>

        {deepFratEnabled && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            {THAI_FRAT_ITEMS.map((item, idx) => (
              <label
                key={item.id}
                className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-3.5 py-2.5 cursor-pointer hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={fratChecks[idx]}
                    onChange={(e) =>
                      setFratChecks((prev) => {
                        const next = [...prev];
                        next[idx] = e.target.checked;
                        return next;
                      })
                    }
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  {item.label}
                </span>
                <span className="text-xs font-mono-tabular text-slate-500 shrink-0">
                  +{item.weight} คะแนน
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 4. SARC-F + Calf Circumference */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deepSarcEnabled}
              onChange={(e) => setDeepSarcEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-700 rounded"
            />
            <span className="text-base font-semibold text-teal-900">
              4. SARC-F + วัดเส้นรอบวงน่อง (ภาวะมวลกล้ามเนื้อน้อย)
            </span>
          </label>
          <span className="text-xs font-medium text-slate-600 font-mono-tabular">
            {deepSarcEnabled
              ? `SARC-F ${sarcTotal}/10 · ${
                  sarcTotal >= 4 || calfAbnormal ? 'เสี่ยงมวลกล้ามเนื้อน้อย' : 'ปกติ'
                }`
              : indications.sarc
                ? 'แนะนำให้ประเมิน (FRAIL ≥ 1 / MNA ≤ 11)'
                : 'ไม่ได้ประเมิน'}
          </span>
        </div>

        {deepSarcEnabled && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            <div className="space-y-3">
              {SARC_F_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="space-y-1.5">
                  <div className="text-xs sm:text-sm font-medium text-slate-800">{q.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {SARC_F_OPTIONS.map((opt) => {
                      const active = sarcAnswers[idx] === opt.score;
                      return (
                        <button
                          key={opt.score}
                          type="button"
                          onClick={() =>
                            setSarcAnswers((prev) => {
                              const next = [...prev];
                              next[idx] = opt.score;
                              return next;
                            })
                          }
                          className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            active
                              ? 'bg-teal-700 text-white border-teal-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-medium text-slate-700">
                เส้นรอบวงน่อง (ซม.) — เกณฑ์เสี่ยง: ชาย &lt; 34 ซม. / หญิง &lt; 33 ซม.
              </label>
              <input
                type="number"
                step="0.5"
                min={15}
                max={60}
                value={calfCm || ''}
                onChange={(e) => setCalfCm(Number(e.target.value))}
                placeholder="เช่น 34.5"
                className="w-32 min-h-[38px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-mono-tabular"
              />
              {calfCm > 0 && (
                <span
                  className={`text-xs font-semibold ${
                    calfAbnormal ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  {calfAbnormal ? 'ต่ำกว่าเกณฑ์ (เสี่ยงมวลกล้ามเนื้อน้อย)' : 'ปกติ'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Wizard Step Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          คัดกรองเบื้องต้น
        </button>
        <button
          type="button"
          onClick={onNext}
          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          <CheckSquare className="w-4 h-4" />
          ถัดไป: สรุปผล &amp; บันทึก
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
