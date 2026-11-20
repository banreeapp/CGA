import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardPlus,
  Database,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AdlGroup,
  AlertItem,
  Assessment,
  Elder,
  ReferralItem,
  RiskLevel,
  SUB_DISTRICTS,
  SubDistrict,
  formatThaiTimestamp,
  riskLabelThai,
} from '../types/cga';

interface DashboardViewProps {
  elders: Elder[];
  assessments: Assessment[];
  alerts: AlertItem[];
  referrals: ReferralItem[];
  loading: boolean;
  seeding: boolean;
  onSeedSampleData: () => void;
  onStartScreening: (elderId?: string) => void;
  onSelectElder: (elder: Elder) => void;
  onAcknowledgeAlert: (alert: AlertItem) => void;
  onNavigateTab: (tab: 'overview' | 'screening' | 'alerts' | 'family' | 'reports') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  elders,
  assessments,
  alerts,
  referrals,
  loading,
  seeding,
  onSeedSampleData,
  onStartScreening,
  onSelectElder,
  onAcknowledgeAlert,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [subDistrictFilter, setSubDistrictFilter] = useState<SubDistrict | 'ทั้งหมด'>('ทั้งหมด');
  const [adlFilter, setAdlFilter] = useState<AdlGroup | 'ทั้งหมด'>('ทั้งหมด');

  const stats = useMemo(() => {
    const socialCount = elders.filter((e) => e.adlGroup === 'ติดสังคม').length;
    const homeboundCount = elders.filter((e) => e.adlGroup === 'ติดบ้าน').length;
    const bedriddenCount = elders.filter((e) => e.adlGroup === 'ติดเตียง').length;
    const activeAlerts = alerts.filter((a) => !a.acknowledged);
    const pendingReferrals = referrals.filter((r) => r.status !== 'completed');

    const bySubDistrict = SUB_DISTRICTS.map((sd) => {
      const list = elders.filter((e) => e.subDistrict === sd);
      return {
        subDistrict: sd,
        total: list.length,
        social: list.filter((e) => e.adlGroup === 'ติดสังคม').length,
        homebound: list.filter((e) => e.adlGroup === 'ติดบ้าน').length,
        bedridden: list.filter((e) => e.adlGroup === 'ติดเตียง').length,
        highRisk: list.filter((e) => e.riskLevel === 'high' || e.riskLevel === 'critical').length,
      };
    });

    return {
      totalElders: elders.length,
      totalAssessments: assessments.length,
      socialCount,
      homeboundCount,
      bedriddenCount,
      activeAlerts,
      pendingReferrals,
      bySubDistrict,
    };
  }, [elders, assessments, alerts, referrals]);

