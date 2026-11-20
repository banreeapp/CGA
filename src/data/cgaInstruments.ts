import { EducationLevel } from '../types/cga';

export interface BarthelQuestion {
  id: number;
  title: string;
  options: { label: string; score: number }[];
}

export const BARTHEL_ADL_QUESTIONS: BarthelQuestion[] = [
  {
    id: 1,
    title: '1. รับประทานอาหารเมื่อเตรียมสำรับไว้ให้',
    options: [
      { label: 'ตักกินเองได้ปกติ', score: 2 },
      { label: 'ต้องมีคนช่วยตัก/ตัดคำ', score: 1 },
      { label: 'ต้องมีคนป้อน', score: 0 },
    ],
  },
  {
    id: 2,
    title: '2. ล้างหน้า หวีผม แปรงฟัน โกนหนวด',
    options: [
      { label: 'ทำเองได้', score: 1 },
      { label: 'ต้องการความช่วยเหลือ', score: 0 },
    ],
  },
  {
    id: 3,
    title: '3. ลุกนั่งจากที่นอน หรือจากเตียงไปยังเก้าอี้',
    options: [
      { label: 'ทำได้เอง', score: 3 },
      { label: 'ช่วยพยุงเล็กน้อย/บอกให้ทำ', score: 2 },
      { label: 'ช่วยเหลือมากจึงนั่งได้', score: 1 },
      { label: 'นั่งไม่ได้เลย', score: 0 },
    ],
  },
  {
    id: 4,
    title: '4. ใช้ห้องน้ำ',
    options: [
      { label: 'ช่วยตัวเองได้ดี', score: 2 },
      { label: 'ทำได้บ้าง ต้องมีคนช่วยบางส่วน', score: 1 },
      { label: 'ช่วยตัวเองไม่ได้', score: 0 },
    ],
  },
  {
    id: 5,
    title: '5. การเคลื่อนที่ภายในห้องหรือบ้าน',
    options: [
      { label: 'เดินเองได้', score: 3 },
      { label: 'เดินได้แต่ต้องช่วยพยุง/ไม้เท้า', score: 2 },
      { label: 'ใช้รถเข็นช่วยตัวเองได้', score: 1 },
      { label: 'เคลื่อนที่ไม่ได้', score: 0 },
    ],
  },
  {
    id: 6,
    title: '6. การสวมใส่เสื้อผ้า',
    options: [
      { label: 'สวมใส่เองได้ทั้งหมด', score: 2 },
      { label: 'ทำได้เองประมาณครึ่งหนึ่ง', score: 1 },
      { label: 'ต้องมีคนสวมให้ทั้งหมด', score: 0 },
    ],
  },
  {
    id: 7,
    title: '7. การขึ้นลงบันได 1 ชั้น',
    options: [
      { label: 'ขึ้นลงเองได้', score: 2 },
      { label: 'ต้องมีคนช่วยพยุง/เฝ้าระวัง', score: 1 },
      { label: 'ขึ้นลงไม่ได้', score: 0 },
    ],
  },
  {
    id: 8,
    title: '8. การอาบน้ำ',
    options: [
      { label: 'อาบน้ำเองได้', score: 1 },
      { label: 'ต้องมีคนช่วยอาบให้', score: 0 },
    ],
  },
  {
    id: 9,
    title: '9. การกลั้นอุจจาระ (ใน 1 สัปดาห์)',
    options: [
      { label: 'กลั้นได้ปกติ', score: 2 },
      { label: 'กลั้นไม่ได้บางครั้ง', score: 1 },
      { label: 'กลั้นไม่ได้เลย/ต้องสวน', score: 0 },
    ],
  },
  {
    id: 10,
    title: '10. การกลั้นปัสสาวะ (ใน 1 สัปดาห์)',
    options: [
      { label: 'กลั้นได้ปกติ', score: 2 },
      { label: 'กลั้นไม่ได้บางครั้ง', score: 1 },
      { label: 'กลั้นไม่ได้เลย/ใส่สายสวน', score: 0 },
    ],
  },
];

export const KNEE_OA_CRITERIA = [
  'ข้อเข่าฝืดตอนเช้าน้อยกว่า 30 นาที',
  'มีเสียงกรอบแกรบเมื่อเคลื่อนไหว',
  'กดเจ็บบริเวณขอบกระดูกข้อเข่า',
  'ข้อเข่าโตหรือผิดรูป',
  'คลำไม่พบข้ออุ่น',
] as const;

