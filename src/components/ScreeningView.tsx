import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Play,
  RotateCcw,
  Square,
  UserPlus,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  BARTHEL_ADL_QUESTIONS,
  EDUCATION_MMSE_INFO,
  FRAIL_SCALE_QUESTIONS,
  KNEE_OA_CRITERIA,
  MMSE_THAI_DOMAINS,
  MNA_SF_QUESTIONS,
  SARC_F_QUESTIONS,
  TGDS_15_QUESTIONS,
  THAI_FRAT_ITEMS,
  ZBI_12_QUESTIONS,
  ZBI_OPTIONS,
  bmiToMnaScore,
} from '../data/cgaInstruments';
import {
  AiCarePlanStructured,
  Assessment,
  CHRONIC_DISEASE_OPTIONS,
  CgaFullDetail,
  DON_PHUT_FACILITIES,
  EducationLevel,
  Elder,
  FIELD_LIMITS,
  ReferralItem,
  SUB_DISTRICTS,
  SubDistrict,
  computeAdlGroup,
  evaluateCgaRisk,
  referralStatusThai,
  riskLabelThai,
  sanitizeId,
  truncateStr,
} from '../types/cga';
import { ConfirmDialog } from './ConfirmDialog';
import { ScreeningDeepStep } from './ScreeningDeepStep';
import { ScreeningSummaryStep, SummaryTableRow } from './ScreeningSummaryStep';

type WizardStep = 1 | 2 | 3 | 4;

interface ScreeningViewProps {
  ownerId: string;
  assessorName: string;
  elders: Elder[];
  assessments: Assessment[];
  referrals: ReferralItem[];
  preselectedElderId?: string;
  accessToken: string | null;
  onRequestGoogleAuth: () => Promise<void>;
  onComplete: (savedElderId: string) => void;
}

