import React from 'react';
import { X, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { NAV_ITEMS, NavTab, SCHOOL, pathForTab } from '../config/navigation';
import { BrandMark } from './BrandMark';

export type { NavTab };

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab, collapsed, setCollapsed, mobileOpen, setMobileOpen
}) => {
  const { profile, isTeacher, isRootAdmin, logout } = useAuth();
  const { attempts, questions } = useData();

  const studentId = profile?.uid || 'guest-student';
  const uniqueMistakes = new Set(
    attempts.filter(a => a.studentId === studentId && !a.isCorrect && !a.resolvedAfterReview).map(a => a.questionId)
  ).size;
  const pendingQuestions = questions.filter(q => (q.approvalStatus || 'approved') === 'pending').length;

  const badges: Partial<Record<NavTab, number>> = {
    student_mistakes: uniqueMistakes || undefined,
    teacher_questions: pendingQuestions || undefined
  };

  const audience = isTeacher ? 'teacher' : 'student';
  const items = NAV_ITEMS.filter(i => i.audience === audience && !i.hidden && (!i.rootOnly || isRootAdmin));

  // Gom theo nhóm, giữ nguyên thứ tự xuất hiện
  const groups: { name: string; items: typeof items }[] = [];
  items.forEach(i => {
    const g = groups.find(x => x.name === i.section);
    if (g) g.items.push(i); else groups.push({ name: i.section, items: [i] });
  });

  const roleLabel = isRootAdmin ? 'Quản trị viên gốc' : isTeacher ? 'Giáo viên Toán' : 'Học sinh';
  const initial = profile?.displayName?.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() || (isTeacher ? 'G' : 'H');

  const select = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/55 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Menu chính"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-blue-950 text-blue-100 transition-[transform,width] duration-200 w-72 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-[4.5rem]' : 'md:w-66'}`}
      >
        {/* Thương hiệu */}
        <div className={`h-[4.25rem] shrink-0 flex items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
          <BrandMark size={40} className="ring-2 ring-white/25" />
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-xs text-blue-300 truncate">{SCHOOL.dept}</div>
              <div className="font-display text-base font-semibold text-white truncate">{SCHOOL.school}</div>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className={`flex-1 overflow-y-auto py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
          {groups.map((g, gi) => (
            <div key={g.name} className={gi > 0 ? 'mt-4' : ''}>
              {!collapsed ? (
                <div className="px-3 pb-1.5 text-xs font-medium text-blue-400">{g.name}</div>
              ) : gi > 0 ? (
                <div className="mx-3 mb-2 border-t border-white/10" />
              ) : null}

              <ul className="space-y-0.5">
                {g.items.map(item => {
                  const active = activeTab === item.id || (item.id === 'teacher_curriculum' && activeTab === 'teacher_review');
                  const Icon = item.icon;
                  const badge = badges[item.id];
                  return (
                    <li key={item.id} className="relative group">
                      <a
                        href={pathForTab(item.id)}
                        onClick={(e) => {
                          // Giữ hành vi mở tab mới khi giữ Ctrl/Cmd hoặc bấm giữa
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                          e.preventDefault();
                          select(item.id);
                        }}
                        aria-current={active ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                        className={`relative w-full flex items-center rounded-lg text-sm transition-colors no-underline ${
                          collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
                        } ${active ? 'bg-white/12 text-white font-semibold' : 'text-blue-200 hover:bg-white/6 hover:text-white'}`}
                      >
                        {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-flame-500" />}
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-white' : 'text-blue-300'}`} aria-hidden="true" />
                        {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                        {badge !== undefined && (
                          collapsed ? (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-blue-950" />
                          ) : (
                            <span className="min-w-5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[13px] font-semibold text-center tabular-nums">
                              {badge}
                            </span>
                          )
                        )}
                      </a>
                      {collapsed && (
                        <div className="hidden md:group-hover:flex absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-950 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50">
                          {item.label}{badge !== undefined ? ` (${badge})` : ''}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Người dùng */}
        <div className={`shrink-0 border-t border-white/10 ${collapsed ? 'p-2' : 'p-3'} space-y-2`}>
          <div className={`flex items-center rounded-lg bg-white/6 ${collapsed ? 'flex-col gap-2 p-2' : 'gap-2.5 p-2'}`}>
            <div
              className="w-8 h-8 rounded-md bg-blue-100 text-blue-900 flex items-center justify-center font-semibold text-sm shrink-0"
              title={profile?.displayName || 'Người dùng'}
            >
              {initial}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-sm font-medium text-white truncate">{profile?.displayName || 'Người dùng'}</div>
                <div className="text-xs text-blue-300 truncate">{roleLabel}</div>
              </div>
            )}
            <button
              onClick={logout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="p-1.5 rounded-md text-blue-300 hover:text-white hover:bg-white/10 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center gap-2 py-2 text-xs text-blue-300 hover:text-white hover:bg-white/6 rounded-lg"
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : (<><PanelLeftClose className="w-4 h-4" /><span>Thu gọn menu</span></>)}
          </button>
        </div>
      </aside>
    </>
  );
};