export const FRAIL_SCALE_QUESTIONS = [
  '1. รู้สึกอ่อนเพลียเกือบตลอดเวลาในช่วง 4 สัปดาห์ที่ผ่านมา',
  '2. ไม่สามารถเดินขึ้นบันได 1 ชั้น (10 ขั้น) ด้วยตนเองโดยไม่พัก',
  '3. ไม่สามารถเดินระยะทางประมาณ 100 เมตร ด้วยตนเองโดยไม่พัก',
  '4. มีโรคประจำตัวตั้งแต่ 5 โรคขึ้นไป',
  '5. น้ำหนักตัวลดลงโดยไม่ได้ตั้งใจ ตั้งแต่ 5% ขึ้นไปใน 1 ปี',
] as const;

export interface MnaQuestion {
  id: number;
  title: string;
  options: { label: string; score: number }[];
}

export const MNA_SF_QUESTIONS: MnaQuestion[] = [
  {
    id: 1,
    title: '1. ใน 3 เดือนที่ผ่านมา รับประทานอาหารได้น้อยลงหรือไม่',
    options: [
      { label: 'ไม่ลดลง', score: 2 },
      { label: 'ลดลงปานกลาง', score: 1 },
      { label: 'ลดลงอย่างมาก', score: 0 },
    ],
  },
  {
    id: 2,
    title: '2. ใน 3 เดือนที่ผ่านมา น้ำหนักลดลงโดยไม่ตั้งใจหรือไม่',
    options: [
      { label: 'ไม่ลดลง', score: 3 },
      { label: 'ลดลง 1-3 กก.', score: 2 },
      { label: 'ไม่ทราบ', score: 1 },
      { label: 'ลดลงมากกว่า 3 กก.', score: 0 },
    ],
  },
  {
    id: 3,
    title: '3. การเคลื่อนไหว',
    options: [
      { label: 'ออกนอกบ้านได้เอง', score: 2 },
      { label: 'ลุกจากเตียงได้แต่ไม่ออกนอกบ้าน', score: 1 },
      { label: 'ติดเตียง/รถเข็น', score: 0 },
    ],
  },
  {
    id: 4,
    title: '4. ใน 3 เดือนที่ผ่านมา มีความเครียดรุนแรงหรือป่วยเฉียบพลันหรือไม่',
    options: [
      { label: 'ไม่มี', score: 2 },
      { label: 'มี', score: 0 },
    ],
  },
  {
    id: 5,
    title: '5. มีปัญหาทางจิตประสาทหรือไม่',
    options: [
      { label: 'ไม่มีปัญหา', score: 2 },
      { label: 'ความจำเสื่อมเล็กน้อย', score: 1 },
      { label: 'ความจำเสื่อมหรือซึมเศร้ารุนแรง', score: 0 },
    ],
  },
  {
    id: 6,
    title: '6. ดัชนีมวลกาย (BMI) — ดึงค่าจากหน้าแรกอัตโนมัติ (หรือใช้รอบน่องแทน)',
    options: [
      { label: 'BMI ตั้งแต่ 23 / รอบน่องตั้งแต่ 31 ซม.', score: 3 },
      { label: 'BMI 21 ถึงน้อยกว่า 23', score: 2 },
      { label: 'BMI 19 ถึงน้อยกว่า 21', score: 1 },
      { label: 'BMI น้อยกว่า 19 / รอบน่องน้อยกว่า 31 ซม.', score: 0 },
    ],
  },
];

export const ZBI_12_QUESTIONS = [
  '1. รู้สึกว่าไม่มีเวลาให้ตัวเองเพียงพอเพราะต้องดูแลผู้สูงอายุ',
  '2. รู้สึกเครียดระหว่างการดูแลกับการรับผิดชอบงาน/ครอบครัวอื่น',
  '3. รู้สึกโกรธหรือหงุดหงิดเมื่ออยู่ใกล้ผู้สูงอายุ',
  '4. รู้สึกว่าการดูแลส่งผลกระทบต่อความสัมพันธ์กับคนในครอบครัว',
  '5. รู้สึกตึงเครียดเมื่อต้องอยู่กับผู้สูงอายุ',
  '6. รู้สึกว่าสุขภาพของท่านแย่ลงเนื่องจากการดูแล',
  '7. รู้สึกว่าไม่มีความเป็นส่วนตัวเท่าที่ต้องการ',
  '8. รู้สึกว่าชีวิตทางสังคมของท่านลดลงเพราะต้องดูแล',
  '9. รู้สึกสูญเสียการควบคุมชีวิตตนเองตั้งแต่ต้องดูแล',
  '10. รู้สึกไม่แน่ใจว่าควรทำอย่างไรในการดูแลผู้สูงอายุ',
  '11. รู้สึกว่าควรทำได้ดีกว่านี้ในการดูแล',
  '12. โดยรวมรู้สึกว่าภาระการดูแลหนักเกินไป',
] as const;

