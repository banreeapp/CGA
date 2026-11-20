export type SubDistrict = 'ดอนพุด' | 'ไผ่หลิ่ว' | 'บ้านหลวง' | 'ดงตะงาว';
export type AdlGroup = 'ติดสังคม' | 'ติดบ้าน' | 'ติดเตียง';
export type RiskLevel = 'normal' | 'watch' | 'high' | 'critical';
export type AlertSeverity = 'warning' | 'urgent' | 'critical';
export type ReferralStatus = 'pending' | 'in_transit' | 'received' | 'completed';
export type ReferralUrgency = 'routine' | 'urgent' | 'emergency';
export type UserRole = 'officer' | 'family' | 'admin';

export const SUB_DISTRICTS: SubDistrict[] = ['ดอนพุด', 'ไผ่หลิ่ว', 'บ้านหลวง', 'ดงตะงาว'];

export const DON_PHUT_FACILITIES = [
  'รพ.ดอนพุด (โรงพยาบาลแม่ข่าย)',
  'รพ.สต.ดอนพุด',
  'รพ.สต.ไผ่หลิ่ว',
  'รพ.สต.บ้านหลวง',
  'รพ.สต.ดงตะงาว',
  'ศูนย์ดูแลผู้สูงอายุ คปสอ.ดอนพุด (LTC)',
] as const;

export const CHRONIC_DISEASE_OPTIONS = [
  'ความดันโลหิตสูง (HT)',
  'เบาหวาน (DM)',
  'ไขมันในเลือดสูง',
  'โรคหลอดเลือดสมอง (Stroke)',
  'โรคไตเรื้อรัง (CKD)',
  'โรคหัวใจ',
  'ข้อเข่าเสื่อม',
  'ปอดอุดกั้นเรื้อรัง (COPD)',
] as const;