  const filteredElders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return elders.filter((e) => {
      if (subDistrictFilter !== 'ทั้งหมด' && e.subDistrict !== subDistrictFilter) return false;
      if (adlFilter !== 'ทั้งหมด' && e.adlGroup !== adlFilter) return false;
      if (!q) return true;
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.hn.toLowerCase().includes(q) ||
        e.village.toLowerCase().includes(q) ||
        e.facility.toLowerCase().includes(q)
      );
    });
  }, [elders, searchQuery, subDistrictFilter, adlFilter]);

  const riskBadgeTextClass = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return 'text-red-700 font-semibold';
      case 'high':
        return 'text-amber-700 font-semibold';
      case 'watch':
        return 'text-amber-600 font-medium';
      default:
        return 'text-emerald-700 font-medium';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (elders.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 lg:p-12">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-teal-700 tracking-wide">
            เครือข่ายบริการสุขภาพอำเภอดอนพุด · จังหวัดสระบุรี
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 text-balance">
            เริ่มต้นระบบประเมินผู้สูงอายุแบบครบวงจร (CGA) คปสอ.ดอนพุด
          </h2>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            ฐานข้อมูล Cloud เชื่อมต่อพร้อมใช้งานแล้ว ท่านสามารถบันทึกการคัดกรองผู้สูงอายุรายแรกได้ทันที หรือนำเข้าชุดข้อมูลตัวอย่างของ คปสอ.ดอนพุด (5 ราย ครอบคลุม 4 ตำบล พร้อมผลการประเมิน CGA, แจ้งเตือนอาการผิดปกติ และใบส่งต่อ) เพื่อทดลองระบบแดชบอร์ดและ Google Sheets
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onStartScreening()}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <ClipboardPlus className="w-4 h-4" />
              คัดกรองผู้สูงอายุรายแรก
            </button>
            <button
              type="button"
              onClick={onSeedSampleData}
              disabled={seeding}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              <Database className="w-4 h-4" />
              {seeding ? 'กำลังนำเข้าข้อมูลตัวอย่าง...' : 'นำเข้าข้อมูลตัวอย่าง คปสอ.ดอนพุด (5 ราย)'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <section aria-label="สรุปตัวชี้วัดสุขภาพผู้สูงอายุ" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ผู้สูงอายุในทะเบียน</span>
            <Users className="w-4 h-4 text-teal-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono-tabular">
              {stats.totalElders}
            </span>
            <span className="text-xs text-slate-500">ราย · 4 ตำบล</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            ติดสังคม {stats.socialCount} · ติดบ้าน {stats.homeboundCount} · ติดเตียง {stats.bedriddenCount}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>คัดกรอง CGA สะสม</span>
            <Activity className="w-4 h-4 text-teal-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono-tabular">
              {stats.totalAssessments}
            </span>
            <span className="text-xs text-slate-500">ครั้ง</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">ซิงก์ฐานข้อมูล Cloud แบบเรียลไทม์</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>แจ้งเตือนอาการผิดปกติ</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-700 font-mono-tabular">
              {stats.activeAlerts.length}
            </span>
            <span className="text-xs text-slate-500">รายการรอรับทราบ</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('alerts')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900"
          >
            จัดการแจ้งเตือน
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>การส่งต่อรพ.สต. / รพ.แม่ข่าย</span>
            <Send className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono-tabular">
              {stats.pendingReferrals.length}
            </span>
            <span className="text-xs text-slate-500">เคสกำลังดำเนินการ</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('alerts')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-900"
          >
            ติดตามสถานะส่งต่อ
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Split Workspace: Real-time Alerts + Sub-district Coverage */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Alerts Queue */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                แจ้งเตือนอาการผิดปกติล่าสุด (Real-time Alerts)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                สัญญาณเตือนอัตโนมัติจากการคัดกรอง CGA และการรายงานจากครอบครัว
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('alerts')}
              className="text-xs font-medium text-teal-700 hover:text-teal-900 whitespace-nowrap shrink-0"
            >
              ดูทั้งหมด ({alerts.length})
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              ไม่มีแจ้งเตือนอาการผิดปกติในขณะนี้
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          alert.severity === 'critical'
                            ? 'text-red-700'
                            : alert.severity === 'urgent'
                              ? 'text-amber-700'
                              : 'text-slate-700'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {alert.severity === 'critical'
                          ? 'วิกฤตเร่งด่วน'
                          : alert.severity === 'urgent'
                            ? 'เฝ้าระวังสูง'
                            : 'แจ้งเตือน'}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-medium text-slate-800 truncate">{alert.elderName}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-400 font-mono-tabular whitespace-nowrap">
                        {formatThaiTimestamp(alert.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{alert.description}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {alert.acknowledged ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        รับทราบแล้ว
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAcknowledgeAlert(alert)}
                        className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap"
                      >
                        รับทราบเคส
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sub-District Breakdown */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              สรุปความครอบคลุมรายตำบล (คปสอ.ดอนพุด)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              จำแนกกลุ่มศักยภาพ Barthel ADL และผู้มีภาวะเสี่ยงสูง
            </p>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="py-2 font-medium">ตำบล</th>
                  <th className="py-2 text-right font-medium">รวม</th>
                  <th className="py-2 text-right font-medium">ติดสังคม</th>
                  <th className="py-2 text-right font-medium">ติดบ้าน</th>
                  <th className="py-2 text-right font-medium">ติดเตียง</th>
                  <th className="py-2 text-right font-medium">เสี่ยงสูง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.bySubDistrict.map((row) => (
                  <tr key={row.subDistrict} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-800">ต.{row.subDistrict}</td>
                    <td className="py-2.5 text-right font-mono-tabular text-slate-900 font-semibold">
                      {row.total}
                    </td>
                    <td className="py-2.5 text-right font-mono-tabular text-emerald-700">
                      {row.social}
                    </td>
                    <td className="py-2.5 text-right font-mono-tabular text-amber-700">
                      {row.homebound}
                    </td>
                    <td className="py-2.5 text-right font-mono-tabular text-red-700">
                      {row.bedridden}
                    </td>
                    <td className="py-2.5 text-right font-mono-tabular text-slate-700">
                      {row.highRisk}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>เกณฑ์ Barthel ADL: ≥12 ติดสังคม · 5–11 ติดบ้าน · ≤4 ติดเตียง</span>
          </div>
        </div>
      </section>

      {/* Elderly Registry Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              ทะเบียนติดตามสุขภาพผู้สูงอายุ คปสอ.ดอนพุด
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกรายชื่อเพื่อดูแผนการดูแลรายบุคคลจาก AI ประวัติการคัดกรอง และสั่งส่งต่อ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, HN, หมู่บ้าน..."
                className="min-h-[40px] pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
              />
            </div>
            <select
              value={subDistrictFilter}
              onChange={(e) => setSubDistrictFilter(e.target.value as SubDistrict | 'ทั้งหมด')}
              aria-label="กรองตามตำบล"
              className="min-h-[40px] px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-teal-600"
            >
              <option value="ทั้งหมด">ทุกตำบล</option>
              {SUB_DISTRICTS.map((sd) => (
                <option key={sd} value={sd}>
                  ต.{sd}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['ทั้งหมด', 'ติดสังคม', 'ติดบ้าน', 'ติดเตียง'] as const).map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setAdlFilter(group)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    adlFilter === group
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="py-3 pr-3 font-medium">HN</th>
                <th className="py-3 pr-3 font-medium">ชื่อ-สกุล / พื้นที่</th>
                <th className="py-3 pr-3 text-right font-medium">อายุ</th>
                <th className="py-3 pr-3 font-medium">กลุ่ม ADL</th>
                <th className="py-3 pr-3 font-medium">โรคประจำตัว</th>
                <th className="py-3 pr-3 font-medium">ระดับความเสี่ยง</th>
                <th className="py-3 text-right font-medium">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredElders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    ไม่พบรายชื่อผู้สูงอายุที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredElders.map((elder) => (
                  <tr
                    key={elder.id}
                    onClick={() => onSelectElder(elder)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-3 font-mono-tabular text-xs text-slate-600 whitespace-nowrap">
                      {elder.hn}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium text-slate-900">{elder.fullName}</div>
                      <div className="text-xs text-slate-500">
                        {elder.village} · ต.{elder.subDistrict} · {elder.facility}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                      {elder.age} ปี
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span className="text-slate-800 font-medium">{elder.adlGroup}</span>
                      <span className="text-xs text-slate-400 font-mono-tabular ml-1.5">
                        ({elder.adlScore}/20)
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-slate-600 max-w-xs truncate">
                      {elder.chronicDiseases.length > 0
                        ? elder.chronicDiseases.join(' · ')
                        : 'ไม่มีประวัติโรคเรื้อรัง'}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span className={`text-xs ${riskBadgeTextClass(elder.riskLevel)}`}>
                        {riskLabelThai(elder.riskLevel)}
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectElder(elder)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                        >
                          แผนดูแล AI
                        </button>
                        <button
                          type="button"
                          onClick={() => onStartScreening(elder.id)}
                          className="px-2.5 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap"
                        >
                          ประเมินซ้ำ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
