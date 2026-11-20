import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { AiCarePlanStructured, DON_PHUT_FACILITIES } from '../types/cga';

export interface SummaryTableRow {
  domain: string;
  scoreText: string;
  interpretation: string;
  status: 'normal' | 'warning' | 'abnormal' | 'unassessed';
}

interface ScreeningSummaryStepProps {
  elderName: string;
  age: number;
  genderLabel: string;
  village: string;
  subDistrict: string;
  chronicText: string;
  bpSystolic: number;
  bpDiastolic: number;
  bmi: number;
  summaryRows: SummaryTableRow[];
  careNoteSummary: string;
  setCareNoteSummary: (v: string) => void;
  aiPlan: AiCarePlanStructured | null;
  aiLoading: boolean;
  aiError: string | null;
  onGenerateAiPlan: () => void;
  createReferral: boolean;
  setCreateReferral: (v: boolean) => void;
  referralTarget: string;
  setReferralTarget: (v: string) => void;
  referralUrgency: 'routine' | 'urgent' | 'emergency';
  setReferralUrgency: (v: 'routine' | 'urgent' | 'emergency') => void;
  referralReason: string;
  setReferralReason: (v: string) => void;
  saving: boolean;
  saveError: string | null;
  accessToken: string | null;
  onRequestGoogleAuth: () => Promise<void>;
  onSaveToGoogleSheets: () => void;
  onExportCsv: () => void;
  onPrintPdf: () => void;
  onResetForm: () => void;
  onBack: () => void;
}

