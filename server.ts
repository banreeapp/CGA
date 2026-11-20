import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // AI Geriatric Specialist: Individualized Care Plan Generator
  app.post('/api/ai/care-plan', async (req, res) => {
    try {
      const { elder, assessment } = req.body ?? {};
      if (!elder || !assessment) {
        return res.status(400).json({ error: 'กรุณาส่งข้อมูลผู้สูงอายุและผลการประเมิน CGA ให้ครบถ้วน' });
      }

      const ai = getGeminiClient();
      const prompt = `
วิเคราะห์ผลการประเมินผู้สูงอายุแบบครบวงจร (CGA) ของ คปสอ.ดอนพุด และจัดทำแผนการดูแลรายบุคคล (Individualized Care Plan):
ข้อมูลผู้สูงอายุ:
- ชื่อ: ${elder.fullName} (อายุ ${elder.age} ปี, เพศ ${elder.gender}, หมู่บ้าน ${elder.village} ต.${elder.subDistrict}, หน่วยบริการ ${elder.facility})
- โรคประจำตัว: ${(elder.chronicDiseases || []).join(', ') || 'ไม่มีประวัติโรคเรื้อรัง'}
- จำนวนยาที่ใช้ประจำ: ${elder.medicationsCount} รายการ

ผลการประเมิน CGA ล่าสุด:
- ความดันโลหิต: ${assessment.bpSystolic}/${assessment.bpDiastolic} mmHg | ชีพจร: ${assessment.heartRate} bpm | SpO2: ${assessment.spo2}%
- น้ำตาลปลายนิ้ว/FBS: ${assessment.fbs} mg/dL | BMI: ${assessment.bmi}
- คะแนน Barthel ADL: ${assessment.adlScore}/20 (${assessment.adlGroup})
- คัดกรองซึมเศร้า 2Q: ${assessment.depress2Q}/2 | พุทธิปัญญา Mini-Cog: ${assessment.cogMiniCog}/5
- การทรงตัว TUGT: ${assessment.tugtSeconds} วินาที | ความเสี่ยงหกล้ม: ${assessment.fallRisk ? 'มีความเสี่ยง' : 'ปกติ'} | Polypharmacy: ${assessment.polypharmacy ? 'ใช่ (≥5 รายการ)' : 'ไม่ใช่'}
- ระดับความเสี่ยงรวม: ${assessment.riskLevel}
- ความผิดปกติที่ตรวจพบ: ${(assessment.abnormalFlags || []).join('; ') || 'ไม่พบสัญญาณผิดปกติเร่งด่วน'}${
        assessment.extendedSummary
          ? `\n- ผลประเมินเพิ่มเติม: FRAIL ${assessment.extendedSummary.frailScore ?? '-'}/5 | MNA-SF ${assessment.extendedSummary.mnaScore ?? '-'}/14 | ZBI-12 ${assessment.extendedSummary.zbiScore ?? 'ไม่ได้ประเมิน'} | MMSE-Thai ${assessment.extendedSummary.mmseScore ?? 'ไม่ได้ประเมิน'} | TGDS-15 ${assessment.extendedSummary.tgdsScore ?? 'ไม่ได้ประเมิน'} | Thai-FRAT ${assessment.extendedSummary.thaiFratScore ?? 'ไม่ได้ประเมิน'} | SARC-F ${assessment.extendedSummary.sarcFScore ?? 'ไม่ได้ประเมิน'}`
          : ''
      }
      `.trim();

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'คุณคือแพทย์และพยาบาลเวชปฏิบัติผู้เชี่ยวชาญด้านเวชศาสตร์ผู้สูงอายุ (Geriatric Care Specialist) ประจำ คปสอ.ดอนพุด จ.สระบุรี ' +
            'ให้คำแนะนำที่อิงมาตรฐานกรมอนามัยและแนวทาง LTC กระทรวงสาธารณสุข ตอบเป็นภาษาไทยที่ชัดเจน ตรงประเด็น ปฏิบัติได้จริงทั้งระดับ รพ.สต./รพ.ดอนพุด และระดับครอบครัว/อสม.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskSummary: {
                type: Type.STRING,
                description: 'สรุปการตีความผล CGA และระดับความเสี่ยงทางคลินิกอย่างกระชับ 2-3 ประโยค',
              },
              officerPlan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'แผนปฏิบัติการสำหรับเจ้าหน้าที่สาธารณสุข / Care Manager / CG จำนวน 3-5 ข้อ',
              },
              familyGuide: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'คำแนะนำการดูแลที่บ้านสำหรับครอบครัวและผู้ดูแลด้วยภาษาเข้าใจง่าย 3-5 ข้อ',
              },
              redFlags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'สัญญาณอันตรายฉุกเฉินที่ต้องรีบนำส่ง รพ.ดอนพุด หรือโทร 1669 ทันที 2-4 ข้อ',
              },
              recommendedReferral: {
                type: Type.BOOLEAN,
                description: 'ควรเปิดใบส่งต่อผู้ป่วยหรือไม่',
              },
              suggestedFacility: {
                type: Type.STRING,
                description: 'หน่วยบริการปลายทางที่แนะนำ เช่น รพ.ดอนพุด คลินิกผู้สูงอายุ หรือ ศูนย์ LTC',
              },
              referralReason: {
                type: Type.STRING,
                description: 'เหตุผลประกอบการส่งต่อ (ระบุสั้นๆ)',
              },
            },
            required: [
              'riskSummary',
              'officerPlan',
              'familyGuide',
              'redFlags',
              'recommendedReferral',
              'suggestedFacility',
              'referralReason',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถสร้างแผนการดูแลด้วย AI ได้';
      console.error('AI Care Plan Error:', message);
      return res.status(500).json({ error: message });
    }
  });

  // AI Monthly Executive Report Narrative
  app.post('/api/ai/monthly-summary', async (req, res) => {
    try {
      const { monthLabel, stats } = req.body ?? {};
      if (!stats) {
        return res.status(400).json({ error: 'ไม่พบข้อมูลสถิติประจำเดือน' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `สรุปรายงานผลการคัดกรองผู้สูงอายุแบบครบวงจร (CGA) ประจำเดือน ${monthLabel || 'ปัจจุบัน'} ของ คปสอ.ดอนพุด:\n${JSON.stringify(stats, null, 2)}`,
        config: {
          systemInstruction:
            'คุณคือผู้เชี่ยวชาญด้านสาธารณสุขและเวชศาสตร์ผู้สูงอายุ จัดทำบทสรุปผู้บริหาร (Executive Summary) และข้อเสนอแนะเชิงนโยบายรายเดือนสำหรับ คปสอ.ดอนพุด โดยระบุตัวเลขจริงจากข้อมูลที่ส่งมาอย่างแม่นยำ ตอบเป็นภาษาไทย',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: {
                type: Type.STRING,
                description: 'บทสรุปสถานการณ์สุขภาพผู้สูงอายุ คปสอ.ดอนพุด ประจำเดือน (1 ย่อหน้ากระชับ)',
              },
              keyHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'ประเด็นสำคัญจากการคัดกรองและการส่งต่อ 3-4 ข้อ',
              },
              actionRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'ข้อเสนอแนะเชิงรุกสำหรับ รพ.สต. และทีม CG ในเดือนถัดไป 3 ข้อ',
              },
            },
            required: ['executiveSummary', 'keyHighlights', 'actionRecommendations'],
          },
        },
      });

      return res.json(JSON.parse(response.text || '{}'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถสรุปรายงานประจำเดือนได้';
      console.error('AI Monthly Summary Error:', message);
      return res.status(500).json({ error: message });
    }
  });

  // Google Sheets Export Proxy (receives client OAuth Bearer token)
  app.post('/api/sheets/export', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบด้วยบัญชี Google เพื่อขอสิทธิ์เชื่อมต่อ Google Sheets' });
      }

      const { title, summaryRows, elderRows, assessmentRows, referralRows, existingSpreadsheetId } = req.body ?? {};
      let spreadsheetId = typeof existingSpreadsheetId === 'string' && existingSpreadsheetId.trim() ? existingSpreadsheetId.trim() : '';
      let spreadsheetUrl = '';

      if (!spreadsheetId) {
        // Create a brand new Google Spreadsheet with 4 structured tabs
        const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              title: title || `รายงาน CGA คปสอ.ดอนพุด (${new Date().toLocaleDateString('th-TH')})`,
              locale: 'th_TH',
            },
            sheets: [
              { properties: { title: 'สรุปรายเดือน', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'ทะเบียนผู้สูงอายุ', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'ผลประเมิน_CGA', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'ระบบส่งต่อ', gridProperties: { frozenRowCount: 1 } } },
            ],
          }),
        });

        const createData = await createResp.json();
        if (!createResp.ok) {
          return res.status(createResp.status).json({
            error: createData?.error?.message || 'ไม่สามารถสร้างไฟล์ Google Sheets ได้',
          });
        }
        spreadsheetId = createData.spreadsheetId;
        spreadsheetUrl = createData.spreadsheetUrl;
      } else {
        // Verify existing spreadsheet metadata first (avoid hardcoding sheet names blindly)
        const metaResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,spreadsheetUrl,sheets.properties.title`, {
          headers: { Authorization: authHeader },
        });
        const metaData = await metaResp.json();
        if (!metaResp.ok) {
          return res.status(metaResp.status).json({
            error: metaData?.error?.message || 'ไม่สามารถเข้าถึงสเปรดชีตที่ระบุได้',
          });
        }
        spreadsheetUrl = metaData.spreadsheetUrl;

        const existingTabs = new Set((metaData.sheets || []).map((s: { properties?: { title?: string } }) => s.properties?.title));
        const requiredTabs = ['สรุปรายเดือน', 'ทะเบียนผู้สูงอายุ', 'ผลประเมิน_CGA', 'ระบบส่งต่อ'];
        const missingTabs = requiredTabs.filter((t) => !existingTabs.has(t));
        if (missingTabs.length > 0) {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: missingTabs.map((t) => ({
                addSheet: { properties: { title: t } },
              })),
            }),
          });
        }
      }

      // Write values across all 4 tabs via values:batchUpdate
      const dataRanges = [
        { range: `'สรุปรายเดือน'!A1`, values: summaryRows || [] },
        { range: `'ทะเบียนผู้สูงอายุ'!A1`, values: elderRows || [] },
        { range: `'ผลประเมิน_CGA'!A1`, values: assessmentRows || [] },
        { range: `'ระบบส่งต่อ'!A1`, values: referralRows || [] },
      ];

      // Clear target sheets first so stale rows don't linger on update
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchClear`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ranges: [`'สรุปรายเดือน'!A1:Z500`, `'ทะเบียนผู้สูงอายุ'!A1:Z2000`, `'ผลประเมิน_CGA'!A1:Z2000`, `'ระบบส่งต่อ'!A1:Z2000`],
        }),
      });

      const updateResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: dataRanges,
        }),
      });

      const updateData = await updateResp.json();
      if (!updateResp.ok) {
        return res.status(updateResp.status).json({
          error: updateData?.error?.message || 'อัปเดตข้อมูลลง Google Sheets ไม่สำเร็จ',
        });
      }

      return res.json({
        spreadsheetId,
        spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        updatedCells: updateData.totalUpdatedCells || 0,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets';
      console.error('Google Sheets Export Error:', message);
      return res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Don Phut CGA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
