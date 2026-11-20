import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ',
    };
  }

  override componentDidCatch(error: Error) {
    console.error('Application ErrorBoundary caught:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  override render() {
    if (this.state.hasError) {
      let friendlyDetail = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.operationType) {
          friendlyDetail = `สิทธิ์เข้าถึงข้อมูลไม่เพียงพอ (${parsed.operationType} · ${parsed.path || 'cloud'}) — กรุณาตรวจสอบบัญชีผู้ใช้งานหรือรีเฟรชหน้าจอ`;
        }
      } catch {
        // non-JSON message
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  ไม่สามารถดำเนินการต่อได้ชั่วคราว
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed break-words">
                  {friendlyDetail}
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={this.handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    ลองใหม่อีกครั้ง
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    โหลดหน้าใหม่
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
