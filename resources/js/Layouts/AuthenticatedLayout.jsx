import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

function NavIcon({ children }) {
    return <span className="text-base leading-none text-emerald-700">{children}</span>;
}

export default function AuthenticatedLayout({ header, children, variant = 'dark' }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const userInitial = user.name.charAt(0).toUpperCase();
    const allowedModules = user.allowed_modules ?? [];
    const canAccess = (module) => allowedModules.includes(module);
    const isMasterAdmin = user.role?.is_master_admin === true;
    const impersonation = auth.impersonation ?? { is_active: false, impersonator: null };

    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const isLight = variant === 'light';

    const navItems = [
        { key: 'dashboard', href: 'dashboard', routePattern: 'dashboard', label: 'Dashboard', icon: '⌂' },
        { key: 'laporan', href: 'laporan.index', routePattern: 'laporan.*', label: 'Laporan', icon: '▤' },
        { key: 'carian-pemilih', href: 'carian-pemilih.index', routePattern: 'carian-pemilih.*', label: 'Carian', icon: '⌕' },
        { key: 'program', href: 'program.index', routePattern: 'program.*', label: 'Program', icon: '⌘' },
        { key: 'jawatankuasa', href: 'jawatankuasa.index', routePattern: 'jawatankuasa.*', label: 'Jawatankuasa', icon: '♙' },
        { key: 'culaan', href: 'culaan.index', routePattern: 'culaan.*', label: 'Culaan', icon: '⊙' },
        { key: 'settings', href: 'settings.edit', routePattern: 'settings.edit', label: 'Settings', icon: '⚙' },
    ];

    return (
        <div className={isLight
            ? 'min-h-screen bg-[#f7fbf8] text-slate-950'
            : 'min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top_right,_rgba(139,92,246,0.12),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(236,72,153,0.08),_transparent_50%)]'}>
            <nav className={isLight
                ? 'sticky top-0 z-30 border-b border-emerald-100/80 bg-white/95 shadow-sm shadow-emerald-900/5 backdrop-blur-xl'
                : 'sticky top-0 z-30 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-xl'}>
                <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
                    <div className={isLight ? 'flex h-16 items-center justify-between' : 'flex h-12 items-center justify-between'}>
                        <div className="flex items-center gap-2">
                            <Link href={route('dashboard')} className="flex shrink-0 items-center gap-2">
                                <div className={isLight
                                    ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                                    : 'flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-sm'}>
                                    <ApplicationLogo className={isLight ? 'block h-5 w-5 fill-current text-white' : 'block h-4 w-4 fill-current text-white'} />
                                </div>
                                <span className={isLight ? 'hidden text-lg font-extrabold text-slate-950 sm:inline' : 'hidden text-sm font-extrabold text-white sm:inline'}>LR JPRD</span>
                            </Link>

                            <div className={isLight ? 'ml-8 hidden items-center gap-5 sm:flex' : 'ml-4 hidden items-center gap-0.5 sm:flex'}>
                                {navItems.map((item) =>
                                    canAccess(item.key) && (
                                        <NavLink key={item.key} href={route(item.href)} active={route().current(item.routePattern)} variant={variant} className={isLight ? 'gap-2 px-3 py-2' : ''}>
                                            {isLight && <NavIcon>{item.icon}</NavIcon>}
                                            <span>{item.label}</span>
                                        </NavLink>
                                    )
                                )}
                                {isMasterAdmin && (
                                    <NavLink href={route('admin.access.index')} active={route().current('admin.access.*')} variant={variant} className={isLight ? 'gap-2 px-3 py-2' : ''}>
                                        {isLight && <NavIcon>▣</NavIcon>}
                                        <span>Akses</span>
                                    </NavLink>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="hidden sm:block">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button className={isLight
                                            ? 'flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700'
                                            : 'flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 shadow-sm transition hover:border-violet-500/50 hover:text-violet-300'}>
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.name} className="h-6 w-6 rounded object-cover" />
                                            ) : (
                                                <div className={isLight ? 'flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-[10px] font-bold text-emerald-700' : 'flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-violet-600 to-fuchsia-600 text-[10px] font-bold text-white'}>{userInitial}</div>
                                            )}
                                            <span className="hidden lg:inline">{user.name}</span>
                                            <svg className={isLight ? 'h-3 w-3 text-slate-700' : 'h-3 w-3 text-slate-500'} viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content>
                                        <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                        <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>

                            <button onClick={() => setShowingNavigationDropdown((prev) => !prev)}
                                className={isLight ? 'inline-flex items-center justify-center rounded-lg p-1.5 text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 sm:hidden' : 'inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white sm:hidden'}>
                                <svg className="h-5 w-5" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    <path className={showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + (isLight ? ' border-t border-emerald-100 bg-white sm:hidden' : ' border-t border-slate-700/50 bg-slate-900 sm:hidden')}>
                    <div className="space-y-0.5 px-2 py-2">
                        {navItems.map((item) =>
                            canAccess(item.key) && (
                                <ResponsiveNavLink key={item.key} href={route(item.href)} active={route().current(item.routePattern)} variant={variant}>
                                    {item.label}
                                </ResponsiveNavLink>
                            )
                        )}
                        {isMasterAdmin && (
                            <ResponsiveNavLink href={route('admin.access.index')} active={route().current('admin.access.*')} variant={variant}>Akses Pengguna</ResponsiveNavLink>
                        )}
                    </div>
                    <div className="divider px-3 py-2">
                        <div className="flex items-center gap-2.5">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.name} className="h-8 w-8 rounded-lg object-cover" />
                            ) : (
                                <div className={isLight ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700' : 'flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs font-bold text-white'}>{userInitial}</div>
                            )}
                            <div>
                                <div className={isLight ? 'text-sm font-semibold text-slate-950' : 'text-sm font-semibold text-white'}>{user.name}</div>
                                <div className={isLight ? 'text-xs text-slate-500' : 'text-xs text-slate-400'}>{user.email}</div>
                            </div>
                        </div>
                        <div className="mt-2 space-y-0.5">
                            <ResponsiveNavLink href={route('profile.edit')} variant={variant}>Profile</ResponsiveNavLink>
                            <ResponsiveNavLink method="post" href={route('logout')} as="button" variant={variant}>Log Out</ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {impersonation.is_active && (
                <div className="mx-auto mt-3 max-w-7xl px-3 sm:px-4 lg:px-6">
                    <div className="flash-warning flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span>Anda sedang melihat sebagai <strong>{user.name}</strong>{impersonation.impersonator?.name ? ` (asal: ${impersonation.impersonator.name})` : ''}</span>
                        <Link href={route('admin.access.impersonation.destroy')} method="post" as="button" replace className="btn-ghost shrink-0">Kembali</Link>
                    </div>
                </div>
            )}

            {flash.success && <div className="mx-auto mt-3 max-w-7xl px-3 sm:px-4 lg:px-6"><div className="flash-success">{flash.success}</div></div>}
            {flash.error && <div className="mx-auto mt-3 max-w-7xl px-3 sm:px-4 lg:px-6"><div className="flash-error">{flash.error}</div></div>}

            {header && (
                <header className={isLight ? 'relative overflow-hidden pt-5' : 'pt-4'}>
                    {isLight && <div className="pointer-events-none absolute right-24 top-0 hidden h-28 w-80 -skew-x-12 bg-gradient-to-r from-emerald-50 to-green-100/80 lg:block" />}
                    <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">{header}</div>
                </header>
            )}

            <main className="pb-8 pt-4">{children}</main>
        </div>
    );
}