export const ScreeningSummaryStep: React.FC<ScreeningSummaryStepProps> = ({
  elderName,
  age,
  genderLabel,
  village,
  subDistrict,
  chronicText,
  bpSystolic,
  bpDiastolic,
  bmi,
  summaryRows,
  careNoteSummary,
  setCareNoteSummary,
  aiPlan,
  aiLoading,
  aiError,
  onGenerateAiPlan,
  createReferral,
  setCreateReferral,
  referralTarget,
  setReferralTarget,
  referralUrgency,
  setReferralUrgency,
  referralReason,
  setReferralReason,
  saving,
  saveError,
  accessToken,
  onRequestGoogleAuth,
  onSaveToGoogleSheets,
  onExportCsv,
  onPrintPdf,
  onResetForm,
  onBack,
}) => {
  const statusTextColor = (status: SummaryTableRow['status']) => {
    switch (status) {
      case 'abnormal':
        return 'text-red-700 font-semibold';
      case 'warning':
        return 'text-amber-700 font-semibold';
      case 'normal':
        return 'text-emerald-700 font-medium';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 print-sheet space-y-5">
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold text-teal-900">
            ใบสรุปผลการประเมินสุขภาพผู้สูงอายุแบบองค์รวม (CGA)
          </h3>
          <span className="text-xs font-mono-tabular text-slate-500">
            {new Date().toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Resident Header Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs sm:text-sm text-slate-700 space-y-1">
          <div>
            <strong className="text-slate-900">ชื่อ/รหัส:</strong> {elderName || '-'}{' '}
            <span className="text-slate-300 mx-1">|</span>
            <strong className="text-slate-900">อายุ:</strong> {age || '-'} ปี{' '}
            <span className="text-slate-300 mx-1">|</span>
            <strong className="text-slate-900">เพศ:</strong> {genderLabel}{' '}
            <span className="text-slate-300 mx-1">|</span>
            <strong className="text-slate-900">พื้นที่:</strong> {village || '-'} ต.{subDistrict}
          </div>
          <div className="font-mono-tabular">
            <strong className="text-slate-900 font-sans">โรคประจำตัว:</strong> {chronicText}{' '}
            <span className="text-slate-300 mx-1">|</span>
            <strong className="text-slate-900 font-sans">BP:</strong> {bpSystolic}/{bpDiastolic} mmHg{' '}
            <span className="text-slate-300 mx-1">|</span>
            <strong className="text-slate-900 font-sans">BMI:</strong> {bmi > 0 ? bmi.toFixed(1) : '-'}
          </div>
        </div>

        {/* Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2.5 pr-4 font-semibold">ด้านการประเมิน</th>
                <th className="py-2.5 pr-4 font-semibold">คะแนน / ค่าที่วัดได้</th>
                <th className="py-2.5 font-semibold">การแปลผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryRows.map((row) => (
                <tr key={row.domain} className="hover:bg-slate-50/60">
                  <td className="py-2.5 pr-4 font-medium text-slate-900">{row.domain}</td>
                  <td className="py-2.5 pr-4 font-mono-tabular text-slate-700">{row.scoreText}</td>
                  <td className={`py-2.5 text-xs sm:text-sm ${statusTextColor(row.status)}`}>
                    {row.interpretation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Risk & Care Plan Note */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="text-xs font-semibold text-slate-800">
              สรุปความเสี่ยงและแผนดูแล/ส่งต่อเพิ่มเติม
            </label>
            <button
              type="button"
              onClick={onGenerateAiPlan}
              disabled={aiLoading}
              className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors self-start"
            >
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
              {aiLoading ? 'AI กำลังวิเคราะห์...' : 'วิเคราะห์และสร้างแผนดูแลรายบุคคลด้วย AI'}
            </button>
          </div>
          <textarea
            rows={3}
            value={careNoteSummary}
            onChange={(e) => setCareNoteSummary(e.target.value)}
            className="w-full p-3 text-sm border border-slate-300 rounded-lg leading-relaxed"
          />
          {aiError && <p className="mt-1.5 text-xs text-red-600">{aiError}</p>}
        </div>

        {aiPlan && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="font-semibold text-teal-900">
              แผนการดูแลรายบุคคลโดย AI ผู้เชี่ยวชาญผู้สูงอายุ
            </div>
            <p className="text-slate-700 leading-relaxed">{aiPlan.riskSummary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold text-slate-900 mb-1">สำหรับเจ้าหน้าที่สาธารณสุข / CM / CG</div>
                <ul className="space-y-1 text-slate-600">
                  {aiPlan.officerPlan.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-slate-900 mb-1">สำหรับครอบครัวและผู้ดูแล</div>
                <ul className="space-y-1 text-slate-600">
                  {aiPlan.familyGuide.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="text-red-700">
              <span className="font-semibold inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                สัญญาณเตือนฉุกเฉิน:
              </span>{' '}
              {aiPlan.redFlags.join(' · ')}
            </div>
          </div>
        )}

        {/* Referral Option */}
        <div className="no-print pt-3 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createReferral}
              onChange={(e) => setCreateReferral(e.target.checked)}
              className="w-4 h-4 accent-teal-700 rounded"
            />
            <span className="text-sm font-medium text-slate-900">
              เปิดใบส่งต่อผู้ป่วย (Referral) เชื่อมโยง รพ.สต. / รพ.ดอนพุด
            </span>
          </label>
          {createReferral && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">หน่วยบริการปลายทาง</label>
                <select
                  value={referralTarget}
                  onChange={(e) => setReferralTarget(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {DON_PHUT_FACILITIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ความเร่งด่วน</label>
                <select
                  value={referralUrgency}
                  onChange={(e) => setReferralUrgency(e.target.value as 'routine' | 'urgent' | 'emergency')}
                  className="w-full min-h-[38px] px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="routine">ปกติ (Routine)</option>
                  <option value="urgent">เร่งด่วน (Urgent)</option>
                  <option value="emergency">ฉุกเฉิน (Emergency)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">เหตุผลการส่งต่อ</label>
                <input
                  type="text"
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  placeholder="ระบุเหตุผลส่งต่อ..."
                  className="w-full min-h-[38px] px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {saveError}
        </div>
      )}

      {/* Action Footer */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          ประเมินเจาะลึก
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
            {saving ? 'กำลังบันทึก...' : 'บันทึกลง Cloud (Firestore)'}
          </button>

          {accessToken ? (
            <button
              type="button"
              onClick={onSaveToGoogleSheets}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              บันทึกข้อมูลลง Google Sheets
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestGoogleAuth}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              เชื่อมต่อ Google Sheets
            </button>
          )}

          <button
            type="button"
            onClick={onPrintPdf}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-teal-900 bg-white border border-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ / บันทึก PDF
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            ส่งออก CSV
          </button>

          <button
            type="button"
            onClick={onResetForm}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            ล้างฟอร์ม (รายใหม่)
          </button>
        </div>
      </div>
    </div>
  );
};