export const FIELD_LIMITS = {
  ID_MAX: 128,
  NAME_MAX: 120,
  HN_MAX: 32,
  FACILITY_MAX: 120,
  VILLAGE_MAX: 64,
  DISEASES_MAX: 10,
  FLAGS_MAX: 12,
  AI_SUMMARY_MAX: 4000,
  AI_PLAN_MAX: 6000,
  NOTES_MAX: 1000,
  SYMPTOM_MAX: 500,
  PHONE_MAX: 32,
  ADDRESS_MAX: 240,
} as const;

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  facility: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Elder {
  id: string;
  ownerId: string;
  hn: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  village: string;
  subDistrict: SubDistrict;
  facility: string;
  chronicDiseases: string[];
  medicationsCount: number;
  adlScore: number;
  adlGroup: AdlGroup;
  riskLevel: RiskLevel;
  latestAlertStatus: 'none' | 'active' | 'acknowledged';
  aiCarePlanSummary?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ElderPrivateContact {
  ownerId: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  updatedAt?: unknown;
}

export type EducationLevel = 'illiterate' | 'primary' | 'secondary_plus';

export interface CgaFullDetail {
  educationLevel: EducationLevel;
  weightKg: number;
  heightCm: number;
  otherChronicNote?: string;
  adlAnswers: number[];
  miniCogRecall: number;
  miniCogClock: number;
  q2Items: [boolean, boolean];
  kneePain: boolean;
  kneeCriteria: boolean[];
  frailItems: boolean[];
  mnaAnswers: number[];
  oralAbnormal: boolean;
  visionAbnormal: boolean;
  hearingAbnormal: boolean;
  incontinenceAbnormal: boolean;
  sleepAbnormal: boolean;
  medicationNotes?: string;
  zbiEnabled: boolean;
  zbiAnswers: number[];
  zbiScore: number | null;
  deepMmseEnabled: boolean;
  mmseScore: number | null;
  mmseCutoff: number;
  deepTgdsEnabled: boolean;
  tgdsScore: number | null;
  deepFratEnabled: boolean;
  thaiFratScore: number | null;
  deepSarcEnabled: boolean;
  sarcFScore: number | null;
  calfCm: number | null;
  careNoteSummary?: string;
}

export interface Assessment {
  id: string;
  ownerId: string;
  elderId: string;
  elderName: string;
  assessorName: string;
  facility: string;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  spo2: number;
  fbs: number;
  bmi: number;
  adlScore: number;
  adlGroup: AdlGroup;
  depress2Q: number;
  cogMiniCog: number;
  tugtSeconds: number;
  fallRisk: boolean;
  polypharmacy: boolean;
  riskLevel: RiskLevel;
  abnormalFlags: string[];
  aiCarePlan?: string;
  cgaDetailJson?: string;
  status: 'completed' | 'referred' | 'follow_up';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AlertItem {
  id: string;
  ownerId: string;
  elderId: string;
  elderName: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  source: 'cga_screening' | 'family_checkin' | 'ai_monitor';
  acknowledged: boolean;
  acknowledgedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReferralItem {
  id: string;
  ownerId: string;
  elderId: string;
  elderName: string;
  fromFacility: string;
  toFacility: string;
  reason: string;
  urgency: ReferralUrgency;
  status: ReferralStatus;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CareLogItem {
  id: string;
  ownerId: string;
  elderId: string;
  elderName: string;
  loggedBy: string;
  bpSystolic: number;
  bpDiastolic: number;
  mood: 'สดชื่น' | 'ปกติ' | 'อ่อนเพลีย' | 'ซึม/สับสน';
  appetite: 'ทานได้ดี' | 'ทานได้น้อย' | 'เบื่ออาหาร';
  medicationTaken: boolean;
  symptomNote?: string;
  hasAbnormal: boolean;
  createdAt?: unknown;
}

export interface BackupRecord {
  id: string;
  ownerId: string;
  label: string;
  eldersCount: number;
  assessmentsCount: number;
  referralsCount: number;
  snapshotJson: string;
  googleSheetUrl?: string;
  createdAt?: unknown;
}

export interface AiCarePlanStructured {
  riskSummary: string;
  officerPlan: string[];
  familyGuide: string[];
  redFlags: string[];
  recommendedReferral: boolean;
  suggestedFacility: string;
  referralReason: string;
}

export interface AiMonthlySummary {
  executiveSummary: string;
  keyHighlights: string[];
  actionRecommendations: string[];
}

export function computeAdlGroup(score: number): AdlGroup {
  if (score >= 12) return 'ติดสังคม';
  if (score >= 5) return 'ติดบ้าน';
  return 'ติดเตียง';
}

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, FIELD_LIMITS.ID_MAX);
  return cleaned || `id-${Date.now()}`;
}

export function truncateStr(val: string, max: number): string {
  return val.trim().slice(0, max);
}

export interface VitalScreeningEvaluation {
  abnormalFlags: string[];
  riskLevel: RiskLevel;
  fallRisk: boolean;
  alertSeverity: AlertSeverity | null;
}

export function evaluateCgaRisk(input: {
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  spo2: number;
  fbs: number;
  adlScore: number;
  depress2Q: number;
  cogMiniCog: number;
  tugtSeconds: number;
  medicationsCount: number;
}): VitalScreeningEvaluation {
  const flags: string[] = [];
  let criticalCount = 0;
  let highCount = 0;

  if (input.bpSystolic >= 180 || input.bpDiastolic >= 110) {
    flags.push(`ความดันวิกฤตสูง (${input.bpSystolic}/${input.bpDiastolic} mmHg)`);
    criticalCount += 1;
  } else if (input.bpSystolic >= 160 || input.bpDiastolic >= 100) {
    flags.push(`ความดันโลหิตสูงระดับ 2 (${input.bpSystolic}/${input.bpDiastolic} mmHg)`);
    highCount += 1;
  } else if (input.bpSystolic < 90 || input.bpDiastolic < 60) {
    flags.push(`ความดันโลหิตต่ำ (${input.bpSystolic}/${input.bpDiastolic} mmHg)`);
    criticalCount += 1;
  }

  if (input.spo2 < 92) {
    flags.push(`ค่าออกซิเจนปลายนิ้วต่ำมาก (SpO2 ${input.spo2}%)`);
    criticalCount += 1;
  } else if (input.spo2 < 95) {
    flags.push(`ค่าออกซิเจนปลายนิ้วเฝ้าระวัง (SpO2 ${input.spo2}%)`);
    highCount += 1;
  }

  if (input.heartRate > 110 || input.heartRate < 50) {
    flags.push(`ชีพจรผิดปกติ (${input.heartRate} ครั้ง/นาที)`);
    highCount += 1;
  }

  if (input.fbs >= 250 || input.fbs < 70) {
    flags.push(`ระดับน้ำตาลในเลือดผิดปกติรุนแรง (${input.fbs} mg/dL)`);
    criticalCount += 1;
  } else if (input.fbs >= 180) {
    flags.push(`ระดับน้ำตาลในเลือดสูง (${input.fbs} mg/dL)`);
    highCount += 1;
  }

  const fallRisk = input.tugtSeconds >= 13.5 || input.adlScore <= 11;
  if (input.tugtSeconds >= 20) {
    flags.push(`ความเสี่ยงพลัดตกหกล้มสูง (TUGT ${input.tugtSeconds} วินาที)`);
    highCount += 1;
  } else if (input.tugtSeconds >= 13.5) {
    flags.push(`การทรงตัวช้ากว่าเกณฑ์ เสี่ยงหกล้ม (TUGT ${input.tugtSeconds} วินาที)`);
  }

  if (input.depress2Q >= 1) {
    flags.push(`คัดกรอง 2Q พบความเสี่ยงภาวะซึมเศร้า (${input.depress2Q}/2 ข้อ)`);
    highCount += 1;
  }

  if (input.cogMiniCog <= 2) {
    flags.push(`คัดกรอง Mini-Cog ต่ำกว่าเกณฑ์ (${input.cogMiniCog}/5 คะแนน)`);
    highCount += 1;
  }

  if (input.adlScore <= 4) {
    flags.push(`กลุ่มติดเตียง (Barthel ADL ${input.adlScore}/20)`);
    highCount += 1;
  }

  if (input.medicationsCount >= 5) {
    flags.push(`ใช้ยาหลายขนาน Polypharmacy (${input.medicationsCount} รายการ)`);
  }

  let riskLevel: RiskLevel = 'normal';
  let alertSeverity: AlertSeverity | null = null;
  if (criticalCount > 0) {
    riskLevel = 'critical';
    alertSeverity = 'critical';
  } else if (highCount >= 2) {
    riskLevel = 'high';
    alertSeverity = 'urgent';
  } else if (highCount === 1 || flags.length >= 2) {
    riskLevel = 'watch';
    alertSeverity = 'warning';
  }

  return {
    abnormalFlags: flags.slice(0, FIELD_LIMITS.FLAGS_MAX),
    riskLevel,
    fallRisk,
    alertSeverity,
  };
}

export function formatThaiTimestamp(ts: unknown): string {
  if (!ts) return 'เพิ่งบันทึก';
  try {
    if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate().toLocaleString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (typeof ts === 'string' || typeof ts === 'number') {
      return new Date(ts).toLocaleString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    return 'ไม่ระบุเวลา';
  }
  return 'เพิ่งบันทึก';
}

export function riskLabelThai(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'วิกฤต (ส่งต่อด่วน)';
    case 'high':
      return 'ความเสี่ยงสูง';
    case 'watch':
      return 'เฝ้าระวัง';
    default:
      return 'ปกติ';
  }
}

export function referralStatusThai(status: ReferralStatus): string {
  switch (status) {
    case 'pending':
      return 'รอประสานส่งต่อ';
    case 'in_transit':
      return 'กำลังส่งต่อ';
    case 'received':
      return 'ปลายทางรับตัวแล้ว';
    case 'completed':
      return 'เสร็จสิ้นการส่งต่อ';
  }
}
