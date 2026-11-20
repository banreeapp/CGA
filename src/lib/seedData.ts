import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { AiCarePlanStructured } from '../types/cga';

function encodePlan(plan: AiCarePlanStructured): string {
  return JSON.stringify(plan);
}

export async function seedDonPhutSampleData(ownerId: string, assessorName: string): Promise<void> {
  const batch = writeBatch(db);
  const ts = Date.now().toString(36);

  const eldersData = [
    {
      id: `dp-elder-01-${ts}`,
      hn: `DP-6801`,
      fullName: 'นายสมชาย ใจดี',
      age: 78,
      gender: 'male' as const,
      village: 'หมู่ 2 บ้านดอนพุด',
      subDistrict: 'ดอนพุด' as const,
      facility: 'รพ.สต.ดอนพุด',
      chronicDiseases: ['ความดันโลหิตสูง (HT)', 'เบาหวาน (DM)'],
      medicationsCount: 6,
      adlScore: 14,
      adlGroup: 'ติดสังคม' as const,
      riskLevel: 'critical' as const,
      latestAlertStatus: 'active' as const,
      phone: '081-452-8812',
      address: '45 หมู่ 2 ต.ดอนพุด อ.ดอนพุด จ.สระบุรี',
      emergencyContact: 'นางสมหญิง ใจดี (บุตรสาว)',
      plan: {
        riskSummary: 'ผู้สูงอายุมีความดันโลหิตสูงระดับวิกฤต (184/106 mmHg) ร่วมกับใช้ยาหลายขนาน (6 รายการ) และภาวะน้ำตาลในเลือดสูง',
        officerPlan: [
          'ประเมินซ้ำความดันโลหิตหลังพัก 15 นาที และตรวจอาการทางระบบประสาท (BEFAST)',
          'ประสานส่งต่อคลินิกผู้สูงอายุ รพ.ดอนพุด เพื่อปรับแผนการใช้ยาและความดันโลหิต',
          'ทบทวนความร่วมมือในการรับประทานยา (Medication Reconciliation) ร่วมกับเภสัชกร',
        ],
        familyGuide: [
          'จัดยารับประทานตามมื้ออย่างสม่ำเสมอ ห้ามหยุดยาลดความดันเองเด็ดขาด',
          'ลดอาหารรสเค็ม จัดอาหารจืด หลีกเลี่ยงเครื่องดื่มหวานจัดและของหมักดอง',
          'วัดความดันโลหิตช่วงเช้าและเย็นทุกวัน พร้อมบันทึกส่งผ่านแอปพลิเคชัน',
        ],
        redFlags: [
          'ปวดศีรษะรุนแรง ตามัว แขนขาอ่อนแรง หรือพูดไม่ชัด',
          'เจ็บแน่นหน้าอก หายใจเหนื่อยหอบ หรือหน้ามืดหมดสติ',
        ],
        recommendedReferral: true,
        suggestedFacility: 'รพ.ดอนพุด (โรงพยาบาลแม่ข่าย)',
        referralReason: 'ความดันโลหิตสูงวิกฤต 184/106 mmHg เสี่ยงภาวะแทรกซ้อนเฉียบพลัน',
      },
    },
    {
      id: `dp-elder-02-${ts}`,
      hn: `DP-6802`,
      fullName: 'นางทองสุข ศรีไผ่',
      age: 82,
      gender: 'female' as const,
      village: 'หมู่ 4 บ้านไผ่หลิ่ว',
      subDistrict: 'ไผ่หลิ่ว' as const,
      facility: 'รพ.สต.ไผ่หลิ่ว',
      chronicDiseases: ['โรคหลอดเลือดสมอง (Stroke)', 'ข้อเข่าเสื่อม'],
      medicationsCount: 5,
      adlScore: 8,
      adlGroup: 'ติดบ้าน' as const,
      riskLevel: 'high' as const,
      latestAlertStatus: 'active' as const,
      phone: '089-231-5540',
      address: '118 หมู่ 4 ต.ไผ่หลิ่ว อ.ดอนพุด จ.สระบุรี',
      emergencyContact: 'นายวิชัย ศรีไผ่ (บุตรชาย)',
      plan: {
        riskSummary: 'ผู้สูงอายุกลุ่มติดบ้าน (ADL 8/20) มีประวัติโรคหลอดเลือดสมองและเสี่ยงพลัดตกหกล้มสูง (TUGT 22 วินาที)',
        officerPlan: [
          'มอบหมาย Caregiver (CG) เยี่ยมบ้านสัปดาห์ละ 2 ครั้ง เพื่อฟื้นฟูสมรรถภาพกล้ามเนื้อ',
          'ประเมินสภาพแวดล้อมในบ้าน ติดตั้งราวจับห้องน้ำและทางเดินให้แสงสว่างเพียงพอ',
          'ติดตามคัดกรองภาวะซึมเศร้าซ้ำภายใน 2 สัปดาห์',
        ],
        familyGuide: [
          'คอยประคองเวลาลุกยืนหรือเดินไปห้องน้ำ ใช้ไม้เท้าช่วยพยุงที่ปรับความสูงพอดี',
          'พูดคุยให้กำลังใจ ทำกิจกรรมร่วมกันในครอบครัวเพื่อลดความรู้สึกโดดเดี่ยว',
          'ดูแลพื้นบ้านให้แห้ง ไม่วางสิ่งของกีดขวางทางเดิน',
        ],
        redFlags: [
          'พลัดตกหกล้มศีรษะกระแทก หรือลุกเดินไม่ได้กะทันหัน',
          'ซึมลง ไม่รับประทานอาหารติดต่อกันเกิน 24 ชั่วโมง',
        ],
        recommendedReferral: true,
        suggestedFacility: 'ศูนย์ดูแลผู้สูงอายุ คปสอ.ดอนพุด (LTC)',
        referralReason: 'จัดทำ Care Plan ระยะยาว (LTC) และจัดสรรนักกายภาพบำบัดเยี่ยมบ้าน',
      },
    },
    {
      id: `dp-elder-03-${ts}`,
      hn: `DP-6803`,
      fullName: 'นายบุญมี รักถิ่น',
      age: 85,
      gender: 'male' as const,
      village: 'หมู่ 1 บ้านหลวง',
      subDistrict: 'บ้านหลวง' as const,
      facility: 'รพ.สต.บ้านหลวง',
      chronicDiseases: ['โรคไตเรื้อรัง (CKD)', 'ปอดอุดกั้นเรื้อรัง (COPD)'],
      medicationsCount: 7,
      adlScore: 3,
      adlGroup: 'ติดเตียง' as const,
      riskLevel: 'critical' as const,
      latestAlertStatus: 'acknowledged' as const,
      phone: '086-772-1904',
      address: '12 หมู่ 1 ต.บ้านหลวง อ.ดอนพุด จ.สระบุรี',
      emergencyContact: 'นางมาลี รักถิ่น (ภรรยา)',
      plan: {
        riskSummary: 'ผู้สูงอายุกลุ่มติดเตียง (ADL 3/20) ค่าออกซิเจนปลายนิ้วต่ำ (SpO2 90%) และต้องเฝ้าระวังแผลกดทับ',
        officerPlan: [
          'ส่งต่อแพทย์ รพ.ดอนพุด ประเมินภาวะพร่องออกซิเจนและการใช้เครื่องผลิตออกซิเจนที่บ้าน',
          'ทีมพยาบาลเยี่ยมบ้านตรวจประเมินแผลกดทับและการดูดเสมหะทุกสัปดาห์',
        ],
        familyGuide: [
          'พลิกตะแคงตัวทุก 2 ชั่วโมง ใช้หมอนรองบริเวณปุ่มกระดูกและส้นเท้า',
          'จัดท่านอนศีรษะสูง 30–45 องศา เพื่อช่วยให้หายใจสะดวกขึ้น',
        ],
        redFlags: [
          'หอบเหนื่อยมาก ริมฝีปากเขียวคล้ำ หรือ SpO2 ต่ำกว่า 90%',
          'มีไข้สูง หนาวสั่น หรือเสมหะเปลี่ยนสีขุ่นเขียว',
        ],
        recommendedReferral: true,
        suggestedFacility: 'รพ.ดอนพุด (โรงพยาบาลแม่ข่าย)',
        referralReason: 'กลุ่มติดเตียง SpO2 ต่ำ 90% ร่วมกับ COPD ต้องได้รับการประเมินจากแพทย์',
      },
    },
    {
      id: `dp-elder-04-${ts}`,
      hn: `DP-6804`,
      fullName: 'นางประนอม วงษ์งาว',
      age: 71,
      gender: 'female' as const,
      village: 'หมู่ 3 บ้านดงตะงาว',
      subDistrict: 'ดงตะงาว' as const,
      facility: 'รพ.สต.ดงตะงาว',
      chronicDiseases: ['ไขมันในเลือดสูง'],
      medicationsCount: 2,
      adlScore: 19,
      adlGroup: 'ติดสังคม' as const,
      riskLevel: 'normal' as const,
      latestAlertStatus: 'none' as const,
      phone: '084-118-3309',
      address: '89 หมู่ 3 ต.ดงตะงาว อ.ดอนพุด จ.สระบุรี',
      emergencyContact: 'นายปรีชา วงษ์งาว (บุตรชาย)',
      plan: {
        riskSummary: 'ผู้สูงอายุกลุ่มติดสังคม (ADL 19/20) สัญญาณชีพและสมรรถภาพร่างกายอยู่ในเกณฑ์ปกติ',
        officerPlan: [
          'ส่งเสริมเข้าร่วมชมรมผู้สูงอายุ ต.ดงตะงาว และตรวจคัดกรอง CGA ประจำปี',
        ],
        familyGuide: [
          'สนับสนุนให้ออกกำลังกายสม่ำเสมอ เช่น รำไม้พลองหรือเดินวันละ 30 นาที',
          'รับประทานอาหารครบ 5 หมู่ ลดอาหารมันและกะทิ',
        ],
        redFlags: [
          'หากมีอาการวิงเวียน หน้ามืด หรือหกล้ม ให้แจ้ง อสม. ประจำหมู่บ้าน',
        ],
        recommendedReferral: false,
        suggestedFacility: 'รพ.สต.ดงตะงาว',
        referralReason: 'ติดตามดูแลสุขภาพตามนัดปกติ',
      },
    },
    {
      id: `dp-elder-05-${ts}`,
      hn: `DP-6805`,
      fullName: 'นายสำราญ แสนสุข',
      age: 75,
      gender: 'male' as const,
      village: 'หมู่ 5 บ้านดอนพุด',
      subDistrict: 'ดอนพุด' as const,
      facility: 'รพ.สต.ดอนพุด',
      chronicDiseases: ['เบาหวาน (DM)', 'ความดันโลหิตสูง (HT)'],
      medicationsCount: 4,
      adlScore: 16,
      adlGroup: 'ติดสังคม' as const,
      riskLevel: 'watch' as const,
      latestAlertStatus: 'none' as const,
      phone: '087-990-4120',
      address: '77 หมู่ 5 ต.ดอนพุด อ.ดอนพุด จ.สระบุรี',
      emergencyContact: 'นางสาวกัญญา แสนสุข (หลานสาว)',
      plan: {
        riskSummary: 'กลุ่มติดสังคมที่ต้องเฝ้าระวังระดับน้ำตาลในเลือดสูง (FBS 192 mg/dL) และเริ่มมีภาวะการทรงตัวช้า',
        officerPlan: [
          'นัดตรวจติดตามระดับน้ำตาลปลายนิ้วที่ รพ.สต.ดอนพุด ใน 2 สัปดาห์',
          'ตรวจประเมินเท้าผู้ป่วยเบาหวาน (Foot Care) และคัดกรองจอประสาทตาประจำปี',
        ],
        familyGuide: [
          'ควบคุมปริมาณข้าว แป้ง และผลไม้รสหวานจัด ตรวจเช็กแผลที่เท้าทุกวัน',
          'สวมรองเท้าหุ้มส้นที่พอดีเท้าเมื่อเดินนอกบ้าน',
        ],
        redFlags: [
          'ใจสั่น เหงื่อออกมาก มือสั่น (น้ำตาลต่ำ) หรือมีแผลเรื้อรังที่เท้า',
        ],
        recommendedReferral: false,
        suggestedFacility: 'รพ.สต.ดอนพุด',
        referralReason: 'นัดติดตามปรับพฤติกรรมและตรวจน้ำตาลซ้ำ',
      },
    },
  ];

  const vitalsList = [
    { bpSys: 184, bpDia: 106, hr: 96, spo2: 96, fbs: 215, bmi: 26.4, dep: 0, cog: 4, tugt: 14.2, fall: true, poly: true, flags: ['ความดันวิกฤตสูง (184/106 mmHg)', 'ระดับน้ำตาลในเลือดสูง (215 mg/dL)', 'ใช้ยาหลายขนาน Polypharmacy (6 รายการ)'], status: 'referred' as const },
    { bpSys: 146, bpDia: 88, hr: 82, spo2: 97, fbs: 118, bmi: 21.8, dep: 1, cog: 3, tugt: 22.0, fall: true, poly: true, flags: ['ความเสี่ยงพลัดตกหกล้มสูง (TUGT 22 วินาที)', 'คัดกรอง 2Q พบความเสี่ยงภาวะซึมเศร้า (1/2 ข้อ)', 'ใช้ยาหลายขนาน Polypharmacy (5 รายการ)'], status: 'follow_up' as const },
    { bpSys: 132, bpDia: 78, hr: 108, spo2: 90, fbs: 134, bmi: 18.6, dep: 1, cog: 2, tugt: 35.0, fall: true, poly: true, flags: ['ค่าออกซิเจนปลายนิ้วต่ำมาก (SpO2 90%)', 'กลุ่มติดเตียง (Barthel ADL 3/20)', 'คัดกรอง Mini-Cog ต่ำกว่าเกณฑ์ (2/5 คะแนน)'], status: 'referred' as const },
    { bpSys: 122, bpDia: 76, hr: 72, spo2: 99, fbs: 98, bmi: 22.5, dep: 0, cog: 5, tugt: 9.4, fall: false, poly: false, flags: [], status: 'completed' as const },
    { bpSys: 142, bpDia: 86, hr: 78, spo2: 98, fbs: 192, bmi: 25.1, dep: 0, cog: 4, tugt: 14.0, fall: true, poly: false, flags: ['ระดับน้ำตาลในเลือดสูง (192 mg/dL)', 'การทรงตัวช้ากว่าเกณฑ์ เสี่ยงหกล้ม (TUGT 14 วินาที)'], status: 'follow_up' as const },
  ];

  eldersData.forEach((e, idx) => {
    const elderRef = doc(db, 'elders', e.id);
    batch.set(elderRef, {
      ownerId,
      hn: e.hn,
      fullName: e.fullName,
      age: e.age,
      gender: e.gender,
      village: e.village,
      subDistrict: e.subDistrict,
      facility: e.facility,
      chronicDiseases: e.chronicDiseases,
      medicationsCount: e.medicationsCount,
      adlScore: e.adlScore,
      adlGroup: e.adlGroup,
      riskLevel: e.riskLevel,
      latestAlertStatus: e.latestAlertStatus,
      aiCarePlanSummary: encodePlan(e.plan),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const contactRef = doc(db, 'elders', e.id, 'private', 'contact');
    batch.set(contactRef, {
      ownerId,
      phone: e.phone,
      address: e.address,
      emergencyContact: e.emergencyContact,
      updatedAt: serverTimestamp(),
    });

    const v = vitalsList[idx];
    const assessRef = doc(db, 'assessments', `dp-assess-0${idx + 1}-${ts}`);
    batch.set(assessRef, {
      ownerId,
      elderId: e.id,
      elderName: e.fullName,
      assessorName,
      facility: e.facility,
      bpSystolic: v.bpSys,
      bpDiastolic: v.bpDia,
      heartRate: v.hr,
      spo2: v.spo2,
      fbs: v.fbs,
      bmi: v.bmi,
      adlScore: e.adlScore,
      adlGroup: e.adlGroup,
      depress2Q: v.dep,
      cogMiniCog: v.cog,
      tugtSeconds: v.tugt,
      fallRisk: v.fall,
      polypharmacy: v.poly,
      riskLevel: e.riskLevel,
      abnormalFlags: v.flags,
      aiCarePlan: encodePlan(e.plan),
      status: v.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  // Active Alerts
  batch.set(doc(db, 'alerts', `dp-alert-01-${ts}`), {
    ownerId,
    elderId: eldersData[0].id,
    elderName: eldersData[0].fullName,
    severity: 'critical',
    title: 'ความดันโลหิตสูงวิกฤต 184/106 mmHg',
    description: 'ตรวจพบระหว่างการคัดกรอง CGA ที่ รพ.สต.ดอนพุด ร่วมกับน้ำตาลในเลือด 215 mg/dL แนะนำส่งต่อแพทย์ประเมินเร่งด่วน',
    source: 'cga_screening',
    acknowledged: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'alerts', `dp-alert-02-${ts}`), {
    ownerId,
    elderId: eldersData[1].id,
    elderName: eldersData[1].fullName,
    severity: 'urgent',
    title: 'ความเสี่ยงพลัดตกหกล้มสูง + คัดกรองซึมเศร้า 2Q ผิดปกติ',
    description: 'ญาติแจ้งผ่านแอปพลิเคชันว่าเดินเซตอนกลางคืน และคะแนน TUGT 22 วินาที ต้องจัดทีม CG เข้าประเมินสภาพแวดล้อมที่บ้าน',
    source: 'family_checkin',
    acknowledged: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'alerts', `dp-alert-03-${ts}`), {
    ownerId,
    elderId: eldersData[2].id,
    elderName: eldersData[2].fullName,
    severity: 'critical',
    title: 'ค่าออกซิเจนปลายนิ้วต่ำ (SpO2 90%) — กลุ่มติดเตียง',
    description: 'ผู้ป่วย COPD กลุ่มติดเตียงมีระดับออกซิเจนต่ำกว่าเกณฑ์ 92% ประสานส่งต่อ รพ.ดอนพุด แล้ว',
    source: 'ai_monitor',
    acknowledged: true,
    acknowledgedBy: assessorName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Referrals
  batch.set(doc(db, 'referrals', `dp-ref-01-${ts}`), {
    ownerId,
    elderId: eldersData[0].id,
    elderName: eldersData[0].fullName,
    fromFacility: 'รพ.สต.ดอนพุด',
    toFacility: 'รพ.ดอนพุด (โรงพยาบาลแม่ข่าย)',
    reason: 'ความดันโลหิตสูงวิกฤต 184/106 mmHg และปรับยา Polypharmacy 6 รายการ',
    urgency: 'emergency',
    status: 'pending',
    notes: 'แจ้งญาติเตรียมสมุดประจำตัวผู้สูงอายุและรายการยาทั้งหมด',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'referrals', `dp-ref-02-${ts}`), {
    ownerId,
    elderId: eldersData[2].id,
    elderName: eldersData[2].fullName,
    fromFacility: 'รพ.สต.บ้านหลวง',
    toFacility: 'รพ.ดอนพุด (โรงพยาบาลแม่ข่าย)',
    reason: 'SpO2 90% ในผู้ป่วยติดเตียง COPD ประเมินการให้ออกซิเจนต่อเนื่องที่บ้าน',
    urgency: 'urgent',
    status: 'in_transit',
    notes: 'รถกู้ชีพ อบต.บ้านหลวง กำลังนำส่งพร้อมพยาบาลเวชปฏิบัติ',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'referrals', `dp-ref-03-${ts}`), {
    ownerId,
    elderId: eldersData[1].id,
    elderName: eldersData[1].fullName,
    fromFacility: 'รพ.สต.ไผ่หลิ่ว',
    toFacility: 'ศูนย์ดูแลผู้สูงอายุ คปสอ.ดอนพุด (LTC)',
    reason: 'จัดทำแผนดูแลระยะยาว (Care Plan) และฟื้นฟูสมรรถภาพกลุ่มติดบ้าน',
    urgency: 'routine',
    status: 'completed',
    notes: 'Care Manager ลงทะเบียนเข้าสู่ระบบ LTC และมอบหมาย CG เรียบร้อยแล้ว',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Family Check-ins
  batch.set(doc(db, 'careLogs', `dp-log-01-${ts}`), {
    ownerId,
    elderId: eldersData[0].id,
    elderName: eldersData[0].fullName,
    loggedBy: 'นางสมหญิง ใจดี (บุตรสาว)',
    bpSystolic: 178,
    bpDiastolic: 102,
    mood: 'อ่อนเพลีย',
    appetite: 'ทานได้น้อย',
    medicationTaken: true,
    symptomNote: 'คุณพ่อบ่นมึนศีรษะเล็กน้อยหลังตื่นนอนเช้านี้',
    hasAbnormal: true,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'careLogs', `dp-log-02-${ts}`), {
    ownerId,
    elderId: eldersData[3].id,
    elderName: eldersData[3].fullName,
    loggedBy: 'นายปรีชา วงษ์งาว (บุตรชาย)',
    bpSystolic: 120,
    bpDiastolic: 74,
    mood: 'สดชื่น',
    appetite: 'ทานได้ดี',
    medicationTaken: true,
    symptomNote: 'เดินออกกำลังกายหน้าบ้านได้ตามปกติ',
    hasAbnormal: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'elders/seedBatch');
  }
}
