import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  Activity,
  Bell,
  ClipboardPlus,
  FileSpreadsheet,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Smartphone,
  UserCircle2,
} from 'lucide-react';
import {
  OperationType,
  db,
  googleSignIn,
  handleFirestoreError,
  initAuth,
  logout,
  testConnection,
} from './lib/firebase';
import { seedDonPhutSampleData } from './lib/seedData';
import {
  AlertItem,
  Assessment,
  BackupRecord,
  CareLogItem,
  Elder,
  FIELD_LIMITS,
  ReferralItem,
  UserProfile,
  truncateStr,
} from './types/cga';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { DashboardView } from './components/DashboardView';
import { ScreeningView } from './components/ScreeningView';
import { AlertsReferralsView } from './components/AlertsReferralsView';
import { FamilyMobileView } from './components/FamilyMobileView';
import { ReportsBackupView } from './components/ReportsBackupView';
import { ElderDetailDrawer } from './components/ElderDetailDrawer';

type NavTab = 'overview' | 'screening' | 'alerts' | 'family' | 'reports';

function timestampMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function sortByCreatedDesc<T extends { createdAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [screeningElderId, setScreeningElderId] = useState<string | undefined>(undefined);
  const [drawerElder, setDrawerElder] = useState<Elder | null>(null);

  const [elders, setElders] = useState<Elder[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [careLogs, setCareLogs] = useState<CareLogItem[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    testConnection();
    const unsub = initAuth((firebaseUser, token) => {
      setUser(firebaseUser);
      setAccessToken(token);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Ensure user operational profile and isolated PII exist on sign-in
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setElders([]);
      setAssessments([]);
      setAlerts([]);
      setReferrals([]);
      setCareLogs([]);
      setBackups([]);
      setDataLoading(false);
      return;
    }

    let cancelled = false;
    const syncProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        const isBootstrappedAdmin =
          user.emailVerified && user.email === 'banreeapp@gmail.com';
        if (!snap.exists()) {
          const profilePayload: UserProfile = {
            uid: user.uid,
            displayName: truncateStr(
              user.displayName || user.email?.split('@')[0] || 'เจ้าหน้าที่ คปสอ.ดอนพุด',
              FIELD_LIMITS.NAME_MAX,
            ),
            role: isBootstrappedAdmin ? 'admin' : 'officer',
            facility: 'คปสอ.ดอนพุด จ.สระบุรี',
          };
          await setDoc(userRef, {
            ...profilePayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
            uid: user.uid,
            email: truncateStr(user.email || 'unknown@donphut.local', 160),
            updatedAt: serverTimestamp(),
          });
          if (!cancelled) setUserProfile(profilePayload);
        } else if (!cancelled) {
          setUserProfile(snap.data() as UserProfile);
        }
      } catch (err) {
        console.error('Profile sync note:', err);
      }
    };

    syncProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Real-time Firestore subscriptions
  useEffect(() => {
    if (!authReady || !user) return;
    setDataLoading(true);

    const isAdminUser = user.emailVerified && user.email === 'banreeapp@gmail.com';
    const buildQuery = (colName: string) =>
      isAdminUser
        ? collection(db, colName)
        : query(collection(db, colName), where('ownerId', '==', user.uid));

    const unsubElders = onSnapshot(
      buildQuery('elders'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Elder, 'id'>) }));
        setElders(sortByCreatedDesc(rows));
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'elders'),
    );

    const unsubAssessments = onSnapshot(
      buildQuery('assessments'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Assessment, 'id'>) }));
        setAssessments(sortByCreatedDesc(rows));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'assessments'),
    );

    const unsubAlerts = onSnapshot(
      buildQuery('alerts'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AlertItem, 'id'>) }));
        setAlerts(sortByCreatedDesc(rows));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'alerts'),
    );

    const unsubReferrals = onSnapshot(
      buildQuery('referrals'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReferralItem, 'id'>) }));
        setReferrals(sortByCreatedDesc(rows));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'referrals'),
    );

    const unsubCareLogs = onSnapshot(
      buildQuery('careLogs'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CareLogItem, 'id'>) }));
        setCareLogs(sortByCreatedDesc(rows));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'careLogs'),
    );

    const unsubBackups = onSnapshot(
      buildQuery('backups'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BackupRecord, 'id'>) }));
        setBackups(sortByCreatedDesc(rows));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'backups'),
    );

    return () => {
      unsubElders();
      unsubAssessments();
      unsubAlerts();
      unsubReferrals();
      unsubCareLogs();
      unsubBackups();
    };
  }, [authReady, user]);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setAccessToken(res.accessToken);
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบด้วยบัญชี Google ได้',
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSeedSample = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      await seedDonPhutSampleData(
        user.uid,
        userProfile?.displayName || user.displayName || 'พยาบาลวิชาชีพ คปสอ.ดอนพุด',
      );
    } finally {
      setSeeding(false);
    }
  };

  const handleAcknowledgeAlert = async (alert: AlertItem) => {
    if (!user) return;
    const actor = truncateStr(
      userProfile?.displayName || user.displayName || 'เจ้าหน้าที่สาธารณสุข',
      FIELD_LIMITS.NAME_MAX,
    );
    try {
      await updateDoc(doc(db, 'alerts', alert.id), {
        acknowledged: true,
        acknowledgedBy: actor,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'elders', alert.elderId), {
        latestAlertStatus: 'acknowledged',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `alerts/${alert.id}`);
    }
  };

  const handleStartScreening = (elderId?: string) => {
    setScreeningElderId(elderId);
    setActiveTab('screening');
  };

  const unackedAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  const navItems: { id: NavTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'ภาพรวม', shortLabel: 'ภาพรวม', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'screening', label: 'คัดกรอง CGA', shortLabel: 'คัดกรอง', icon: <ClipboardPlus className="w-4 h-4" /> },
    { id: 'alerts', label: 'แจ้งเตือน & ส่งต่อ', shortLabel: 'แจ้งเตือน', icon: <Bell className="w-4 h-4" /> },
    { id: 'family', label: 'โหมดครอบครัว', shortLabel: 'ครอบครัว', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'reports', label: 'รายงาน & สำรอง', shortLabel: 'รายงาน', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: Exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          คปสอ.ดอนพุด CGA
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'screening') setScreeningElderId(undefined);
                setActiveTab(item.id);
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === item.id
                  ? 'text-teal-800 border-teal-700 font-semibold'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              {item.label}
              {item.id === 'alerts' && unackedAlertsCount > 0 ? ` (${unackedAlertsCount})` : ''}
            </button>
          ))}
        </nav>

        <div className="shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => handleStartScreening(undefined)}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              + คัดกรองใหม่
            </button>
          ) : (
            <GoogleSignInButton
              onClick={handleGoogleLogin}
              disabled={signingIn}
              label="Sign in with Google"
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      {!authReady ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-12">
          <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </main>
      ) : !user ? (
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-teal-800">
                  คณะกรรมการประสานงานสาธารณสุขอำเภอดอนพุด · จังหวัดสระบุรี
                </p>
                <h1 className="mt-3 text-3xl lg:text-4xl font-bold text-slate-900 leading-tight text-balance">
                  ระบบประเมินผู้สูงอายุแบบครบวงจร (CGA) เชื่อมโยงเรียลไทม์
                </h1>
                <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-2xl">
                  ยกระดับการคัดกรองและส่งต่อผู้สูงอายุระหว่าง รพ.สต. ทั้ง 4 ตำบล กับ รพ.ดอนพุด พร้อมระบบวิเคราะห์แผนการดูแลรายบุคคลด้วย AI แจ้งเตือนอาการผิดปกติทันที และติดตามต่อเนื่องร่วมกับครอบครัว
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Activity className="w-4 h-4 text-teal-700" />
                      คัดกรอง CGA & ส่งต่ออัตโนมัติ
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      ประเมิน Barthel ADL, 2Q, Mini-Cog, TUGT และสัญญาณชีพ พร้อมจัดกลุ่มติดสังคม/ติดบ้าน/ติดเตียง
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <HeartHandshake className="w-4 h-4 text-teal-700" />
                      แผนดูแลรายบุคคลและแอปครอบครัว
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      AI ผู้เชี่ยวชาญสร้างคำแนะนำเฉพาะบุคคลให้ทั้งเจ้าหน้าที่สาธารณสุขและครอบครัวติดตามผ่านมือถือ
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                      รายงานรายเดือน Google Sheets
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      สรุปรายงาน 4 ตำบลอัตโนมัติและส่งออกลง Google Sheets พร้อมบทสรุปผู้บริหารโดย AI
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      ฐานข้อมูล Cloud & สำรองอัตโนมัติ
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      บันทึกประวัติสุขภาพลง Cloud Firestore อย่างปลอดภัย พร้อมระบบสร้างจุดสำรองย้อนหลัง
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
                <GoogleSignInButton
                  onClick={handleGoogleLogin}
                  disabled={signingIn}
                  label={signingIn ? 'กำลังเข้าสู่ระบบ...' : 'Sign in with Google'}
                />
                <span className="text-xs text-slate-500">
                  เข้าสู่ระบบเพื่อซิงก์ฐานข้อมูล Cloud และเชื่อมต่อ Google Sheets
                </span>
              </div>
              {authError && (
                <p className="mt-3 text-xs text-red-600">{authError}</p>
              )}
            </div>

            <div className="lg:col-span-5 bg-teal-900 text-white rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-teal-200">เครือข่ายบริการสุขภาพอำเภอดอนพุด</p>
                <h2 className="mt-2 text-2xl font-bold leading-snug text-balance">
                  ดูแลผู้สูงอายุอย่างต่อเนื่อง จาก รพ.สต. ถึงบ้าน
                </h2>
                <div className="mt-8 flex justify-center">
                  <svg
                    viewBox="0 0 280 200"
                    className="w-full max-w-xs h-auto"
                    aria-hidden="true"
                  >
                    <rect x="20" y="24" width="240" height="152" rx="16" fill="#0f766e" stroke="#5eead4" strokeWidth="1.5" strokeOpacity="0.4" />
                    <circle cx="84" cy="84" r="24" fill="#14b8a6" fillOpacity="0.25" stroke="#99f6e4" strokeWidth="1.5" />
                    <path d="M84 72v24M72 84h24" stroke="#f0fdfa" strokeWidth="3" strokeLinecap="round" />
                    <rect x="128" y="64" width="104" height="10" rx="5" fill="#ccfbf1" fillOpacity="0.85" />
                    <rect x="128" y="84" width="76" height="8" rx="4" fill="#99f6e4" fillOpacity="0.45" />
                    <rect x="128" y="100" width="90" height="8" rx="4" fill="#99f6e4" fillOpacity="0.35" />
                    <path d="M48 142h184" stroke="#5eead4" strokeOpacity="0.3" strokeWidth="1" />
                    <circle cx="64" cy="156" r="5" fill="#34d399" />
                    <rect x="78" y="152" width="60" height="8" rx="4" fill="#ccfbf1" fillOpacity="0.7" />
                    <rect x="164" y="150" width="68" height="12" rx="6" fill="#f0fdfa" fillOpacity="0.2" />
                  </svg>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-teal-800 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-teal-200">พื้นที่ครอบคลุม</div>
                  <div className="mt-1 font-semibold text-sm">4 ตำบล · รพ.ดอนพุด</div>
                </div>
                <div>
                  <div className="text-teal-200">มาตรฐานคัดกรอง</div>
                  <div className="mt-1 font-semibold text-sm">Barthel ADL · 2Q · Mini-Cog</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 flex gap-6 pb-24 md:pb-10">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex flex-col w-60 shrink-0 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                  <UserCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {userProfile?.displayName || user.displayName || 'เจ้าหน้าที่สาธารณสุข'}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {userProfile?.facility || 'คปสอ.ดอนพุด จ.สระบุรี'}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Google Sheets: {accessToken ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-red-700 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออก
                </button>
              </div>
            </div>

            <nav className="bg-white border border-slate-200 rounded-xl p-2 space-y-1">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'screening') setScreeningElderId(undefined);
                      setActiveTab(item.id);
                    }}
                    className={`w-full min-h-[42px] px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
                      active
                        ? 'bg-teal-50 text-teal-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      {item.icon}
                      {item.label}
                    </span>
                    {item.id === 'alerts' && unackedAlertsCount > 0 && (
                      <span className="font-mono-tabular text-xs font-semibold text-red-700">
                        {unackedAlertsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
              <div className="font-semibold text-slate-800">สถานะฐานข้อมูล Cloud</div>
              <p className="leading-relaxed">
                ข้อมูลคัดกรองและติดตามจากครอบครัวซิงก์ตรงเข้าสู่ Firestore แบบเรียลไทม์ ({elders.length} ทะเบียน)
              </p>
            </div>
          </aside>

          {/* Main Workspace Viewport */}
          <main className="flex-1 min-w-0">
            {activeTab === 'overview' && (
              <DashboardView
                elders={elders}
                assessments={assessments}
                alerts={alerts}
                referrals={referrals}
                loading={dataLoading}
                seeding={seeding}
                onSeedSampleData={handleSeedSample}
                onStartScreening={handleStartScreening}
                onSelectElder={(el) => setDrawerElder(el)}
                onAcknowledgeAlert={handleAcknowledgeAlert}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'screening' && (
              <ScreeningView
                ownerId={user.uid}
                assessorName={userProfile?.displayName || user.displayName || 'เจ้าหน้าที่สาธารณสุข'}
                elders={elders}
                assessments={assessments}
                referrals={referrals}
                preselectedElderId={screeningElderId}
                accessToken={accessToken}
                onRequestGoogleAuth={handleGoogleLogin}
                onComplete={() => setActiveTab('overview')}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsReferralsView
                ownerId={user.uid}
                userName={userProfile?.displayName || user.displayName || 'เจ้าหน้าที่สาธารณสุข'}
                elders={elders}
                alerts={alerts}
                referrals={referrals}
                onAcknowledgeAlert={handleAcknowledgeAlert}
                onSelectElder={(el) => setDrawerElder(el)}
              />
            )}

            {activeTab === 'family' && (
              <FamilyMobileView
                ownerId={user.uid}
                caregiverName={userProfile?.displayName || user.displayName || 'ผู้ดูแลในครอบครัว'}
                elders={elders}
                careLogs={careLogs}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsBackupView
                ownerId={user.uid}
                accessToken={accessToken}
                onRequestGoogleAuth={handleGoogleLogin}
                elders={elders}
                assessments={assessments}
                alerts={alerts}
                referrals={referrals}
                careLogs={careLogs}
                backups={backups}
              />
            )}
          </main>
        </div>
      )}

      {/* Mobile Bottom Thumb Navigation (≤15% viewport height, 44px+ hitboxes) */}
      {user && (
        <nav
          aria-label="เมนูหลักมือถือ"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center"
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'screening') setScreeningElderId(undefined);
                  setActiveTab(item.id);
                }}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-teal-800 font-semibold' : 'text-slate-500'
                }`}
              >
                {item.icon}
                <span className="truncate max-w-full px-1">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Elder Detail & AI Care Plan Drawer */}
      <ElderDetailDrawer
        elder={drawerElder}
        assessments={assessments}
        onClose={() => setDrawerElder(null)}
        onRescreen={(elderId) => handleStartScreening(elderId)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
