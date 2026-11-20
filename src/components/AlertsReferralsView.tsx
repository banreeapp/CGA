import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  Send,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AlertItem,
  DON_PHUT_FACILITIES,
  Elder,
  FIELD_LIMITS,
  ReferralItem,
  ReferralStatus,
  ReferralUrgency,
  formatThaiTimestamp,
  referralStatusThai,
  sanitizeId,
  truncateStr,
} from '../types/cga';

interface AlertsReferralsViewProps {
  ownerId: string;
  userName: string;
  elders: Elder[];
  alerts: AlertItem[];
  referrals: ReferralItem[];
  onAcknowledgeAlert: (alert: AlertItem) => void;
  onSelectElder: (elder: Elder) => void;
}

export const AlertsReferralsView: React.FC<AlertsReferralsViewProps> = ({
  ownerId,
  elders,
  alerts,
  referrals,
  onAcknowledgeAlert,
  onSelectElder,
}) => {
  const [alertFilter, setAlertFilter] = useState<'unacked' | 'all'>('unacked');
  const [showNewReferral, setShowNewReferral] = useState(false);

  const [refElderId, setRefElderId] = useState(elders[0]?.id || '');
  const [toFacility, setToFacility] = useState<string>(DON_PHUT_FACILITIES[0]);
  const [urgency, setUrgency] = useState<ReferralUrgency>('urgent');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingRef, setSubmittingRef] = useState(false);

  const displayedAlerts = alertFilter === 'unacked' ? alerts.filter((a) => !a.acknowledged) : alerts;

  const handleAdvanceReferral = async (refItem: ReferralItem, nextStatus: ReferralStatus) => {
    const path = `referrals/${refItem.id}`;
    try {
      await updateDoc(doc(db, 'referrals', refItem.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetElder = elders.find((el) => el.id === refElderId) || elders[0];
    if (!targetElder || reason.trim().length < 2) return;

    setSubmittingRef(true);
    const referralId = sanitizeId(`ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
    try {
      await setDoc(doc(db, 'referrals', referralId), {
        ownerId,
        elderId: targetElder.id,
        elderName: targetElder.fullName,
        fromFacility: truncateStr(targetElder.facility, FIELD_LIMITS.FACILITY_MAX),
        toFacility: truncateStr(toFacility, FIELD_LIMITS.FACILITY_MAX),
        reason: truncateStr(reason, 600),
        urgency,
        status: 'pending',
        notes: truncateStr(notes || 'ส่งต่อผ่านศูนย์ประสานงาน คปสอ.ดอนพุด', FIELD_LIMITS.NOTES_MAX),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setReason('');
      setNotes('');
      setShowNewReferral(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `referrals/${referralId}`);
    } finally {
      setSubmittingRef(false);
    }
  };

  const nextStatusMap: Record<ReferralStatus, { next: ReferralStatus; label: string } | null> = {
    pending: { next: 'in_transit', label: 'เริ่มส่งตัวผู้ป่วย' },
    in_transit: { next: 'received', label: 'ยืนยันปลายทางรับตัว' },
    received: { next: 'completed', label: 'ปิดเคสส่งต่อเสร็จสิ้น' },
    completed: null,
  };

  return (
    <div className="space-y-6">
      {/* Abnormal Alerts Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              ศูนย์แจ้งเตือนอาการผิดปกติแบบเรียลไทม์
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              รวบรวมความผิดปกติจากการคัดกรอง CGA และรายงานอาการประจำวันจากครอบครัว/อสม.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setAlertFilter('unacked')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                alertFilter === 'unacked'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รอรับทราบ ({alerts.filter((a) => !a.acknowledged).length})
            </button>
            <button
              type="button"
              onClick={() => setAlertFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                alertFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({alerts.length})
            </button>
          </div>
        </div>

        {displayedAlerts.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            ไม่มีรายการแจ้งเตือนค้างรับทราบ
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedAlerts.map((alert) => {
              const linkedElder = elders.find((el) => el.id === alert.elderId);
              return (
                <div
                  key={alert.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          alert.severity === 'critical'
                            ? 'text-red-700'
                            : alert.severity === 'urgent'
                              ? 'text-amber-700'
                              : 'text-slate-700'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {alert.severity === 'critical'
                          ? 'วิกฤต'
                          : alert.severity === 'urgent'
                            ? 'เร่งด่วน'
                            : 'เฝ้าระวัง'}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-900">{alert.elderName}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-500">
                        {alert.source === 'family_checkin'
                          ? 'จากแอปครอบครัว/อสม.'
                          : alert.source === 'cga_screening'
                            ? 'จากคัดกรอง CGA'
                            : 'ระบบเฝ้าระวัง AI'}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-400 font-mono-tabular">
                        {formatThaiTimestamp(alert.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{alert.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {linkedElder && (
                      <button
                        type="button"
                        onClick={() => onSelectElder(linkedElder)}
                        className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        ดูแผนดูแล AI
                      </button>
                    )}
                    {alert.acknowledged ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
                        <CheckCircle2 className="w-4 h-4" />
                        รับทราบแล้ว {alert.acknowledgedBy ? `(${alert.acknowledgedBy})` : ''}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAcknowledgeAlert(alert)}
                        className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
                      >
                        รับทราบและดำเนินการ
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Referral Pipeline */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              ระบบส่งต่อผู้ป่วยระหว่าง รพ.สต. และ รพ.ดอนพุด
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามสถานะการส่งต่อแบบเรียลไทม์ พร้อมล็อกประวัติเมื่อปิดเคสเสร็จสิ้นเพื่อความปลอดภัยทางคลินิก
            </p>
          </div>
          {elders.length > 0 && (
            <button
              type="button"
              onClick={() => setShowNewReferral((v) => !v)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap self-start"
            >
              <Plus className="w-4 h-4" />
              เปิดใบส่งต่อใหม่
            </button>
          )}
        </div>

        {showNewReferral && elders.length > 0 && (
          <form
            onSubmit={handleCreateReferral}
            className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ผู้สูงอายุ</label>
                <select
                  value={refElderId}
                  onChange={(e) => setRefElderId(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {elders.map((el) => (
                    <option key={el.id} value={el.id}>
                      {el.fullName} ({el.facility})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  หน่วยบริการปลายทาง
                </label>
                <select
                  value={toFacility}
                  onChange={(e) => setToFacility(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
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
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as ReferralUrgency)}
                  className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="routine">ปกติ (Routine)</option>
                  <option value="urgent">เร่งด่วน (Urgent)</option>
                  <option value="emergency">ฉุกเฉิน (Emergency)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  อาการสำคัญ / เหตุผลการส่งต่อ *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="เช่น ความดันสูงวิกฤต หรือประเมิน LTC"
                  className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ข้อมูลยาที่นำติดตัว / ผู้ประสานงาน"
                  className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewReferral(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submittingRef}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingRef ? 'กำลังบันทึก...' : 'ส่งใบส่งต่อ'}
              </button>
            </div>
          </form>
        )}

        {referrals.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            ยังไม่มีรายการส่งต่อผู้ป่วยในระบบ
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 pr-3 font-medium">ผู้สูงอายุ</th>
                  <th className="py-2.5 pr-3 font-medium">เส้นทางส่งต่อ</th>
                  <th className="py-2.5 pr-3 font-medium">เหตุผล / ความเร่งด่วน</th>
                  <th className="py-2.5 pr-3 font-medium">สถานะปัจจุบัน</th>
                  <th className="py-2.5 text-right font-medium">อัปเดตขั้นตอน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((refItem) => {
                  const transition = nextStatusMap[refItem.status];
                  return (
                    <tr key={refItem.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900">{refItem.elderName}</div>
                        <div className="text-xs text-slate-400 font-mono-tabular">
                          {formatThaiTimestamp(refItem.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-700">
                        <span>{refItem.fromFacility}</span>
                        <ArrowRight className="w-3 h-3 inline mx-1.5 text-slate-400" />
                        <span className="font-medium text-slate-900">{refItem.toFacility}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="text-xs text-slate-800">{refItem.reason}</div>
                        <div className="text-xs mt-0.5">
                          <span
                            className={
                              refItem.urgency === 'emergency'
                                ? 'text-red-700 font-semibold'
                                : refItem.urgency === 'urgent'
                                  ? 'text-amber-700 font-medium'
                                  : 'text-slate-500'
                            }
                          >
                            {refItem.urgency === 'emergency'
                              ? 'ฉุกเฉิน'
                              : refItem.urgency === 'urgent'
                                ? 'เร่งด่วน'
                                : 'ปกติ'}
                          </span>
                          {refItem.notes && (
                            <span className="text-slate-400"> · {refItem.notes}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            refItem.status === 'completed'
                              ? 'text-emerald-700'
                              : refItem.status === 'pending'
                                ? 'text-amber-700'
                                : 'text-teal-700'
                          }`}
                        >
                          {refItem.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {referralStatusThai(refItem.status)}
                        </span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        {transition ? (
                          <button
                            type="button"
                            onClick={() => handleAdvanceReferral(refItem, transition.next)}
                            className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap"
                          >
                            {transition.label}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Lock className="w-3.5 h-3.5" />
                            ปิดเคสแล้ว
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