export const ZBI_OPTIONS = [
  { label: 'ไม่เคย (0)', score: 0 },
  { label: 'นานๆ ครั้ง (1)', score: 1 },
  { label: 'บางครั้ง (2)', score: 2 },
  { label: 'บ่อยครั้ง (3)', score: 3 },
  { label: 'เกือบตลอดเวลา (4)', score: 4 },
] as const;

export const EDUCATION_MMSE_INFO: Record<
  EducationLevel,
  { label: string; cutoff: number; maxScore: number }
> = {
  illiterate: {
    label: 'ไม่ได้เรียนหนังสือ / อ่านไม่ออกเขียนไม่ได้ (จุดตัด MMSE ไม่เกิน 14/23)',
    cutoff: 14,
    maxScore: 23,
  },
  primary: {
    label: 'ประถมศึกษา (จุดตัด MMSE ไม่เกิน 17/30)',
    cutoff: 17,
    maxScore: 30,
  },
  secondary_plus: {
    label: 'สูงกว่าประถมศึกษา (จุดตัด MMSE ไม่เกิน 22/30)',
    cutoff: 22,
    maxScore: 30,
  },
};

export interface MmseDomain {
  id: string;
  title: string;
  max: number;
  requiresLiteracy?: boolean;
}

export const MMSE_THAI_DOMAINS: MmseDomain[] = [
  { id: 'orientation_time', title: '1. Orientation for time (วัน/วันที่/เดือน/ปี/ฤดู)', max: 5 },
  { id: 'orientation_place', title: '2. Orientation for place (สถานที่/ตำบล/อำเภอ/จังหวัด/ภาค)', max: 5 },
  { id: 'registration', title: '3. Registration (ทวนคำ 3 คำ: ดอกไม้ แม่น้ำ รถไฟ)', max: 3 },
  { id: 'attention', title: '4. Attention/Calculation (คิดเลข 100-7 หรือสะกดคำถอยหลัง)', max: 5, requiresLiteracy: true },
  { id: 'recall', title: '5. Recall (ทวนคำ 3 คำซ้ำหลังเว้นช่วง)', max: 3 },
  { id: 'naming', title: '6. Naming (บอกชื่อสิ่งของ 2 ชิ้น: ดินสอ นาฬิกา)', max: 2 },
  { id: 'repetition', title: '7. Repetition (พูดตามประโยค: ใครใคร่ขายไก่ไข่)', max: 1 },
  { id: 'verbal_command', title: '8. Verbal command (รับกระดาษ พับครึ่ง วางบนพื้น/โต๊ะ)', max: 3 },
  { id: 'written_command', title: '9. Written command (อ่านและทำตามคำสั่ง: หลับตา)', max: 1, requiresLiteracy: true },
  { id: 'writing', title: '10. Writing (เขียนประโยคที่มีความหมาย 1 ประโยค)', max: 1, requiresLiteracy: true },
  { id: 'visuoconstruction', title: '11. Visuoconstruction (วาดภาพห้าเหลี่ยมซ้อนกัน)', max: 1 },
];

