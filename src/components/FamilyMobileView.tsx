import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  PhoneCall,
  Pill,
  Send,
  Smartphone,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AiCarePlanStructured,
  CareLogItem,
  Elder,
  FIELD_LIMITS,
  formatThaiTimestamp,
  sanitizeId,
  truncateStr,
} from '../types/cga';

interface FamilyMobileViewProps {
  ownerId: string;
  caregiverName: string;
  elders: Elder[];
  careLogs: CareLogItem[];
}

export const FamilyMobileView: React.FC<FamilyMobileViewProps> = ({
  ownerId,
  caregiverName,
  elders,
  careLogs,
}) => {
  const [selectedElderId, setSelectedElderId] = useState(elders[0]?.id || '');
  const [bpSystolic, setBpSystolic] = useState(128);
  const [bpDiastolic, setBpDiastolic] = useState(78);
  const [mood, setMood] = useState<'สดชื่น' | 'ปกติ' | 'อ่อนเพลีย' | 'ซึม/สับสน'>('ปกติ');
  const [appetite, setAppetite] = useState<'ทานได้ดี' | 'ทานได้น้อย' | 'เบื่ออาหาร'>('ทานได้ดี');
  const [medicationTaken, setMedicationTaken] = useState(true);
  const [symptomNote, setSymptomNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const selectedElder = useMemo(
    () => elders.find((e) => e.id === selectedElderId) || elders[0] || null,
    [elders, selectedElderId],
  );

  const parsedCarePlan: AiCarePlanStructured | null = useMemo(() => {
    if (!selectedElder?.aiCarePlanSummary) return null;
    try {
      return JSON.parse(selectedElder.aiCarePlanSummary) as AiCarePlanStructured;
    } catch {
      return null;
    }
  }, [selectedElder]);

  const elderLogs = useMemo(
    () => (selectedElder ? careLogs.filter((l) => l.elderId === selectedElder.id) : []),
    [careLogs, selectedElder],
  );

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElder) return;

    const abnormalReasons: string[] = [];
    if (bpSystolic >= 160 || bpDiastolic >= 100) {
      abnormalReasons.push(`ความดันโลหิตสูง (${bpSystolic}/${bpDiastolic} mmHg)`);
    } else if (bpSystolic < 90 || bpDiastolic < 60) {
      abnormalReasons.push(`ความดันโลหิตต่ำ (${bpSystolic}/${bpDiastolic} mmHg)`);
    }
    if (mood === 'ซึม/สับสน') {
      abnormalReasons.push('ผู้สูงอายุมีอาการซึมหรือสับสน');
    }
    if (appetite === 'เบื่ออาหาร') {
      abnormalReasons.push('เบื่ออาหารผิดปกติ');
    }
    if (!medicationTaken) {
      abnormalReasons.push('ยังไม่ได้รับประทานยาตามมื้อ');
    }

    const hasAbnormal = abnormalReasons.length > 0;
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const logId = sanitizeId(`log-${suffix}`);

    setSaving(true);
    setSubmittedNotice(null);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'careLogs', logId), {
        ownerId,
        elderId: selectedElder.id,
        elderName: selectedElder.fullName,
        loggedBy: truncateStr(caregiverName || 'ผู้ดูแลในครอบครัว', FIELD_LIMITS.NAME_MAX),
        bpSystolic: Math.round(bpSystolic),
        bpDiastolic: Math.round(bpDiastolic),
        mood,
        appetite,
        medicationTaken,
        symptomNote: truncateStr(symptomNote, FIELD_LIMITS.SYMPTOM_MAX),
        hasAbnormal,
        createdAt: serverTimestamp(),
      });

      if (hasAbnormal) {
        const alertId = sanitizeId(`alert-${suffix}`);
        const isCritical = bpSystolic >= 180 || bpSystolic < 90 || mood === 'ซึม/สับสน';
        batch.set(doc(db, 'alerts', alertId), {
          ownerId,
          elderId: selectedElder.id,
          elderName: selectedElder.fullName,
          severity: isCritical ? 'critical' : 'urgent',
          title: truncateStr(`รายงานจากครอบครัว: ${abnormalReasons[0]}`, 180),
          description: truncateStr(
            `${abnormalReasons.join(' · ')}${symptomNote ? ` (${symptomNote})` : ''}`,
            1000,
          ),
          source: 'family_checkin',
          acknowledged: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.update(doc(db, 'elders', selectedElder.id), {
          latestAlertStatus: 'active',
          updatedAt: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `careLogs/${logId}`);
      }

      setSymptomNote('');
      setSubmittedNotice(
        hasAbnormal
          ? 'บันทึกอาการแล้ว และระบบได้ส่งสัญญาณแจ้งเตือนด่วนไปยังเจ้าหน้าที่ รพ.สต. เรียบร้อย'
          : 'บันทึกสุขภาพประจำวันเรียบร้อย ข้อมูลซิงก์ถึงเจ้าหน้าที่สาธารณสุขแล้ว',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!selectedElder) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <Smartphone className="w-8 h-8 text-teal-700 mx-auto" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">
          ยังไม่มีรายชื่อผู้สูงอายุสำหรับติดตามผ่านมือถือ
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          กรุณากลับไปที่หน้าภาพรวมเพื่อนำเข้าข้อมูลตัวอย่างหรือลงทะเบียนผู้สูงอายุ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Elder Selector Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-teal-700">
            โหมดครอบครัวและ อสม./CG · ติดตามสุขภาพต่อเนื่องจากที่บ้าน
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{selectedElder.fullName}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            อายุ {selectedElder.age} ปี · กลุ่ม{selectedElder.adlGroup} · {selectedElder.facility}
          </p>
        </div>
        <div className="sm:w-72">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            เปลี่ยนผู้สูงอายุที่ดูแล
          </label>
          <select
            value={selectedElder.id}
            onChange={(e) => setSelectedElderId(e.target.value)}
            className="w-full min-h-[44px] px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 font-medium"
          >
            {elders.map((el) => (
              <option key={el.id} value={el.id}>
                {el.fullName} (กลุ่ม{el.adlGroup})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Mobile Touch-First Daily Check-in Form */}
        <form
          onSubmit={handleCheckIn}
          className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-teal-700" />
              <h3 className="text-base font-bold text-slate-900">บันทึกอาการประจำวัน</h3>
            </div>
            <span className="text-xs text-slate-500">ส่งตรงถึง รพ.สต.</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                ความดันตัวบน (mmHg)
              </label>
              <input
                type="number"
                min={50}
                max={260}
                value={bpSystolic}
                onChange={(e) => setBpSystolic(Number(e.target.value))}
                className="w-full min-h-[46px] px-3 py-2 text-base font-semibold border border-slate-300 rounded-xl font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                ความดันตัวล่าง (mmHg)
              </label>
              <input
                type="number"
                min={30}
                max={160}
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(Number(e.target.value))}
                className="w-full min-h-[46px] px-3 py-2 text-base font-semibold border border-slate-300 rounded-xl font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-2">
              อาการทั่วไปและความรู้สึกตัววันนี้
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['สดชื่น', 'ปกติ', 'อ่อนเพลีย', 'ซึม/สับสน'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMood(option)}
                  className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                    mood === option
                      ? option === 'ซึม/สับสน'
                        ? 'bg-red-700 text-white border-red-700'
                        : 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-2">
              การรับประทานอาหาร
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['ทานได้ดี', 'ทานได้น้อย', 'เบื่ออาหาร'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAppetite(option)}
                  className={`min-h-[44px] px-2 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors ${
                    appetite === option
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setMedicationTaken((v) => !v)}
              className={`w-full min-h-[48px] px-4 py-3 rounded-xl border flex items-center justify-between text-sm font-medium transition-colors ${
                medicationTaken
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Pill className="w-4 h-4" />
                การรับประทานยาประจำตามมื้อ
              </span>
              <span className="font-semibold">
                {medicationTaken ? 'ทานครบแล้ว' : 'ยังไม่ได้ทานยา'}
              </span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              บันทึกอาการเพิ่มเติมถึงเจ้าหน้าที่ (ถ้ามี)
            </label>
            <textarea
              rows={2}
              value={symptomNote}
              onChange={(e) => setSymptomNote(e.target.value)}
              placeholder="เช่น เวียนศีรษะตอนลุกยืน, นอนไม่หลับ..."
              className="w-full p-3 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          {submittedNotice && (
            <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-700" />
              <span>{submittedNotice}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
            {saving ? 'กำลังส่งข้อมูล...' : 'ส่งบันทึกสุขภาพประจำวัน'}
          </button>
        </form>

        {/* Family Individualized AI Care Guide + Recent Logs */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              คู่มือดูแลรายบุคคลสำหรับครอบครัว
            </h3>
            {parsedCarePlan ? (
              <>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {parsedCarePlan.riskSummary}
                </p>
                <div>
                  <h4 className="text-xs font-semibold text-teal-800 mb-2">
                    สิ่งที่ครอบครัวควรดูแลเป็นประจำ
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {parsedCarePlan.familyGuide.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    อาการอันตรายที่ต้องรีบนำส่งโรงพยาบาลทันที
                  </h4>
                  <ul className="space-y-1.5 text-sm text-red-700">
                    {parsedCarePlan.redFlags.map((rf, idx) => (
                      <li key={idx}>• {rf}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                ยังไม่มีแผนการดูแลจาก AI สำหรับรายนี้ กรุณาให้เจ้าหน้าที่กดสร้างแผนดูแลในหน้าคัดกรอง CGA
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-teal-700" />
                สายด่วนฉุกเฉินการแพทย์: <strong className="font-mono-tabular text-slate-900">1669</strong>
              </span>
              <span>รพ.ดอนพุด · คปสอ.ดอนพุด</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
              ประวัติการติดตามล่าสุด ({elderLogs.length})
            </h3>
            {elderLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                ยังไม่มีบันทึกติดตามจากครอบครัวสำหรับรายนี้
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {elderLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        BP <span className="font-mono-tabular">{log.bpSystolic}/{log.bpDiastolic}</span> mmHg · {log.mood} · {log.appetite}
                      </span>
                      <span className="text-slate-400 font-mono-tabular">
                        {formatThaiTimestamp(log.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600">
                      ผู้บันทึก: {log.loggedBy} · {log.medicationTaken ? 'ทานยาครบ' : 'ไม่ได้ทานยา'}
                      {log.symptomNote ? ` · "${log.symptomNote}"` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