export const ScreeningView: React.FC<ScreeningViewProps> = ({
  ownerId,
  assessorName: defaultAssessor,
  elders,
  assessments,
  referrals,
  preselectedElderId,
  accessToken,
  onRequestGoogleAuth,
  onComplete,
}) => {
  const [step, setStep] = useState<WizardStep>(1);
  const [mode, setMode] = useState<'existing' | 'new'>(
    preselectedElderId ? 'existing' : 'new',
  );
  const [selectedElderId, setSelectedElderId] = useState<string>(
    preselectedElderId || elders[0]?.id || '',
  );

  // Step 1: Demographics & Vitals
  const [hn, setHn] = useState(`DP-${Math.floor(6810 + Math.random() * 890)}`);
  const [fullName, setFullName] = useState('');
  const [assessorName, setAssessorName] = useState(defaultAssessor || '');
  const [age, setAge] = useState<number>(68);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [village, setVillage] = useState('');
  const [subDistrict, setSubDistrict] = useState<SubDistrict>('ดอนพุด');
  const [facility, setFacility] = useState<string>('รพ.สต.ดอนพุด');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>('primary');
  const [chronicDiseases, setChronicDiseases] = useState<string[]>([]);
  const [noChronic, setNoChronic] = useState(false);
  const [otherChronicNote, setOtherChronicNote] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [bpSystolic, setBpSystolic] = useState<number>(128);
  const [bpDiastolic, setBpDiastolic] = useState<number>(78);
  const [heartRate, setHeartRate] = useState<number>(76);
  const [spo2, setSpo2] = useState<number>(98);
  const [fbs, setFbs] = useState<number>(105);
  const [weightKg, setWeightKg] = useState<number>(60.5);
  const [heightCm, setHeightCm] = useState<number>(160);

  // Step 2: 9 CGA Domains + Medication + ZBI-12
  const [adlAnswers, setAdlAnswers] = useState<number[]>(() =>
    BARTHEL_ADL_QUESTIONS.map((q) => q.options[0].score),
  );
  const [miniCogRecall, setMiniCogRecall] = useState<number>(3);
  const [miniCogClock, setMiniCogClock] = useState<number>(2);
  const [q2Items, setQ2Items] = useState<[boolean, boolean]>([false, false]);

  // TUGT Stopwatch
  const [tugtSeconds, setTugtSeconds] = useState<number>(0);
  const [tugtRunning, setTugtRunning] = useState(false);
  const tugtIntervalRef = useRef<number | null>(null);
  const tugtStartRef = useRef<number>(0);

  const [kneePain, setKneePain] = useState(false);
  const [kneeCriteria, setKneeCriteria] = useState<boolean[]>(() =>
    KNEE_OA_CRITERIA.map(() => false),
  );
  const [frailItems, setFrailItems] = useState<boolean[]>(() =>
    FRAIL_SCALE_QUESTIONS.map(() => false),
  );

  const [mnaAnswers, setMnaAnswers] = useState<number[]>(() =>
    MNA_SF_QUESTIONS.map((q) => q.options[0].score),
  );
  const [mnaBmiManual, setMnaBmiManual] = useState(false);

  const [oralAbnormal, setOralAbnormal] = useState(false);
  const [visionAbnormal, setVisionAbnormal] = useState(false);
  const [hearingAbnormal, setHearingAbnormal] = useState(false);
  const [incontinenceAbnormal, setIncontinenceAbnormal] = useState(false);
  const [sleepAbnormal, setSleepAbnormal] = useState(false);

  const [medicationsCount, setMedicationsCount] = useState<number>(0);
  const [medicationNotes, setMedicationNotes] = useState('');

  const [zbiEnabled, setZbiEnabled] = useState(false);
  const [zbiAnswers, setZbiAnswers] = useState<number[]>(() =>
    ZBI_12_QUESTIONS.map(() => 0),
  );

  // Step 3: 4 Deep Assessments
  const [deepMmseEnabled, setDeepMmseEnabled] = useState(false);
  const [mmseScores, setMmseScores] = useState<number[]>(() =>
    MMSE_THAI_DOMAINS.map((d) => d.max),
  );
  const [deepTgdsEnabled, setDeepTgdsEnabled] = useState(false);
  const [tgdsAnswers, setTgdsAnswers] = useState<('yes' | 'no')[]>(() =>
    TGDS_15_QUESTIONS.map((q) => (q.positiveAnswer === 'yes' ? 'no' : 'yes')),
  );
  const [deepFratEnabled, setDeepFratEnabled] = useState(false);
  const [fratChecks, setFratChecks] = useState<boolean[]>(() =>
    THAI_FRAT_ITEMS.map(() => false),
  );
  const [deepSarcEnabled, setDeepSarcEnabled] = useState(false);
  const [sarcAnswers, setSarcAnswers] = useState<number[]>(() =>
    SARC_F_QUESTIONS.map(() => 0),
  );
  const [calfCm, setCalfCm] = useState<number>(34);

  // Step 4: Summary, AI, Referral, Save, Sheets Export
  const [careNoteSummary, setCareNoteSummary] = useState('');
  const [careNoteEdited, setCareNoteEdited] = useState(false);
  const [aiPlan, setAiPlan] = useState<AiCarePlanStructured | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [createReferral, setCreateReferral] = useState(false);
  const [referralTarget, setReferralTarget] = useState('รพ.ดอนพุด (โรงพยาบาลแม่ข่าย)');
  const [referralUrgency, setReferralUrgency] = useState<'routine' | 'urgent' | 'emergency'>('urgent');
  const [referralReason, setReferralReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [sheetsConfirmOpen, setSheetsConfirmOpen] = useState(false);
  const [sheetsBusy, setSheetsBusy] = useState(false);
  const [sheetsResult, setSheetsResult] = useState<{ spreadsheetUrl: string; updatedCells: number } | null>(null);

  useEffect(() => {
    if (preselectedElderId) {
      setMode('existing');
      setSelectedElderId(preselectedElderId);
    }
  }, [preselectedElderId]);

  const activeElder = useMemo(() => {
    if (mode === 'existing') {
      return elders.find((e) => e.id === selectedElderId) || elders[0] || null;
    }
    return null;
  }, [mode, elders, selectedElderId]);

  useEffect(() => {
    if (mode === 'existing' && activeElder) {
      setAge(activeElder.age);
      setGender(activeElder.gender);
      setVillage(activeElder.village);
      setSubDistrict(activeElder.subDistrict);
      setFacility(activeElder.facility);
      setMedicationsCount(activeElder.medicationsCount);
      setChronicDiseases(activeElder.chronicDiseases);
      setNoChronic(activeElder.chronicDiseases.length === 0);
    }
  }, [mode, activeElder]);

  // Live BMI & MNA-SF item 6 sync
  const bmi = useMemo(() => {
    if (weightKg <= 0 || heightCm <= 0) return 0;
    const hMeters = heightCm / 100;
    return Number((weightKg / (hMeters * hMeters)).toFixed(1));
  }, [weightKg, heightCm]);

  useEffect(() => {
    if (!mnaBmiManual && bmi > 0) {
      setMnaAnswers((prev) => {
        const next = [...prev];
        next[5] = bmiToMnaScore(bmi);
        return next;
      });
    }
  }, [bmi, mnaBmiManual]);

  // Cleanup stopwatch interval on unmount
  useEffect(() => {
    return () => {
      if (tugtIntervalRef.current !== null) {
        window.clearInterval(tugtIntervalRef.current);
      }
    };
  }, []);

  const startStopwatch = () => {
    if (tugtRunning) return;
    setTugtRunning(true);
    tugtStartRef.current = performance.now() - tugtSeconds * 1000;
    tugtIntervalRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - tugtStartRef.current) / 1000;
      setTugtSeconds(Number(elapsed.toFixed(1)));
    }, 100);
  };

  const stopStopwatch = () => {
    if (tugtIntervalRef.current !== null) {
      window.clearInterval(tugtIntervalRef.current);
      tugtIntervalRef.current = null;
    }
    setTugtRunning(false);
  };

  const resetStopwatch = () => {
    stopStopwatch();
    setTugtSeconds(0);
  };

  // Computed scores across 9 domains
  const adlScore = adlAnswers.reduce((sum, v) => sum + v, 0);
  const adlGroup = computeAdlGroup(adlScore);
  const miniCogScore = miniCogRecall + miniCogClock;
  const depress2Q = (q2Items[0] ? 1 : 0) + (q2Items[1] ? 1 : 0);
  const kneePositiveCount = kneeCriteria.filter(Boolean).length;
  const kneeAbnormal = kneePain && kneePositiveCount >= 2;
  const frailScore = frailItems.filter(Boolean).length;
  const mnaScore = mnaAnswers.reduce((sum, v) => sum + v, 0);
  const zbiScore = zbiEnabled ? zbiAnswers.reduce((sum, v) => sum + v, 0) : null;

  // Deep assessment scores
  const eduInfo = EDUCATION_MMSE_INFO[educationLevel];
  const mmseTotal = MMSE_THAI_DOMAINS.reduce((sum, dom, idx) => {
    if (educationLevel === 'illiterate' && dom.requiresLiteracy) return sum;
    return sum + (mmseScores[idx] ?? 0);
  }, 0);
  const tgdsTotal = TGDS_15_QUESTIONS.reduce(
    (sum, q, idx) => sum + (tgdsAnswers[idx] === q.positiveAnswer ? 1 : 0),
    0,
  );
  const fratTotal = THAI_FRAT_ITEMS.reduce(
    (sum, item, idx) => sum + (fratChecks[idx] ? item.weight : 0),
    0,
  );
  const sarcTotal = sarcAnswers.reduce((sum, v) => sum + v, 0);

  // Indications for Step 3
  const indications = useMemo(
    () => ({
      mmse: miniCogScore <= 2,
      tgds: depress2Q >= 1,
      frat: tugtSeconds >= 12 || adlScore <= 11,
      sarc: frailScore >= 1 || mnaScore <= 11,
    }),
    [miniCogScore, depress2Q, tugtSeconds, adlScore, frailScore, mnaScore],
  );

  // Auto-enable deep modules when entering Step 3 if indicated
  const handleGoToStep3 = () => {
    if (indications.mmse) setDeepMmseEnabled(true);
    if (indications.tgds) setDeepTgdsEnabled(true);
    if (indications.frat) setDeepFratEnabled(true);
    if (indications.sarc) setDeepSarcEnabled(true);
    setStep(3);
  };

  // Comprehensive clinical flag evaluation
  const evaluation = useMemo(() => {
    const base = evaluateCgaRisk({
      bpSystolic,
      bpDiastolic,
      heartRate,
      spo2,
      fbs,
      adlScore,
      depress2Q,
      cogMiniCog: miniCogScore,
      tugtSeconds: tugtSeconds >= 12 ? tugtSeconds : 0,
      medicationsCount,
    });

    const extendedFlags = [...base.abnormalFlags];
    let riskLevel = base.riskLevel;

    if (tugtSeconds >= 12 && tugtSeconds < 13.5) {
      extendedFlags.push(`TUGT ${tugtSeconds} วินาที (เสี่ยงหกล้ม ≥12 วิ)`);
      if (riskLevel === 'normal') riskLevel = 'watch';
    }
    if (kneeAbnormal) {
      extendedFlags.push(`สงสัยข้อเข่าเสื่อม (พบเกณฑ์ ${kneePositiveCount}/5 ข้อ)`);
      if (riskLevel === 'normal') riskLevel = 'watch';
    }
    if (frailScore >= 3) {
      extendedFlags.push(`ภาวะเปราะบาง FRAIL ${frailScore}/5`);
      if (riskLevel === 'normal' || riskLevel === 'watch') riskLevel = 'high';
    } else if (frailScore >= 1) {
      extendedFlags.push(`ภาวะก่อนเปราะบาง FRAIL ${frailScore}/5`);
      if (riskLevel === 'normal') riskLevel = 'watch';
    }
    if (mnaScore <= 7) {
      extendedFlags.push(`ขาดสารอาหาร (MNA-SF ${mnaScore}/14)`);
      if (riskLevel === 'normal' || riskLevel === 'watch') riskLevel = 'high';
    } else if (mnaScore <= 11) {
      extendedFlags.push(`เสี่ยงขาดสารอาหาร (MNA-SF ${mnaScore}/14)`);
      if (riskLevel === 'normal') riskLevel = 'watch';
    }
    if (oralAbnormal) extendedFlags.push('พบปัญหาสุขภาพช่องปาก/เคี้ยวลำบาก');
    if (visionAbnormal) extendedFlags.push('การมองเห็นผิดปกติ');
    if (hearingAbnormal) extendedFlags.push('การได้ยินผิดปกติ');
    if (incontinenceAbnormal) extendedFlags.push('มีภาวะกลั้นปัสสาวะไม่ได้');
    if (sleepAbnormal) extendedFlags.push('มีปัญหาการนอนหลับ');
    if (zbiScore !== null && zbiScore >= 21) {
      extendedFlags.push(`ภาระผู้ดูแลสูง (ZBI-12 ${zbiScore}/48)`);
    }
    if (deepMmseEnabled && mmseTotal <= eduInfo.cutoff) {
      extendedFlags.push(`MMSE-Thai 2002 ผิดปกติ (${mmseTotal}/${eduInfo.maxScore})`);
      if (riskLevel === 'normal' || riskLevel === 'watch') riskLevel = 'high';
    }
    if (deepTgdsEnabled && tgdsTotal >= 5) {
      extendedFlags.push(`TGDS-15 เสี่ยงซึมเศร้า (${tgdsTotal}/15)`);
      if (riskLevel === 'normal' || riskLevel === 'watch') riskLevel = 'high';
    }
    if (deepFratEnabled && fratTotal >= 4) {
      extendedFlags.push(`Thai-FRAT เสี่ยงหกล้มสูง (${fratTotal}/11)`);
      if (riskLevel === 'normal' || riskLevel === 'watch') riskLevel = 'high';
    }
    if (deepSarcEnabled && sarcTotal >= 4) {
      extendedFlags.push(`SARC-F เสี่ยงมวลกล้ามเนื้อน้อย (${sarcTotal}/10)`);
      if (riskLevel === 'normal') riskLevel = 'watch';
    }

    const alertSeverity =
      riskLevel === 'critical'
        ? ('critical' as const)
        : riskLevel === 'high'
          ? ('urgent' as const)
          : riskLevel === 'watch'
            ? ('warning' as const)
            : null;

    return {
      abnormalFlags: extendedFlags.slice(0, FIELD_LIMITS.FLAGS_MAX),
      riskLevel,
      fallRisk: base.fallRisk || tugtSeconds >= 12 || (deepFratEnabled && fratTotal >= 4),
      alertSeverity,
    };
  }, [
    bpSystolic,
    bpDiastolic,
    heartRate,
    spo2,
    fbs,
    adlScore,
    depress2Q,
    miniCogScore,
    tugtSeconds,
    medicationsCount,
    kneeAbnormal,
    kneePositiveCount,
    frailScore,
    mnaScore,
    oralAbnormal,
    visionAbnormal,
    hearingAbnormal,
    incontinenceAbnormal,
    sleepAbnormal,
    zbiScore,
    deepMmseEnabled,
    mmseTotal,
    eduInfo,
    deepTgdsEnabled,
    tgdsTotal,
    deepFratEnabled,
    fratTotal,
    deepSarcEnabled,
    sarcTotal,
  ]);

  // Auto-populate default careNoteSummary when navigating to Step 4
  useEffect(() => {
    if (!careNoteEdited) {
      if (evaluation.abnormalFlags.length === 0) {
        setCareNoteSummary('สุขภาพโดยรวมอยู่ในเกณฑ์ปกติ แนะนำส่งเสริมสุขภาพและคัดกรองซ้ำปีละ 1 ครั้ง');
      } else {
        setCareNoteSummary(
          `ตรวจพบประเด็นเฝ้าระวัง: ${evaluation.abnormalFlags.join(', ')} — แนะนำติดตามเยี่ยมบ้านและประสานทีมสหวิชาชีพ/รพ.ดอนพุดตามความเหมาะสม`,
        );
      }
    }
  }, [evaluation.abnormalFlags, careNoteEdited]);

  const effectiveElderName =
    mode === 'existing' && activeElder
      ? activeElder.fullName
      : fullName.trim() || '-';

  const summaryRows: SummaryTableRow[] = useMemo(() => {
    const calfCutoff = gender === 'male' ? 34 : 33;
    return [
      {
        domain: '1. Barthel ADL',
        scoreText: `${adlScore}/20`,
        interpretation: adlGroup,
        status: adlScore <= 4 ? 'abnormal' : adlScore <= 11 ? 'warning' : 'normal',
      },
      {
        domain: '2. Mini-Cog',
        scoreText: `${miniCogScore}/5`,
        interpretation: miniCogScore <= 2 ? 'สงสัยสมองเสื่อม' : 'ปกติ',
        status: miniCogScore <= 2 ? 'abnormal' : 'normal',
      },
      {
        domain: '3. ซึมเศร้า 2Q',
        scoreText: depress2Q === 0 ? 'ไม่มี (0/2)' : `พบความเสี่ยง (${depress2Q}/2)`,
        interpretation: depress2Q >= 1 ? 'เสี่ยงภาวะซึมเศร้า' : 'ปกติ',
        status: depress2Q >= 1 ? 'warning' : 'normal',
      },
      {
        domain: '4. TUGT (การทรงตัว/หกล้ม)',
        scoreText: tugtSeconds > 0 ? `${tugtSeconds.toFixed(1)} วิ` : '-',
        interpretation:
          tugtSeconds === 0
            ? 'ยังไม่วัด'
            : tugtSeconds >= 12
              ? 'เสี่ยงหกล้ม (≥12 วิ)'
              : 'ปกติ',
        status: tugtSeconds === 0 ? 'unassessed' : tugtSeconds >= 12 ? 'abnormal' : 'normal',
      },
      {
        domain: '5. คัดกรองข้อเข่าเสื่อม',
        scoreText: kneePain ? `ปวดเข่า (${kneePositiveCount}/5 ข้อ)` : 'ไม่มีอาการ',
        interpretation: kneeAbnormal ? 'สงสัยข้อเข่าเสื่อม' : kneePain ? 'ปวดเข่า (เฝ้าระวัง)' : 'ปกติ',
        status: kneeAbnormal ? 'warning' : 'normal',
      },
      {
        domain: '6. FRAIL Scale',
        scoreText: `${frailScore}/5`,
        interpretation: frailScore >= 3 ? 'เปราะบาง' : frailScore >= 1 ? 'ก่อนเปราะบาง' : 'แข็งแรง',
        status: frailScore >= 3 ? 'abnormal' : frailScore >= 1 ? 'warning' : 'normal',
      },
      {
        domain: '7. โภชนาการ (MNA-SF)',
        scoreText: `${mnaScore}/14`,
        interpretation:
          mnaScore <= 7 ? 'ขาดสารอาหาร' : mnaScore <= 11 ? 'เสี่ยงขาดสารอาหาร' : 'โภชนาการปกติ',
        status: mnaScore <= 7 ? 'abnormal' : mnaScore <= 11 ? 'warning' : 'normal',
      },
      {
        domain: '8. ช่องปาก / ตา / หู',
        scoreText: `${oralAbnormal || visionAbnormal || hearingAbnormal ? 'พบผิดปกติ' : 'ปกติ'}`,
        interpretation: `ช่องปาก: ${oralAbnormal ? 'ผิดปกติ' : 'ปกติ'} | ตา: ${visionAbnormal ? 'ผิดปกติ' : 'ปกติ'} | หู: ${hearingAbnormal ? 'ผิดปกติ' : 'ปกติ'}`,
        status: oralAbnormal || visionAbnormal || hearingAbnormal ? 'warning' : 'normal',
      },
      {
        domain: '9. กลั้นปัสสาวะ / การนอน',
        scoreText: `${incontinenceAbnormal || sleepAbnormal ? 'พบผิดปกติ' : 'ปกติ'}`,
        interpretation: `ปัสสาวะ: ${incontinenceAbnormal ? 'เล็ด/ราด' : 'ปกติ'} | การนอน: ${sleepAbnormal ? 'มีปัญหา' : 'ปกติ'}`,
        status: incontinenceAbnormal || sleepAbnormal ? 'warning' : 'normal',
      },
      {
        domain: 'การใช้ยาประจำ',
        scoreText: `${medicationsCount} ชนิด`,
        interpretation: medicationsCount >= 5 ? 'ใช้ยาหลายขนาน (≥5 ชนิด)' : 'ปกติ',
        status: medicationsCount >= 5 ? 'warning' : 'normal',
      },
      {
        domain: 'ภาระผู้ดูแล (ZBI-12)',
        scoreText: zbiScore !== null ? `${zbiScore}/48` : 'ไม่ได้ประเมิน',
        interpretation:
          zbiScore === null
            ? 'ไม่ได้ประเมิน'
            : zbiScore >= 21
              ? 'ภาระสูง'
              : zbiScore >= 11
                ? 'ภาระปานกลาง'
                : 'ภาระน้อย',
        status: zbiScore === null ? 'unassessed' : zbiScore >= 21 ? 'abnormal' : zbiScore >= 11 ? 'warning' : 'normal',
      },
      {
        domain: 'เจาะลึก: MMSE-Thai 2002',
        scoreText: deepMmseEnabled ? `${mmseTotal}/${eduInfo.maxScore}` : 'ไม่ได้ประเมิน',
        interpretation: !deepMmseEnabled
          ? 'ไม่ได้ประเมิน'
          : mmseTotal <= eduInfo.cutoff
            ? `สงสัยสมองเสื่อม (≤${eduInfo.cutoff})`
            : 'ปกติ',
        status: !deepMmseEnabled ? 'unassessed' : mmseTotal <= eduInfo.cutoff ? 'abnormal' : 'normal',
      },
      {
        domain: 'เจาะลึก: TGDS-15',
        scoreText: deepTgdsEnabled ? `${tgdsTotal}/15` : 'ไม่ได้ประเมิน',
        interpretation: !deepTgdsEnabled
          ? 'ไม่ได้ประเมิน'
          : tgdsTotal >= 10
            ? 'ซึมเศร้ารุนแรง'
            : tgdsTotal >= 5
              ? 'เสี่ยงซึมเศร้า'
              : 'ปกติ',
        status: !deepTgdsEnabled ? 'unassessed' : tgdsTotal >= 5 ? 'abnormal' : 'normal',
      },
      {
        domain: 'เจาะลึก: Thai-FRAT',
        scoreText: deepFratEnabled ? `${fratTotal}/11` : 'ไม่ได้ประเมิน',
        interpretation: !deepFratEnabled
          ? 'ไม่ได้ประเมิน'
          : fratTotal >= 4
            ? 'เสี่ยงหกล้มสูง'
            : 'ความเสี่ยงต่ำ',
        status: !deepFratEnabled ? 'unassessed' : fratTotal >= 4 ? 'abnormal' : 'normal',
      },
      {
        domain: 'เจาะลึก: SARC-F + น่อง',
        scoreText: deepSarcEnabled ? `${sarcTotal}/10 (น่อง ${calfCm || '-'} ซม.)` : 'ไม่ได้ประเมิน',
        interpretation: !deepSarcEnabled
          ? 'ไม่ได้ประเมิน'
          : sarcTotal >= 4 || (calfCm > 0 && calfCm < calfCutoff)
            ? 'เสี่ยงมวลกล้ามเนื้อน้อย'
            : 'ปกติ',
        status: !deepSarcEnabled
          ? 'unassessed'
          : sarcTotal >= 4 || (calfCm > 0 && calfCm < calfCutoff)
            ? 'abnormal'
            : 'normal',
      },
    ];
  }, [
    adlScore,
    adlGroup,
    miniCogScore,
    depress2Q,
    tugtSeconds,
    kneePain,
    kneePositiveCount,
    kneeAbnormal,
    frailScore,
    mnaScore,
    oralAbnormal,
    visionAbnormal,
    hearingAbnormal,
    incontinenceAbnormal,
    sleepAbnormal,
    medicationsCount,
    zbiScore,
    deepMmseEnabled,
    mmseTotal,
    eduInfo,
    deepTgdsEnabled,
    tgdsTotal,
    deepFratEnabled,
    fratTotal,
    deepSarcEnabled,
    sarcTotal,
    calfCm,
    gender,
  ]);

  const toggleDisease = (disease: string) => {
    setNoChronic(false);
    setChronicDiseases((prev) => {
      if (prev.includes(disease)) return prev.filter((d) => d !== disease);
      if (prev.length >= FIELD_LIMITS.DISEASES_MAX) return prev;
      return [...prev, disease];
    });
  };

  const handleToggleNoChronic = () => {
    setNoChronic((prev) => {
      const next = !prev;
      if (next) setChronicDiseases([]);
      return next;
    });
  };

  const handleGenerateAiPlan = async () => {
    setAiError(null);
    setAiLoading(true);
    try {
      const elderPayload =
        mode === 'existing' && activeElder
          ? activeElder
          : {
              fullName: fullName.trim() || 'ผู้สูงอายุรายใหม่',
              age,
              gender,
              village: village || 'หมู่ 1',
              subDistrict,
              facility,
              chronicDiseases,
              medicationsCount,
            };

      const resp = await fetch('/api/ai/care-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elder: elderPayload,
          assessment: {
            bpSystolic,
            bpDiastolic,
            heartRate,
            spo2,
            fbs,
            bmi: bmi || 22,
            adlScore,
            adlGroup,
            depress2Q,
            cogMiniCog: miniCogScore,
            tugtSeconds,
            fallRisk: evaluation.fallRisk,
            polypharmacy: medicationsCount >= 5,
            riskLevel: evaluation.riskLevel,
            abnormalFlags: evaluation.abnormalFlags,
            extendedSummary: {
              frailScore,
              mnaScore,
              zbiScore,
              mmseScore: deepMmseEnabled ? mmseTotal : null,
              tgdsScore: deepTgdsEnabled ? tgdsTotal : null,
              thaiFratScore: deepFratEnabled ? fratTotal : null,
              sarcFScore: deepSarcEnabled ? sarcTotal : null,
            },
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'สร้างแผนดูแลไม่สำเร็จ');
      setAiPlan(data);
      if (data.riskSummary) {
        setCareNoteSummary(data.riskSummary);
        setCareNoteEdited(true);
      }
      if (data.recommendedReferral) {
        setCreateReferral(true);
        if (data.suggestedFacility) setReferralTarget(data.suggestedFacility);
        if (data.referralReason) setReferralReason(data.referralReason);
        setReferralUrgency(evaluation.riskLevel === 'critical' ? 'emergency' : 'urgent');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'ไม่สามารถสร้างแผนดูแลด้วย AI ได้');
    } finally {
      setAiLoading(false);
    }
  };

  const buildDetailPayload = (): CgaFullDetail => ({
    educationLevel,
    weightKg,
    heightCm,
    otherChronicNote: truncateStr(otherChronicNote, 120),
    adlAnswers,
    miniCogRecall,
    miniCogClock,
    q2Items,
    kneePain,
    kneeCriteria,
    frailItems,
    mnaAnswers,
    oralAbnormal,
    visionAbnormal,
    hearingAbnormal,
    incontinenceAbnormal,
    sleepAbnormal,
    medicationNotes: truncateStr(medicationNotes, 200),
    zbiEnabled,
    zbiAnswers,
    zbiScore,
    deepMmseEnabled,
    mmseScore: deepMmseEnabled ? mmseTotal : null,
    mmseCutoff: eduInfo.cutoff,
    deepTgdsEnabled,
    tgdsScore: deepTgdsEnabled ? tgdsTotal : null,
    deepFratEnabled,
    thaiFratScore: deepFratEnabled ? fratTotal : null,
    deepSarcEnabled,
    sarcFScore: deepSarcEnabled ? sarcTotal : null,
    calfCm: deepSarcEnabled ? calfCm : null,
    careNoteSummary: truncateStr(careNoteSummary, 1000),
  });

  const handleSaveToCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (mode === 'new' && fullName.trim().length < 2) {
      setSaveError('กรุณาระบุชื่อ-สกุล หรือรหัสผู้รับบริการในขั้นตอนที่ 1 ก่อนบันทึก');
      setStep(1);
      return;
    }
    if (mode === 'existing' && !activeElder) {
      setSaveError('กรุณาเลือกผู้สูงอายุจากทะเบียนในขั้นตอนที่ 1');
      setStep(1);
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);
      const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const elderId =
        mode === 'existing' && activeElder
          ? activeElder.id
          : sanitizeId(`elder-${uniqueSuffix}`);
      const elderDisplayName =
        mode === 'existing' && activeElder
          ? activeElder.fullName
          : truncateStr(fullName, FIELD_LIMITS.NAME_MAX);

      const serializedPlan = aiPlan
        ? truncateStr(JSON.stringify(aiPlan), FIELD_LIMITS.AI_SUMMARY_MAX)
        : '';
      const detailJson = truncateStr(JSON.stringify(buildDetailPayload()), 15500);

      const finalDiseases = noChronic
        ? []
        : [
            ...chronicDiseases,
            ...(otherChronicNote.trim() ? [truncateStr(otherChronicNote, 80)] : []),
          ].slice(0, FIELD_LIMITS.DISEASES_MAX);

      if (mode === 'new') {
        batch.set(doc(db, 'elders', elderId), {
          ownerId,
          hn: sanitizeId(hn),
          fullName: elderDisplayName,
          age: Math.min(125, Math.max(50, Math.round(age))),
          gender,
          village: truncateStr(village || 'หมู่ 1 บ้านดอนพุด', FIELD_LIMITS.VILLAGE_MAX),
          subDistrict,
          facility: truncateStr(facility, FIELD_LIMITS.FACILITY_MAX),
          chronicDiseases: finalDiseases,
          medicationsCount: Math.min(40, Math.max(0, Math.round(medicationsCount))),
          adlScore: Math.min(20, Math.max(0, Math.round(adlScore))),
          adlGroup,
          riskLevel: evaluation.riskLevel,
          latestAlertStatus: evaluation.alertSeverity ? 'active' : 'none',
          ...(serializedPlan ? { aiCarePlanSummary: serializedPlan } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, 'elders', elderId, 'private', 'contact'), {
          ownerId,
          phone: truncateStr(phone, FIELD_LIMITS.PHONE_MAX),
          address: truncateStr(address, FIELD_LIMITS.ADDRESS_MAX),
          emergencyContact: truncateStr(emergencyContact, FIELD_LIMITS.NAME_MAX),
          updatedAt: serverTimestamp(),
        });
      } else if (activeElder) {
        batch.update(doc(db, 'elders', elderId), {
          adlScore: Math.min(20, Math.max(0, Math.round(adlScore))),
          adlGroup,
          medicationsCount: Math.min(40, Math.max(0, Math.round(medicationsCount))),
          riskLevel: evaluation.riskLevel,
          latestAlertStatus: evaluation.alertSeverity ? 'active' : activeElder.latestAlertStatus,
          ...(serializedPlan ? { aiCarePlanSummary: serializedPlan } : {}),
          updatedAt: serverTimestamp(),
        });
      }

      const assessmentId = sanitizeId(`assess-${uniqueSuffix}`);
      const status = createReferral
        ? 'referred'
        : evaluation.riskLevel === 'normal'
          ? 'completed'
          : 'follow_up';

      batch.set(doc(db, 'assessments', assessmentId), {
        ownerId,
        elderId,
        elderName: elderDisplayName,
        assessorName: truncateStr(assessorName || 'เจ้าหน้าที่สาธารณสุข', FIELD_LIMITS.NAME_MAX),
        facility: truncateStr(
          mode === 'existing' && activeElder ? activeElder.facility : facility,
          FIELD_LIMITS.FACILITY_MAX,
        ),
        bpSystolic: Math.min(280, Math.max(50, Math.round(bpSystolic))),
        bpDiastolic: Math.min(180, Math.max(30, Math.round(bpDiastolic))),
        heartRate: Math.min(240, Math.max(25, Math.round(heartRate))),
        spo2: Math.min(100, Math.max(50, Math.round(spo2))),
        fbs: Math.min(700, Math.max(20, Math.round(fbs))),
        bmi: Math.min(70, Math.max(10, Number(bmi || 22))),
        adlScore: Math.round(adlScore),
        adlGroup,
        depress2Q: Math.round(depress2Q),
        cogMiniCog: Math.round(miniCogScore),
        tugtSeconds: Math.min(180, Math.max(0, Number(tugtSeconds))),
        fallRisk: evaluation.fallRisk,
        polypharmacy: medicationsCount >= 5,
        riskLevel: evaluation.riskLevel,
        abnormalFlags: evaluation.abnormalFlags,
        ...(aiPlan ? { aiCarePlan: truncateStr(JSON.stringify(aiPlan), FIELD_LIMITS.AI_PLAN_MAX) } : {}),
        cgaDetailJson: detailJson,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (evaluation.alertSeverity) {
        const alertId = sanitizeId(`alert-${uniqueSuffix}`);
        batch.set(doc(db, 'alerts', alertId), {
          ownerId,
          elderId,
          elderName: elderDisplayName,
          severity: evaluation.alertSeverity,
          title: truncateStr(
            evaluation.abnormalFlags[0] || `พบความเสี่ยงระดับ ${riskLabelThai(evaluation.riskLevel)}`,
            180,
          ),
          description: truncateStr(
            evaluation.abnormalFlags.join(' · ') || 'ตรวจพบค่าผิดปกติจากการประเมิน CGA',
            1000,
          ),
          source: 'cga_screening',
          acknowledged: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (createReferral) {
        const referralId = sanitizeId(`ref-${uniqueSuffix}`);
        batch.set(doc(db, 'referrals', referralId), {
          ownerId,
          elderId,
          elderName: elderDisplayName,
          fromFacility: truncateStr(
            mode === 'existing' && activeElder ? activeElder.facility : facility,
            FIELD_LIMITS.FACILITY_MAX,
          ),
          toFacility: truncateStr(referralTarget, FIELD_LIMITS.FACILITY_MAX),
          reason: truncateStr(
            referralReason || evaluation.abnormalFlags.join(', ') || 'ส่งต่อประเมินผู้สูงอายุต่อเนื่อง',
            600,
          ),
          urgency: referralUrgency,
          status: 'pending',
          notes: truncateStr(careNoteSummary || 'สร้างจากแบบคัดกรอง CGA คปสอ.ดอนพุด', FIELD_LIMITS.NOTES_MAX),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `assessments/${assessmentId}`);
      }

      onComplete(elderId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const executeGoogleSheetsSave = async () => {
    if (!accessToken) return;
    setSheetsBusy(true);
    setSaveError(null);
    try {
      const monthLabel = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      const sheetSummaryRows = [
        ['ใบสรุปผลการประเมินสุขภาพผู้สูงอายุแบบองค์รวม (CGA) คปสอ.ดอนพุด'],
        ['ชื่อ/รหัส', effectiveElderName, 'อายุ', age, 'ตำบล', subDistrict, 'หน่วยบริการ', facility],
        ['BP', `${bpSystolic}/${bpDiastolic} mmHg`, 'BMI', bmi || '-', 'ระดับความเสี่ยง', riskLabelThai(evaluation.riskLevel)],
        [],
        ['ด้านการประเมิน', 'คะแนน / ค่าที่วัดได้', 'การแปลผล'],
        ...summaryRows.map((r) => [r.domain, r.scoreText, r.interpretation]),
        [],
        ['สรุปความเสี่ยงและแผนดูแล', careNoteSummary],
      ];

      const elderRows = [
        ['HN', 'ชื่อ-นามสกุล', 'อายุ', 'เพศ', 'หมู่บ้าน', 'ตำบล', 'หน่วยบริการ', 'ADL', 'กลุ่มศักยภาพ', 'ความเสี่ยง'],
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
        ]),
      ];

      const assessmentRows = [
        ['ผู้สูงอายุ', 'หน่วยบริการ', 'ผู้ประเมิน', 'BP', 'BMI', 'ADL', 'Mini-Cog', '2Q', 'TUGT', 'ความเสี่ยง', 'ความผิดปกติ'],
        [
          effectiveElderName,
          facility,
          assessorName || '-',
          `${bpSystolic}/${bpDiastolic}`,
          bmi || '-',
          `${adlScore}/20 (${adlGroup})`,
          `${miniCogScore}/5`,
          `${depress2Q}/2`,
          `${tugtSeconds.toFixed(1)}s`,
          riskLabelThai(evaluation.riskLevel),
          evaluation.abnormalFlags.join('; ') || '-',
        ],
        ...assessments.map((a) => [
          a.elderName,
          a.facility,
          a.assessorName,
          `${a.bpSystolic}/${a.bpDiastolic}`,
          a.bmi,
          `${a.adlScore}/20 (${a.adlGroup})`,
          `${a.cogMiniCog}/5`,
          `${a.depress2Q}/2`,
          `${a.tugtSeconds}s`,
          riskLabelThai(a.riskLevel),
          a.abnormalFlags.join('; ') || '-',
        ]),
      ];

      const referralRows = [
        ['ผู้สูงอายุ', 'ต้นทาง', 'ปลายทาง', 'เหตุผล', 'ความเร่งด่วน', 'สถานะ'],
        ...referrals.map((r) => [
          r.elderName,
          r.fromFacility,
          r.toFacility,
          r.reason,
          r.urgency,
          referralStatusThai(r.status),
        ]),
      ];

      const resp = await fetch('/api/sheets/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: `CGA ${effectiveElderName} - คปสอ.ดอนพุด (${monthLabel})`,
          summaryRows: sheetSummaryRows,
          elderRows,
          assessmentRows,
          referralRows,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'ส่งออก Google Sheets ไม่สำเร็จ');
      setSheetsResult(data);
      setSheetsConfirmOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'ไม่สามารถส่งออก Google Sheets ได้');
      setSheetsConfirmOpen(false);
    } finally {
      setSheetsBusy(false);
    }
  };

  const handleExportCsv = () => {
    const header = ['ด้านการประเมิน', 'คะแนน/ค่าที่วัดได้', 'การแปลผล'];
    const rows = [
      ['ชื่อ/รหัส', effectiveElderName, `อายุ ${age} ปี · ต.${subDistrict}`],
      ['BP / BMI', `${bpSystolic}/${bpDiastolic} mmHg`, `BMI ${bmi || '-'}`],
      ...summaryRows.map((r) => [r.domain, r.scoreText, r.interpretation]),
      ['สรุปความเสี่ยงและแผนดูแล', '-', careNoteSummary],
    ];
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cga-${sanitizeId(effectiveElderName)}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleResetForm = () => {
    setFullName('');
    setHn(`DP-${Math.floor(6810 + Math.random() * 890)}`);
    setAge(68);
    setVillage('');
    setChronicDiseases([]);
    setNoChronic(false);
    setOtherChronicNote('');
    setAdlAnswers(BARTHEL_ADL_QUESTIONS.map((q) => q.options[0].score));
    setMiniCogRecall(3);
    setMiniCogClock(2);
    setQ2Items([false, false]);
    resetStopwatch();
    setKneePain(false);
    setKneeCriteria(KNEE_OA_CRITERIA.map(() => false));
    setFrailItems(FRAIL_SCALE_QUESTIONS.map(() => false));
    setMnaAnswers(MNA_SF_QUESTIONS.map((q) => q.options[0].score));
    setMnaBmiManual(false);
    setOralAbnormal(false);
    setVisionAbnormal(false);
    setHearingAbnormal(false);
    setIncontinenceAbnormal(false);
    setSleepAbnormal(false);
    setMedicationsCount(0);
    setMedicationNotes('');
    setZbiEnabled(false);
    setZbiAnswers(ZBI_12_QUESTIONS.map(() => 0));
    setDeepMmseEnabled(false);
    setDeepTgdsEnabled(false);
    setDeepFratEnabled(false);
    setDeepSarcEnabled(false);
    setAiPlan(null);
    setCareNoteEdited(false);
    setCreateReferral(false);
    setSheetsResult(null);
    setStep(1);
  };

  const stepTabs: { id: WizardStep; label: string }[] = [
    { id: 1, label: '1. ข้อมูลพื้นฐาน' },
    { id: 2, label: '2. คัดกรอง 9 ด้าน + ยา' },
    { id: 3, label: '3. ประเมินเจาะลึก (4 ชุด)' },
    { id: 4, label: '4. สรุปผล & บันทึก' },
  ];

  return (
    <form onSubmit={handleSaveToCloud} className="space-y-6">
      {/* 4-Step Segmented Wizard Bar */}
      <div className="no-print bg-teal-800 rounded-xl p-1.5 grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {stepTabs.map((t) => {
          const active = step === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => (t.id === 3 ? handleGoToStep3() : setStep(t.id))}
              className={`min-h-[42px] px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap truncate ${
                active
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-teal-50 hover:bg-teal-700/70'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* STEP 1: ข้อมูลพื้นฐาน & สัญญาณชีพ */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-teal-900">ข้อมูลพื้นฐานผู้สูงอายุ</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกรายชื่อจากทะเบียน คปสอ.ดอนพุด หรือลงทะเบียนผู้รับบริการรายใหม่
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setMode('existing')}
                  disabled={elders.length === 0}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    mode === 'existing'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-40'
                  }`}
                >
                  เลือกจากทะเบียน ({elders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMode('new')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    mode === 'new'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  ลงทะเบียนใหม่
                </button>
              </div>
            </div>

            {mode === 'existing' && elders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    เลือกรายชื่อผู้สูงอายุ *
                  </label>
                  <select
                    value={selectedElderId}
                    onChange={(e) => setSelectedElderId(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {elders.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.hn} · {el.fullName} ({el.age} ปี · ต.{el.subDistrict})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ชื่อผู้ประเมิน (เจ้าหน้าที่)
                  </label>
                  <input
                    type="text"
                    value={assessorName}
                    onChange={(e) => setAssessorName(e.target.value)}
                    placeholder="ระบุชื่อเจ้าหน้าที่"
                    className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      ชื่อ-สกุล หรือ รหัสผู้รับบริการ (HN) *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="เช่น นายสมชาย ใจดี"
                      className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      ชื่อผู้ประเมิน (เจ้าหน้าที่)
                    </label>
                    <input
                      type="text"
                      value={assessorName}
                      onChange={(e) => setAssessorName(e.target.value)}
                      placeholder="ระบุชื่อเจ้าหน้าที่"
                      className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      รหัส HN
                    </label>
                    <input
                      type="text"
                      value={hn}
                      onChange={(e) => setHn(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      อายุ (ปี) *
                    </label>
                    <input
                      type="number"
                      min={50}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      เพศ *
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                      className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="male">ชาย</option>
                      <option value="female">หญิง</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      หมู่บ้าน / ชุมชน
                    </label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="เช่น หมู่ 3 บ้านหนองมน"
                      className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      ตำบล (พื้นที่ คปสอ.ดอนพุด)
                    </label>
                    <select
                      value={subDistrict}
                      onChange={(e) => setSubDistrict(e.target.value as SubDistrict)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      {SUB_DISTRICTS.map((sd) => (
                        <option key={sd} value={sd}>
                          ต.{sd}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      หน่วยบริการรับผิดชอบ
                    </label>
                    <select
                      value={facility}
                      onChange={(e) => setFacility(e.target.value)}
                      className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      {DON_PHUT_FACILITIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      เบอร์โทรศัพท์ติดต่อ (PII)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08x-xxx-xxxx"
                      className="w-full min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ผู้ติดต่อฉุกเฉิน
                    </label>
                    <input
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="ชื่อผู้ดูแลและเบอร์โทร"
                      className="w-full min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ที่อยู่ปัจจุบัน
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="บ้านเลขที่ หมู่ ตำบล"
                      className="w-full min-h-[40px] px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Education Level -> MMSE-Thai 2002 Auto Cutoff */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                ระดับการศึกษา (ใช้กำหนดเกณฑ์ MMSE-Thai 2002 อัตโนมัติ)
              </label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {(Object.keys(EDUCATION_MMSE_INFO) as EducationLevel[]).map((k) => (
                  <option key={k} value={k}>
                    {EDUCATION_MMSE_INFO[k].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Chronic Diseases */}
            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-slate-800">โรคประจำตัว</span>
              <div className="flex flex-wrap gap-2">
                {CHRONIC_DISEASE_OPTIONS.map((disease) => {
                  const checked = chronicDiseases.includes(disease);
                  return (
                    <label
                      key={disease}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-teal-50 text-teal-900 border-teal-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDisease(disease)}
                        className="w-3.5 h-3.5 accent-teal-700 rounded"
                      />
                      {disease}
                    </label>
                  );
                })}
                <label
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                    noChronic
                      ? 'bg-teal-50 text-teal-900 border-teal-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={noChronic}
                    onChange={handleToggleNoChronic}
                    className="w-3.5 h-3.5 accent-teal-700 rounded"
                  />
                  ไม่มี
                </label>
              </div>
              <input
                type="text"
                value={otherChronicNote}
                onChange={(e) => setOtherChronicNote(e.target.value)}
                placeholder="โรคประจำตัวอื่น ๆ (ระบุเพิ่มเติมถ้ามี)"
                className="w-full min-h-[40px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Vitals & Anthropometry */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-teal-900">
                สัญญาณชีพและสัดส่วนร่างกาย
              </h3>
              <span className="text-xs font-mono-tabular font-semibold text-slate-700">
                BMI: {bmi > 0 ? bmi.toFixed(1) : '-'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  ความดันโลหิตตัวบน SBP (mmHg)
                </label>
                <input
                  type="number"
                  min={50}
                  max={280}
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  ความดันโลหิตตัวล่าง DBP (mmHg)
                </label>
                <input
                  type="number"
                  min={30}
                  max={180}
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  ชีพจร (ครั้ง/นาที) · SpO2 (%) · FBS (mg/dL)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={25}
                    max={240}
                    value={heartRate}
                    onChange={(e) => setHeartRate(Number(e.target.value))}
                    title="ชีพจร"
                    className="min-h-[42px] px-2 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                  />
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={spo2}
                    onChange={(e) => setSpo2(Number(e.target.value))}
                    title="SpO2 %"
                    className="min-h-[42px] px-2 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                  />
                  <input
                    type="number"
                    min={20}
                    max={700}
                    value={fbs}
                    onChange={(e) => setFbs(Number(e.target.value))}
                    title="FBS mg/dL"
                    className="min-h-[42px] px-2 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  น้ำหนัก (กก.)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={20}
                  max={250}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  ส่วนสูง (ซม.)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={100}
                  max={220}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  ค่า BMI (คำนวณอัตโนมัติ)
                </label>
                <input
                  type="text"
                  readOnly
                  value={bmi > 0 ? bmi.toFixed(1) : '-'}
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-200 bg-slate-50 rounded-lg font-mono-tabular font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
            >
              ถัดไป: คัดกรอง 9 ด้าน + ยา
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: คัดกรอง 9 ด้าน + ยา + ZBI-12 */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Domain 1: Barthel ADL Index (10 items) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-teal-900">
                ด้านที่ 1: กิจวัตรประจำวัน (Barthel ADL Index)
              </h3>
              <span className="text-xs font-semibold font-mono-tabular text-emerald-800">
                {adlScore}/20 · {adlGroup}
              </span>
            </div>

            <div className="space-y-4">
              {BARTHEL_ADL_QUESTIONS.map((q, qIdx) => (
                <div key={q.id} className="space-y-2">
                  <div className="text-xs sm:text-sm font-medium text-slate-800">{q.title}</div>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => {
                      const active = adlAnswers[qIdx] === opt.score;
                      return (
                        <button
                          key={opt.score}
                          type="button"
                          onClick={() =>
                            setAdlAnswers((prev) => {
                              const next = [...prev];
                              next[qIdx] = opt.score;
                              return next;
                            })
                          }
                          className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            active
                              ? 'bg-teal-50 text-teal-900 border-teal-700 font-semibold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label} ({opt.score})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Domain 2: Mini-Cog */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-teal-900">
                ด้านที่ 2: การรู้คิดและความจำ (Mini-Cog)
              </h3>
              <span
                className={`text-xs font-semibold font-mono-tabular ${
                  miniCogScore <= 2 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {miniCogScore}/5 · {miniCogScore <= 2 ? 'สงสัยสมองเสื่อม' : 'ปกติ'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs sm:text-sm font-medium text-slate-800">
                1. การจำคำ 3 คำ (เช่น หลาน สวรรค์ ภูเขา) ทวนหลังวาดนาฬิกาได้กี่คำ
              </div>
              <div className="flex flex-wrap gap-2">
                {[3, 2, 1, 0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMiniCogRecall(val)}
                    className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      miniCogRecall === val
                        ? 'bg-teal-50 text-teal-900 border-teal-700 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {val} คำ ({val})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs sm:text-sm font-medium text-slate-800">
                2. การวาดหน้าปัดนาฬิกา (ใส่เลข 1-12 ครบถูกตำแหน่ง เข็มชี้ 11:10 น.)
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'ปกติ (2 คะแนน)', val: 2 },
                  { label: 'ผิดปกติ / วาดไม่ได้ (0 คะแนน)', val: 0 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setMiniCogClock(opt.val)}
                    className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      miniCogClock === opt.val
                        ? 'bg-teal-50 text-teal-900 border-teal-700 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Domain 3: 2Q Depression */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-teal-900">
                ด้านที่ 3: สุขภาพจิตและภาวะซึมเศร้า (2Q)
              </h3>
              <span
                className={`text-xs font-semibold ${
                  depress2Q >= 1 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {depress2Q >= 1 ? `เสี่ยงซึมเศร้า (${depress2Q}/2)` : 'ปกติ'}
              </span>
            </div>

            {[
              '1. ใน 2 สัปดาห์ที่ผ่านมา ท่านรู้สึก หดหู่ เศร้า หรือท้อแท้สิ้นหวัง หรือไม่',
              '2. ใน 2 สัปดาห์ที่ผ่านมา ท่านรู้สึก เบื่อ ทำอะไรก็ไม่เพลิดเพลิน หรือไม่',
            ].map((question, idx) => (
              <div key={idx} className="space-y-2">
                <div className="text-xs sm:text-sm font-medium text-slate-800">{question}</div>
                <div className="flex gap-2">
                  {[
                    { label: 'ไม่มี', val: false },
                    { label: 'มี', val: true },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setQ2Items((prev) => {
                          const next: [boolean, boolean] = [...prev] as [boolean, boolean];
                          next[idx] = opt.val;
                          return next;
                        })
                      }
                      className={`min-h-[38px] px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        q2Items[idx] === opt.val
                          ? opt.val
                            ? 'bg-amber-50 text-amber-900 border-amber-600 font-semibold'
                            : 'bg-teal-50 text-teal-900 border-teal-700 font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Domain 4: TUGT Stopwatch + Knee OA + FRAIL */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-teal-900">
                ด้านที่ 4: การเคลื่อนไหว หกล้ม ข้อเข่าเสื่อม และภาวะเปราะบาง
              </h3>
              <span
                className={`text-xs font-semibold font-mono-tabular ${
                  tugtSeconds === 0
                    ? 'text-slate-500'
                    : tugtSeconds >= 12
                      ? 'text-red-700'
                      : 'text-emerald-700'
                }`}
              >
                {tugtSeconds === 0
                  ? 'TUGT: ยังไม่วัด'
                  : `TUGT: ${tugtSeconds.toFixed(1)} วิ ${tugtSeconds >= 12 ? '(เสี่ยงหกล้ม)' : '(ปกติ)'}`}
              </span>
            </div>

            {/* 4.1 TUGT Stopwatch */}
            <div className="space-y-2.5">
              <div className="text-xs sm:text-sm font-medium text-slate-800">
                4.1 Timed Up and Go Test (TUGT) — ลุกเดิน 3 เมตร หมุนตัวกลับมานั่ง (เกณฑ์เสี่ยงตั้งแต่ 12 วินาทีขึ้นไป)
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold font-mono-tabular text-slate-900 min-w-[84px]">
                  {tugtSeconds.toFixed(1)} วิ
                </span>
                <button
                  type="button"
                  onClick={startStopwatch}
                  disabled={tugtRunning}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg"
                >
                  <Play className="w-3.5 h-3.5" />
                  เริ่มจับเวลา
                </button>
                <button
                  type="button"
                  onClick={stopStopwatch}
                  disabled={!tugtRunning}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg"
                >
                  <Square className="w-3.5 h-3.5" />
                  หยุด
                </button>
                <button
                  type="button"
                  onClick={resetStopwatch}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  รีเซ็ต
                </button>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={180}
                  value={tugtSeconds || ''}
                  onChange={(e) => setTugtSeconds(Number(e.target.value))}
                  placeholder="หรือกรอกวินาทีเอง"
                  className="flex-1 min-w-[140px] min-h-[38px] px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
            </div>

            {/* 4.2 Knee OA */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-800">
                  4.2 คัดกรองข้อเข่าเสื่อม
                </span>
                <span className={`text-xs font-semibold ${kneeAbnormal ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {kneeAbnormal ? 'สงสัยข้อเข่าเสื่อม' : kneePain ? 'ปวดเข่า (เฝ้าระวัง)' : 'ปกติ'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setKneePain(false);
                    setKneeCriteria(KNEE_OA_CRITERIA.map(() => false));
                  }}
                  className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-lg border ${
                    !kneePain
                      ? 'bg-teal-50 text-teal-900 border-teal-700 font-semibold'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  ไม่มีอาการปวดเข่า
                </button>
                <button
                  type="button"
                  onClick={() => setKneePain(true)}
                  className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-lg border ${
                    kneePain
                      ? 'bg-amber-50 text-amber-900 border-amber-600 font-semibold'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  มีอาการปวดเข่า
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {KNEE_OA_CRITERIA.map((item, idx) => (
                  <label
                    key={item}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border cursor-pointer ${
                      kneeCriteria[idx]
                        ? 'bg-amber-50 text-amber-900 border-amber-500 font-medium'
                        : 'bg-white text-slate-600 border-slate-200'
                    } ${!kneePain ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      disabled={!kneePain}
                      checked={kneeCriteria[idx]}
                      onChange={(e) =>
                        setKneeCriteria((prev) => {
                          const next = [...prev];
                          next[idx] = e.target.checked;
                          return next;
                        })
                      }
                      className="w-3.5 h-3.5 accent-amber-700 rounded"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            {/* 4.3 FRAIL Scale */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-800">
                  4.3 ภาวะเปราะบาง (FRAIL Scale)
                </span>
                <span
                  className={`text-xs font-semibold font-mono-tabular ${
                    frailScore >= 3
                      ? 'text-red-700'
                      : frailScore >= 1
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                  }`}
                >
                  {frailScore}/5 · {frailScore >= 3 ? 'เปราะบาง' : frailScore >= 1 ? 'ก่อนเปราะบาง' : 'แข็งแรง'}
                </span>
              </div>
              <div className="space-y-2">
                {FRAIL_SCALE_QUESTIONS.map((q, idx) => (
                  <label
                    key={q}
                    className={`flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-sm border rounded-lg cursor-pointer transition-colors ${
                      frailItems[idx]
                        ? 'bg-amber-50/70 border-amber-400 text-slate-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={frailItems[idx]}
                      onChange={(e) =>
                        setFrailItems((prev) => {
                          const next = [...prev];
                          next[idx] = e.target.checked;
                          return next;
                        })
                      }
                      className="w-4 h-4 accent-teal-700 rounded"
                    />
                    {q}
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Domain 5: MNA-SF */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-teal-900">
                ด้านที่ 5: ภาวะโภชนาการ (MNA-SF)
              </h3>
              <span
                className={`text-xs font-semibold font-mono-tabular ${
                  mnaScore <= 7
                    ? 'text-red-700'
                    : mnaScore <= 11
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {mnaScore}/14 ·{' '}
                {mnaScore <= 7
                  ? 'ขาดสารอาหาร'
                  : mnaScore <= 11
                    ? 'เสี่ยงขาดสารอาหาร'
                    : 'โภชนาการปกติ'}
              </span>
            </div>

            <div className="space-y-4">
              {MNA_SF_QUESTIONS.map((q, qIdx) => (
                <div key={q.id} className="space-y-2">
                  <div className="text-xs sm:text-sm font-medium text-slate-800">{q.title}</div>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => {
                      const active = mnaAnswers[qIdx] === opt.score;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            if (qIdx === 5) setMnaBmiManual(true);
                            setMnaAnswers((prev) => {
                              const next = [...prev];
                              next[qIdx] = opt.score;
                              return next;
                            });
                          }}
                          className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            active
                              ? 'bg-teal-50 text-teal-900 border-teal-700 font-semibold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label} ({opt.score})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Domains 6-9: Oral, Vision, Hearing, Incontinence, Sleep */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-teal-900 pb-3 border-b border-slate-100">
              ด้านที่ 6–9: ช่องปาก ประสาทสัมผัส การกลั้นปัสสาวะ และการนอน
            </h3>

            {[
              {
                title:
                  'ด้านที่ 6 สุขภาพช่องปาก (ฟันแท้ใช้งานได้น้อยกว่า 20 ซี่ / คู่สบฟันหลังน้อยกว่า 4 คู่ / เคี้ยวลำบาก ปวดฟัน ปากแห้ง)',
                okLabel: 'ปกติ',
                abLabel: 'พบปัญหาช่องปาก/เคี้ยวลำบาก',
                val: oralAbnormal,
                set: setOralAbnormal,
              },
              {
                title: 'ด้านที่ 7.1 การมองเห็น (Snellen/E Chart หรือคำถามคัดกรองโรคตา 5 ข้อ)',
                okLabel: 'ปกติ',
                abLabel: 'ผิดปกติ',
                val: visionAbnormal,
                set: setVisionAbnormal,
              },
              {
                title: 'ด้านที่ 7.2 การได้ยิน (Finger Rub Test ทั้ง 2 ข้าง)',
                okLabel: 'ได้ยินปกติทั้ง 2 ข้าง',
                abLabel: 'ผิดปกติ',
                val: hearingAbnormal,
                set: setHearingAbnormal,
              },
              {
                title: 'ด้านที่ 8 การกลั้นปัสสาวะ',
                okLabel: 'กลั้นได้ปกติ',
                abLabel: 'มีปัสสาวะเล็ด/ราด',
                val: incontinenceAbnormal,
                set: setIncontinenceAbnormal,
              },
              {
                title: 'ด้านที่ 9 การนอนหลับ',
                okLabel: 'นอนหลับปกติ',
                abLabel: 'มีปัญหาการนอน',
                val: sleepAbnormal,
                set: setSleepAbnormal,
              },
            ].map((item) => (
              <div key={item.title} className="space-y-2 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                <div className="text-xs sm:text-sm font-medium text-slate-800">{item.title}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => item.set(false)}
                    className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-lg border ${
                      !item.val
                        ? 'bg-teal-50 text-teal-900 border-teal-700 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {item.okLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => item.set(true)}
                    className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-lg border ${
                      item.val
                        ? 'bg-amber-50 text-amber-900 border-amber-600 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {item.abLabel}
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Medication Review & ZBI-12 */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-teal-900">
                ทบทวนการใช้ยา (Medication Review) &amp; ภาระผู้ดูแล (ZBI-12)
              </h3>
              <span
                className={`text-xs font-semibold font-mono-tabular ${
                  medicationsCount >= 5 ? 'text-amber-700' : 'text-teal-800'
                }`}
              >
                ยาประจำ {medicationsCount} ชนิด
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  จำนวนยาที่รับประทานเป็นประจำ (ชนิด)
                </label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={medicationsCount}
                  onChange={(e) => setMedicationsCount(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  การใช้ยาสมุนไพร / ยาชุด / ยาเสี่ยง (Beers) / หมายเหตุ
                </label>
                <input
                  type="text"
                  value={medicationNotes}
                  onChange={(e) => setMedicationNotes(e.target.value)}
                  placeholder="เช่น ยานอนหลับ ยาแก้ปวด NSAIDs ยาหม้อ"
                  className="w-full min-h-[42px] px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zbiEnabled}
                    onChange={(e) => setZbiEnabled(e.target.checked)}
                    className="w-4 h-4 accent-teal-700 rounded"
                  />
                  เปิดประเมินภาระผู้ดูแล (ZBI-12) กรณีมีผู้ดูแลหลักมาด้วย
                </label>
                <span className="text-xs font-mono-tabular text-slate-500">
                  {zbiScore !== null ? `${zbiScore}/48 คะแนน` : 'ไม่ได้ประเมิน'}
                </span>
              </div>

              {zbiEnabled && (
                <div className="mt-4 space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  {ZBI_12_QUESTIONS.map((q, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-800">{q}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {ZBI_OPTIONS.map((opt) => (
                          <button
                            key={opt.score}
                            type="button"
                            onClick={() =>
                              setZbiAnswers((prev) => {
                                const next = [...prev];
                                next[idx] = opt.score;
                                return next;
                              })
                            }
                            className={`px-2.5 py-1 text-xs rounded-md border ${
                              zbiAnswers[idx] === opt.score
                                ? 'bg-teal-700 text-white border-teal-700'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              ข้อมูลพื้นฐาน
            </button>
            <button
              type="button"
              onClick={handleGoToStep3}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              ถัดไป: ประเมินเจาะลึก (4 ชุด)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ประเมินเจาะลึก 4 ชุด */}
      {step === 3 && (
        <ScreeningDeepStep
          educationLevel={educationLevel}
          indications={indications}
          deepMmseEnabled={deepMmseEnabled}
          setDeepMmseEnabled={setDeepMmseEnabled}
          mmseScores={mmseScores}
          setMmseScores={setMmseScores}
          deepTgdsEnabled={deepTgdsEnabled}
          setDeepTgdsEnabled={setDeepTgdsEnabled}
          tgdsAnswers={tgdsAnswers}
          setTgdsAnswers={setTgdsAnswers}
          deepFratEnabled={deepFratEnabled}
          setDeepFratEnabled={setDeepFratEnabled}
          fratChecks={fratChecks}
          setFratChecks={setFratChecks}
          deepSarcEnabled={deepSarcEnabled}
          setDeepSarcEnabled={setDeepSarcEnabled}
          sarcAnswers={sarcAnswers}
          setSarcAnswers={setSarcAnswers}
          calfCm={calfCm}
          setCalfCm={setCalfCm}
          gender={gender}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {/* STEP 4: สรุปผล & บันทึก */}
      {step === 4 && (
        <>
          {sheetsResult && (
            <div className="no-print p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-emerald-900 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>ส่งออกรายงาน CGA ลง Google Sheets สำเร็จ ({sheetsResult.updatedCells} เซลล์)</span>
              </div>
              <a
                href={sheetsResult.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 rounded-lg whitespace-nowrap"
              >
                เปิด Google Sheets
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <ScreeningSummaryStep
            elderName={effectiveElderName}
            age={age}
            genderLabel={gender === 'male' ? 'ชาย' : gender === 'female' ? 'หญิง' : 'อื่นๆ'}
            village={village || '-'}
            subDistrict={subDistrict}
            chronicText={
              noChronic
                ? 'ไม่มี'
                : [...chronicDiseases, ...(otherChronicNote.trim() ? [otherChronicNote.trim()] : [])].join(', ') || '-'
            }
            bpSystolic={bpSystolic}
            bpDiastolic={bpDiastolic}
            bmi={bmi}
            summaryRows={summaryRows}
            careNoteSummary={careNoteSummary}
            setCareNoteSummary={(val) => {
              setCareNoteSummary(val);
              setCareNoteEdited(true);
            }}
            aiPlan={aiPlan}
            aiLoading={aiLoading}
            aiError={aiError}
            onGenerateAiPlan={handleGenerateAiPlan}
            createReferral={createReferral}
            setCreateReferral={setCreateReferral}
            referralTarget={referralTarget}
            setReferralTarget={setReferralTarget}
            referralUrgency={referralUrgency}
            setReferralUrgency={setReferralUrgency}
            referralReason={referralReason}
            setReferralReason={setReferralReason}
            saving={saving}
            saveError={saveError}
            accessToken={accessToken}
            onRequestGoogleAuth={onRequestGoogleAuth}
            onSaveToGoogleSheets={() => setSheetsConfirmOpen(true)}
            onExportCsv={handleExportCsv}
            onPrintPdf={() => window.print()}
            onResetForm={handleResetForm}
            onBack={() => setStep(3)}
          />
        </>
      )}

      <ConfirmDialog
        open={sheetsConfirmOpen}
        title="ยืนยันการบันทึกผลประเมิน CGA ลง Google Sheets"
        description={`ระบบจะสร้างไฟล์สเปรดชีต Google Sheets เพื่อบันทึกผลสรุป CGA ของ "${effectiveElderName}" พร้อมข้อมูลทะเบียนและรายการส่งต่อ`}
        items={[
          'แท็บ สรุปรายเดือน (ตารางสรุป 9 ด้าน + 4 ชุดเจาะลึก)',
          'แท็บ ทะเบียนผู้สูงอายุ และ ผลประเมิน_CGA',
          'แท็บ ระบบส่งต่อ',
        ]}
        confirmLabel="ยืนยันส่งออก Google Sheets"
        cancelLabel="ยกเลิก"
        busy={sheetsBusy}
        onConfirm={executeGoogleSheetsSave}
        onCancel={() => setSheetsConfirmOpen(false)}
      />
    </form>
  );
};