export const TGDS_15_QUESTIONS: { text: string; positiveAnswer: 'yes' | 'no' }[] = [
  { text: '1. โดยทั่วไปแล้วคุณพอใจกับชีวิตความเป็นอยู่ของตนเองหรือไม่', positiveAnswer: 'no' },
  { text: '2. คุณลดกิจกรรมหรือสิ่งที่เคยสนใจลงไปมากหรือไม่', positiveAnswer: 'yes' },
  { text: '3. คุณรู้สึกว่าชีวิตของคุณว่างเปล่าหรือไม่', positiveAnswer: 'yes' },
  { text: '4. คุณรู้สึกเบื่อหน่ายบ่อยๆ หรือไม่', positiveAnswer: 'yes' },
  { text: '5. คุณอารมณ์ดีเป็นส่วนใหญ่หรือไม่', positiveAnswer: 'no' },
  { text: '6. คุณกลัวว่าจะมีเรื่องร้ายๆ เกิดขึ้นกับคุณหรือไม่', positiveAnswer: 'yes' },
  { text: '7. คุณรู้สึกมีความสุขเป็นส่วนใหญ่หรือไม่', positiveAnswer: 'no' },
  { text: '8. คุณรู้สึกหมดหวังหรือไม่มีใครช่วยเหลือได้บ่อยๆ หรือไม่', positiveAnswer: 'yes' },
  { text: '9. คุณชอบอยู่กับบ้านมากกว่าออกไปข้างนอกเพื่อทำสิ่งใหม่ๆ หรือไม่', positiveAnswer: 'yes' },
  { text: '10. คุณรู้สึกว่าความจำของคุณแย่กว่าคนอื่นหรือไม่', positiveAnswer: 'yes' },
  { text: '11. คุณคิดว่าการมีชีวิตอยู่ทุกวันนี้เป็นสิ่งที่ดีหรือไม่', positiveAnswer: 'no' },
  { text: '12. คุณรู้สึกว่าตนเองไร้ค่าในสภาพที่เป็นอยู่ตอนนี้หรือไม่', positiveAnswer: 'yes' },
  { text: '13. คุณรู้สึกกระปรี้กระเปร่าเต็มเปี่ยมไปด้วยพลังหรือไม่', positiveAnswer: 'no' },
  { text: '14. คุณรู้สึกว่าสถานการณ์ของคุณสิ้นหวังหรือไม่', positiveAnswer: 'yes' },
  { text: '15. คุณคิดว่าคนอื่นส่วนใหญ่ดีกว่าคุณหรือไม่', positiveAnswer: 'yes' },
];

export const THAI_FRAT_ITEMS = [
  { id: 'history_fall', label: '1. มีประวัติการหกล้มตั้งแต่ 1 ครั้งขึ้นไปใน 6 เดือนที่ผ่านมา', weight: 5 },
  { id: 'med_risk', label: '2. รับประทานยาตั้งแต่ 4 ชนิดขึ้นไป หรือใช้ยาเสี่ยง (ยานอนหลับ/ลดความดัน/จิตเวช)', weight: 1 },
  { id: 'vision_loss', label: '3. มีความบกพร่องในการมองเห็น (อ่านหนังสือพิมพ์ไม่ได้ในระยะ 1 ฟุต)', weight: 1 },
  { id: 'balance_loss', label: '4. มีความบกพร่องในการทรงตัว / ยืนขาเดียวหรือเดินไม่มั่นคง', weight: 2 },
  { id: 'age_80', label: '5. อายุตั้งแต่ 80 ปีขึ้นไป', weight: 1 },
  { id: 'female', label: '6. เพศหญิง', weight: 1 },
] as const;

export const SARC_F_QUESTIONS = [
  { id: 'strength', label: '1. ความแข็งแรง: มีความลำบากในการยกหรือถือของหนัก 4.5 กก. หรือไม่' },
  { id: 'walk', label: '2. การเดิน: มีความลำบากในการเดินข้ามห้องหรือไม่' },
  { id: 'rise', label: '3. การลุกจากเก้าอี้: มีความลำบากในการลุกจากเก้าอี้หรือเตียงหรือไม่' },
  { id: 'climb', label: '4. การขึ้นบันได: มีความลำบากในการขึ้นบันได 10 ขั้นหรือไม่' },
  { id: 'falls', label: '5. การหกล้ม: ในปีที่ผ่านมาคุณหกล้มกี่ครั้ง (0=ไม่เลย, 1=1-3 ครั้ง, 2=≥4 ครั้ง)' },
] as const;

export const SARC_F_OPTIONS = [
  { label: 'ไม่มีเลย / ไม่ลำบาก (0)', score: 0 },
  { label: 'ค่อนข้างลำบาก / 1-3 ครั้ง (1)', score: 1 },
  { label: 'ลำบากมาก / ทำไม่ได้ / ≥4 ครั้ง (2)', score: 2 },
] as const;

export function bmiToMnaScore(bmi: number): number {
  if (!Number.isFinite(bmi) || bmi <= 0) return 3;
  if (bmi >= 23) return 3;
  if (bmi >= 21) return 2;
  if (bmi >= 19) return 1;
  return 0;
}
