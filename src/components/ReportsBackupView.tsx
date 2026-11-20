import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  BrainCircuit,
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  FileSpreadsheet,
  History,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AiMonthlySummary,
  AlertItem,
  Assessment,
  BackupRecord,
  CareLogItem,
  Elder,
  ReferralItem,
  SUB_DISTRICTS,
  formatThaiTimestamp,
  referralStatusThai,
  riskLabelThai,
  sanitizeId,
  truncateStr,
} from '../types/cga';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ConfirmDialog } from './ConfirmDialog';

interface ReportsBackupViewProps {
  ownerId: string;
  accessToken: string | null;
  onRequestGoogleAuth: () => Promise<void>;
  elders: Elder[];
  assessments: Assessment[];
  alerts: AlertItem[];
  referrals: ReferralItem[];
  careLogs: CareLogItem[];
  backups: BackupRecord[];
}

export const ReportsBackupView: React.FC<ReportsBackupViewProps> = ({
  ownerId,
  accessToken,
  onRequestGoogleAuth,
  elders,
  assessments,
  alerts,
  referrals,
  careLogs,
  backups,
}) => {
  const [monthLabel, setMonthLabel] = useState(
    new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
  );
  const [aiSummary, setAiSummary] = useState<AiMonthlySummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [existingSpreadsheetId, setExistingSpreadsheetId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetExporting, setSheetExporting] = useState(false);
  const [sheetResult, setSheetResult] = useState<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    updatedCells: number;
  } | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const [backupBusy, setBackupBusy] = useState(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  const monthlyStats = useMemo(() => {
    const bySubDistrict = SUB_DISTRICTS.map((sd) => {
      const list = elders.filter((e) => e.subDistrict === sd);
      return {
        subDistrict: sd,
        total: list.length,
        social: list.filter((e) => e.adlGroup === 'ติดสังคม').length,
        homebound: list.filter((e) => e.adlGroup === 'ติดบ้าน').length,
        bedridden: list.filter((e) => e.adlGroup === 'ติดเตียง').length,
        highOrCritical: list.filter((e) => e.riskLevel === 'high' || e.riskLevel === 'critical').length,
      };
    });
    return {
      totalElders: elders.length,
      totalAssessments: assessments.length,
      activeAlerts: alerts.filter((a) => !a.acknowledged).length,
      totalAlerts: alerts.length,
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter((r) => r.status === 'completed').length,
      totalCareLogs: careLogs.length,
      bySubDistrict,
    };
  }, [elders, assessments, alerts, referrals, careLogs]);

  const handleGenerateMonthlyAi = async () => {
    setAiLoading(true);
    try {
      const resp = await fetch('/api/ai/monthly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthLabel, stats: monthlyStats }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'สร้างสรุปรายงานไม่สำเร็จ');
      setAiSummary(data);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'ไม่สามารถสร้างสรุปรายงานด้วย AI ได้');
    } finally {
      setAiLoading(false);
    }
  };

  const executeGoogleSheetsExport = async () => {
    if (!accessToken) {
      setConfirmOpen(false);
      return;
    }
    setSheetExporting(true);
    setSheetError(null);
    try {
      const summaryRows = [
        ['รายงานสรุปผลระบบประเมินผู้สูงอายุแบบครบวงจร (CGA) คปสอ.ดอนพุด'],
        ['ประจำเดือน', monthLabel, 'วันที่ส่งออก', new Date().toLocaleString('th-TH')],
        [],
        ['ตัวชี้วัดภาพรวม', 'จำนวน'],
        ['ผู้สูงอายุในทะเบียนทั้งหมด (ราย)', monthlyStats.totalElders],
        ['จำนวนการคัดกรอง CGA สะสม (ครั้ง)', monthlyStats.totalAssessments],
        ['แจ้งเตือนอาการผิดปกติทั้งหมด (รายการ)', monthlyStats.totalAlerts],
        ['แจ้งเตือนรอรับทราบ (รายการ)', monthlyStats.activeAlerts],
        ['การส่งต่อทั้งหมด (เคส)', monthlyStats.totalReferrals],
        ['ส่งต่อเสร็จสิ้น (เคส)', monthlyStats.completedReferrals],
        ['บันทึกติดตามจากครอบครัว/อสม. (ครั้ง)', monthlyStats.totalCareLogs],
        [],
        ['สรุปรายตำบล', 'รวม', 'ติดสังคม', 'ติดบ้าน', 'ติดเตียง', 'เสี่ยงสูง/วิกฤต'],
        ...monthlyStats.bySubDistrict.map((r) => [
          `ต.${r.subDistrict}`,
          r.total,
          r.social,
          r.homebound,
          r.bedridden,
          r.highOrCritical,
        ]),
        ...(aiSummary
          ? [
              [],
              ['บทสรุปผู้บริหาร (AI วิเคราะห์)', aiSummary.executiveSummary],
              ['ข้อเสนอแนะเชิงรุก', aiSummary.actionRecommendations.join(' | ')],
            ]
          : []),
      ];

      const elderRows = [
        ['HN', 'ชื่อ-นามสกุล', 'อายุ', 'เพศ', 'หมู่บ้าน', 'ตำบล', 'หน่วยบริการ', 'ADL', 'กลุ่มศักยภาพ', 'ความเสี่ยง', 'จำนวนยา'],
        ...elders.map((e) => [
          e.hn,
          e.fullName,
          e.age,
          e.gender,
          e.village,
          e.subDistrict,
          e.facility,
          e.adlScore,
          e.adlGroup,
          riskLabelThai(e.riskLevel),
          e.medicationsCount,
        ]),
      ];

      const assessmentRows = [
        ['ผู้สูงอายุ', 'หน่วยบริการ', 'ผู้ประเมิน', 'BP (mmHg)', 'HR', 'SpO2 (%)', 'FBS', 'BMI', 'ADL', '2Q', 'Mini-Cog', 'TUGT (วิ)', 'ความเสี่ยง', 'ความผิดปกติที่พบ'],
        ...assessments.map((a) => [
          a.elderName,
          a.facility,
          a.assessorName,
          `${a.bpSystolic}/${a.bpDiastolic}`,
          a.heartRate,
          a.spo2,
          a.fbs,
          a.bmi,
          `${a.adlScore} (${a.adlGroup})`,
          a.depress2Q,
          a.cogMiniCog,
          a.tugtSeconds,
          riskLabelThai(a.riskLevel),
          a.abnormalFlags.join('; ') || '-',
        ]),
      ];

      const referralRows = [
        ['ผู้สูงอายุ', 'ต้นทาง', 'ปลายทาง', 'เหตุผล', 'ความเร่งด่วน', 'สถานะ', 'หมายเหตุ'],
        ...referrals.map((r) => [
          r.elderName,
          r.fromFacility,
          r.toFacility,
          r.reason,
          r.urgency,
          referralStatusThai(r.status),
          r.notes || '-',
        ]),
      ];

      const resp = await fetch('/api/sheets/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: `รายงาน CGA คปสอ.ดอนพุด - ${monthLabel}`,
          existingSpreadsheetId: existingSpreadsheetId.trim() || undefined,
          summaryRows,
          elderRows,
          assessmentRows,
          referralRows,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'ไม่สามารถส่งออกไปยัง Google Sheets ได้');
      }
      setSheetResult(data);
      setConfirmOpen(false);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งออก Google Sheets');
      setConfirmOpen(false);
    } finally {
      setSheetExporting(false);
    }
  };

  const handleCreateCloudBackup = async () => {
    setBackupBusy(true);
    setBackupNotice(null);
    const backupId = sanitizeId(`backup-${Date.now().toString(36)}`);
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        district: 'คปสอ.ดอนพุด จ.สระบุรี',
        elders,
        assessments,
        alerts,
        referrals,
        careLogs,
      };
      const snapshotJson = truncateStr(JSON.stringify(payload), 490000);
      await setDoc(doc(db, 'backups', backupId), {
        ownerId,
        label: truncateStr(`สำรองข้อมูลอัตโนมัติ ${new Date().toLocaleDateString('th-TH')}`, 160),
        eldersCount: elders.length,
        assessmentsCount: assessments.length,
        referralsCount: referrals.length,
        snapshotJson,
        ...(sheetResult?.spreadsheetUrl ? { googleSheetUrl: truncateStr(sheetResult.spreadsheetUrl, 300) } : {}),
        createdAt: serverTimestamp(),
      });
      setBackupNotice('สร้างจุดสำรองข้อมูลบน Cloud Firestore เรียบร้อยแล้ว');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `backups/${backupId}`);
    } finally {
      setBackupBusy(false);
    }
  };

  const handleDownloadJson = (jsonStr: string, filename: string) => {
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Monthly Automated Report & Google Sheets Export */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              รายงานสรุปผลรายเดือนอัตโนมัติ และเชื่อมต่อ Google Sheets
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              สรุปผลการคัดกรอง 4 ตำบลของ คปสอ.ดอนพุด พร้อมส่งออกเป็นสเปรดชีต 4 แท็บมาตรฐานลงใน Google Sheets ของท่าน
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={monthLabel}
              onChange={(e) => setMonthLabel(e.target.value)}
              aria-label="เดือนที่ออกรายงาน"
              className="min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-slate-50 w-44"
            />
            <button
              type="button"
              onClick={handleGenerateMonthlyAi}
              disabled={aiLoading}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              สรุปรายงานด้วย AI
            </button>
          </div>
        </div>

        {/* Summary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="text-xs text-slate-500">ผู้สูงอายุทั้งหมด</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 font-mono-tabular">
              {monthlyStats.totalElders}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="text-xs text-slate-500">คัดกรอง CGA</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 font-mono-tabular">
              {monthlyStats.totalAssessments}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="text-xs text-slate-500">ส่งต่อสำเร็จ / ทั้งหมด</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 font-mono-tabular">
              {monthlyStats.completedReferrals}/{monthlyStats.totalReferrals}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="text-xs text-slate-500">บันทึกจากครอบครัว</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 font-mono-tabular">
              {monthlyStats.totalCareLogs}
            </div>
          </div>
        </div>

        {aiSummary && (
          <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-teal-900">
              บทสรุปผู้บริหารประจำเดือน {monthLabel} (วิเคราะห์โดย AI)
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">{aiSummary.executiveSummary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 mb-1.5">ประเด็นสำคัญจากการคัดกรอง</h4>
                <ul className="space-y-1 text-xs text-slate-700">
                  {aiSummary.keyHighlights.map((h, i) => (
                    <li key={i}>• {h}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 mb-1.5">ข้อเสนอแนะเชิงรุกเดือนถัดไป</h4>
                <ul className="space-y-1 text-xs text-slate-700">
                  {aiSummary.actionRecommendations.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Google Sheets Sync Controls */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="flex-1 max-w-xl">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Spreadsheet ID เดิม (เว้นว่างไว้เพื่อสร้างไฟล์ Google Sheets ใหม่โดยอัตโนมัติ)
              </label>
              <input
                type="text"
                value={existingSpreadsheetId}
                onChange={(e) => setExistingSpreadsheetId(e.target.value)}
                placeholder="เช่น 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms (ไม่บังคับ)"
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>
            <div className="shrink-0">
              {!accessToken ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-xs text-slate-600">
                    เชื่อมต่อบัญชี Google เพื่ออนุญาตเขียนข้อมูลลง Google Sheets
                  </span>
                  <GoogleSignInButton
                    onClick={onRequestGoogleAuth}
                    label="Sign in with Google (Sheets)"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={sheetExporting}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {existingSpreadsheetId.trim()
                    ? 'อัปเดตข้อมูลลง Google Sheets ที่ระบุ'
                    : 'สร้างและส่งออกรายงานลง Google Sheets'}
                </button>
              )}
            </div>
          </div>

          {sheetError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {sheetError}
            </div>
          )}

          {sheetResult && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-emerald-900">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  ซิงก์รายงานลง Google Sheets สำเร็จ ({sheetResult.updatedCells} เซลล์)
                </div>
                <div className="mt-0.5 font-mono-tabular text-emerald-800">
                  Spreadsheet ID: {sheetResult.spreadsheetId}
                </div>
              </div>
              <a
                href={sheetResult.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg whitespace-nowrap"
              >
                เปิด Google Sheets
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Automated Cloud Backup & History Protection */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
              ระบบสำรองข้อมูลอัตโนมัติบน Cloud และป้องกันการสูญหาย
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ประวัติสุขภาพและผลการคัดกรองทั้งหมดถูกจัดเก็บแบบเรียลไทม์บน Cloud Firestore พร้อมสร้าง Snapshot สำรองย้อนหลังได้ตลอดเวลา
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleDownloadJson(
                  JSON.stringify({ elders, assessments, alerts, referrals, careLogs }, null, 2),
                  `donphut-cga-backup-${new Date().toISOString().slice(0, 10)}.json`,
                )
              }
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลดไฟล์ JSON
            </button>
            <button
              type="button"
              onClick={handleCreateCloudBackup}
              disabled={backupBusy}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg whitespace-nowrap"
            >
              {backupBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
              สร้างจุดสำรองข้อมูล Cloud ทันที
            </button>
          </div>
        </div>

        {backupNotice && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900">
            {backupNotice}
          </div>
        )}

        {backups.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <History className="w-6 h-6 text-slate-300" />
            <span>ยังไม่มี Snapshot สำรองข้อมูล กดปุ่ม &quot;สร้างจุดสำรองข้อมูล Cloud ทันที&quot; เพื่อบันทึกจุดกู้คืน</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-medium">ชื่อจุดสำรองข้อมูล</th>
                  <th className="py-2.5 pr-3 text-right font-medium">ผู้สูงอายุ</th>
                  <th className="py-2.5 pr-3 text-right font-medium">ผล CGA</th>
                  <th className="py-2.5 pr-3 text-right font-medium">ส่งต่อ</th>
                  <th className="py-2.5 pr-3 font-medium">เวลาบันทึก</th>
                  <th className="py-2.5 text-right font-medium">ดาวน์โหลด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-3 font-medium text-slate-900">{b.label}</td>
                    <td className="py-3 pr-3 text-right font-mono-tabular">{b.eldersCount}</td>
                    <td className="py-3 pr-3 text-right font-mono-tabular">{b.assessmentsCount}</td>
                    <td className="py-3 pr-3 text-right font-mono-tabular">{b.referralsCount}</td>
                    <td className="py-3 pr-3 text-xs text-slate-500 font-mono-tabular">
                      {formatThaiTimestamp(b.createdAt)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadJson(b.snapshotJson, `${b.id}.json`)}
                        className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md"
                      >
                        JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Mandatory Confirmation Dialog for Google Sheets mutation */}
      <ConfirmDialog
        open={confirmOpen}
        title={
          existingSpreadsheetId.trim()
            ? 'ยืนยันการอัปเดตข้อมูลทับใน Google Sheets'
            : 'ยืนยันการสร้างสเปรดชีต Google Sheets ใหม่'
        }
        description={
          existingSpreadsheetId.trim()
            ? `ระบบจะล้างและเขียนทับข้อมูลในแท็บ สรุปรายเดือน, ทะเบียนผู้สูงอายุ, ผลประเมิน_CGA และ ระบบส่งต่อ ของสเปรดชีต ID: ${existingSpreadsheetId.trim()}`
            : `ระบบจะสร้างไฟล์ Google Sheets ใหม่ชื่อ "รายงาน CGA คปสอ.ดอนพุด - ${monthLabel}" ในบัญชี Google ของท่าน`
        }
        items={[
          `ทะเบียนผู้สูงอายุ ${elders.length} ราย`,
          `ประวัติผลประเมิน CGA ${assessments.length} รายการ`,
          `รายการส่งต่อ ${referrals.length} เคส`,
          `สรุปตัวชี้วัดรายตำบล (4 ตำบล)`,
        ]}
        confirmLabel="ยืนยันส่งออกไปยัง Google Sheets"
        cancelLabel="ยกเลิก"
        busy={sheetExporting}
        onConfirm={executeGoogleSheetsExport}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
