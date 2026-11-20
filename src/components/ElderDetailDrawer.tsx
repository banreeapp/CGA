import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardPlus,
  Phone,
  X,
} from 'lucide-react';
import { db } from '../lib/firebase';
import {
  AiCarePlanStructured,
  Assessment,
  Elder,
  ElderPrivateContact,
  formatThaiTimestamp,
  riskLabelThai,
} from '../types/cga';

interface ElderDetailDrawerProps {
  elder: Elder | null;
  assessments: Assessment[];
  onClose: () => void;
  onRescreen: (elderId: string) => void;
}

export const ElderDetailDrawer: React.FC<ElderDetailDrawerProps> = ({
  elder,
  assessments,
  onClose,
  onRescreen,
}) => {
  const [contact, setContact] = useState<ElderPrivateContact | null>(null);

  useEffect(() => {
    if (!elder) {
      setContact(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'elders', elder.id, 'private', 'contact'))
      .then((snap) => {
        if (!cancelled && snap.exists()) {
          setContact(snap.data() as ElderPrivateContact);
        }
      })
      .catch(() => {
        // Ignore if contact subdoc does not exist
      });
    return () => {
      cancelled = true;
    };
  }, [elder]);

  const parsedPlan: AiCarePlanStructured | null = useMemo(() => {
    if (!elder?.aiCarePlanSummary) return null;
    try {
      return JSON.parse(elder.aiCarePlanSummary) as AiCarePlanStructured;
    } catch {
      return null;
    }
  }, [elder]);

  const elderAssessments = useMemo(
    () => (elder ? assessments.filter((a) => a.elderId === elder.id) : []),
    [elder, assessments],
  );

  if (!elder) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto border-l border-slate-200 shadow-xl flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 font-mono-tabular">
              {elder.hn} · ต.{elder.subDistrict} · {elder.facility}
            </div>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">{elder.fullName}</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              อายุ {elder.age} ปี · กลุ่ม{elder.adlGroup} (ADL {elder.adlScore}/20) ·{' '}
              <span className="font-semibold text-slate-900">{riskLabelThai(elder.riskLevel)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="ปิดรายละเอียด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Isolated PII Contact Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-700" />
              ข้อมูลติดต่อฉุกเฉินและที่อยู่ (จัดเก็บแยกส่วน PII)
            </div>
            <div className="text-slate-600">
              โทรศัพท์: {contact?.phone || '-'} · ผู้ติดต่อฉุกเฉิน: {contact?.emergencyContact || '-'}
            </div>
            <div className="text-slate-600">
              ที่อยู่: {contact?.address || `${elder.village} ต.${elder.subDistrict}`}
            </div>
          </div>

          {/* Chronic Conditions */}
          <div>
            <h3 className="text-xs font-semibold text-slate-700 mb-1.5">
              โรคประจำตัวและรายการยา
            </h3>
            <p className="text-sm text-slate-800">
              {elder.chronicDiseases.join(' · ') || 'ไม่มีโรคประจำตัวเรื้อรัง'} · ใช้ยาประจำ{' '}
              <span className="font-mono-tabular font-semibold">{elder.medicationsCount}</span> รายการ
            </p>
          </div>

          {/* Individualized AI Care Plan */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              แผนการดูแลรายบุคคล (AI Geriatric Care Plan)
            </h3>
            {parsedPlan ? (
              <>
                <p className="text-xs text-slate-700 leading-relaxed">{parsedPlan.riskSummary}</p>
                <div>
                  <h4 className="text-xs font-semibold text-teal-800 mb-1.5">
                    สำหรับเจ้าหน้าที่สาธารณสุข / CM / CG
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {parsedPlan.officerPlan.map((step, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 mb-1.5">
                    สำหรับครอบครัวและผู้ดูแลที่บ้าน
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {parsedPlan.familyGuide.map((step, i) => (
                      <li key={i}>• {step}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    อาการเตือนฉุกเฉิน
                  </h4>
                  <ul className="space-y-1 text-xs text-red-700">
                    {parsedPlan.redFlags.map((rf, i) => (
                      <li key={i}>• {rf}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                ยังไม่มีแผนการดูแลจาก AI สำหรับรายนี้ กดปุ่ม &quot;ประเมิน CGA ซ้ำ&quot; เพื่อสร้างแผนอัตโนมัติ
              </p>
            )}
          </div>

          {/* Assessment History */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-700" />
              ประวัติการคัดกรอง CGA ({elderAssessments.length})
            </h3>
            {elderAssessments.length === 0 ? (
              <p className="text-xs text-slate-500">ยังไม่มีประวัติการประเมิน</p>
            ) : (
              <div className="space-y-2.5">
                {elderAssessments.map((a) => {
                  let detail: {
                    zbiScore?: number | null;
                    mmseScore?: number | null;
                    tgdsScore?: number | null;
                    thaiFratScore?: number | null;
                    sarcFScore?: number | null;
                    frailItems?: boolean[];
                    mnaAnswers?: number[];
                  } | null = null;
                  if (a.cgaDetailJson) {
                    try {
                      detail = JSON.parse(a.cgaDetailJson);
                    } catch {
                      detail = null;
                    }
                  }
                  const frailTotal = detail?.frailItems ? detail.frailItems.filter(Boolean).length : null;
                  const mnaTotal = detail?.mnaAnswers ? detail.mnaAnswers.reduce((x, y) => x + y, 0) : null;

                  return (
                    <div
                      key={a.id}
                      className="border border-slate-200 rounded-lg p-3.5 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-medium text-slate-900">
                        <span>{formatThaiTimestamp(a.createdAt)}</span>
                        <span className="font-mono-tabular">
                          BP {a.bpSystolic}/{a.bpDiastolic} · SpO2 {a.spo2}% · FBS {a.fbs}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        ADL {a.adlScore}/20 ({a.adlGroup}) · 2Q: {a.depress2Q}/2 · Mini-Cog: {a.cogMiniCog}/5 · TUGT: {a.tugtSeconds}s
                      </div>
                      {detail && (
                        <div className="text-slate-600 font-mono-tabular">
                          FRAIL: {frailTotal ?? '-'}/5 · MNA-SF: {mnaTotal ?? '-'}/14
                          {detail.zbiScore !== null && detail.zbiScore !== undefined ? ` · ZBI-12: ${detail.zbiScore}/48` : ''}
                          {detail.mmseScore !== null && detail.mmseScore !== undefined ? ` · MMSE: ${detail.mmseScore}` : ''}
                          {detail.tgdsScore !== null && detail.tgdsScore !== undefined ? ` · TGDS-15: ${detail.tgdsScore}` : ''}
                          {detail.thaiFratScore !== null && detail.thaiFratScore !== undefined ? ` · Thai-FRAT: ${detail.thaiFratScore}` : ''}
                          {detail.sarcFScore !== null && detail.sarcFScore !== undefined ? ` · SARC-F: ${detail.sarcFScore}` : ''}
                        </div>
                      )}
                      {a.abnormalFlags.length > 0 && (
                        <div className="text-red-700">
                          ผิดปกติ: {a.abnormalFlags.join(' · ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRescreen(elder.id);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
          >
            <ClipboardPlus className="w-4 h-4" />
            ประเมิน CGA ซ้ำ
          </button>
        </div>
      </div>
    </div>
  );
};
