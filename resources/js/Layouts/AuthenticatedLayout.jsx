import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

function NavIcon({ children }) {
    return <span className="text-sm leading-none text-green-600">{children}</span>;
}

export default function AuthenticatedLayout({ header, children, variant = 'light' }) {
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
        <div className="min-h-screen bg-slate-100 text-slate-800">
            <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
                    <div className="flex h-12 items-center justify-between">
                        <div className="flex items-center gap-1">
                            <Link href={route('dashboard')} className="flex shrink-0 items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-600 to-green-500 text-white shadow-sm">
                                    <ApplicationLogo className="block h-4 w-4 fill-current text-white" />
                                </div>
                                <span className="hidden text-sm font-bold text-slate-800 sm:inline">LR JPRD</span>
                            </Link>

                            <div className="ml-4 hidden items-stretch sm:flex">
                                {navItems.map((item) =>
                                    canAccess(item.key) && (
                                        <NavLink key={item.key} href={route(item.href)} active={route().current(item.routePattern)} variant={variant}>
                                            <NavIcon>{item.icon}</NavIcon>
                                            <span>{item.label}</span>
                                        </NavLink>
                                    )
                                )}
                                {isMasterAdmin && (
                                    <NavLink href={route('admin.access.index')} active={route().current('admin.access.*')} variant={variant}>
                                        <NavIcon>▣</NavIcon>
                                        <span>Akses</span>
                                    </NavLink>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="hidden sm:block">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-700">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.name} className="h-5 w-5 rounded object-cover" />
                                            ) : (
                                                <div className="flex h-5 w-5 items-center justify-center rounded bg-green-100 text-[9px] font-bold text-green-700">{userInitial}</div>
                                            )}
                                            <span className="hidden lg:inline">{user.name}</span>
                                            <svg className="h-3 w-3 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
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
                                className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-green-50 hover:text-green-700 sm:hidden">
                                <svg className="h-5 w-5" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    <path className={showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' border-t border-slate-200 bg-white sm:hidden'}>
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
                    <div className="border-t border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-2.5">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.name} className="h-7 w-7 rounded object-cover" />
                            ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded bg-green-100 text-[10px] font-bold text-green-700">{userInitial}</div>
                            )}
                            <div>
                                <div className="text-xs font-semibold text-slate-800">{user.name}</div>
                                <div className="text-[10px] text-slate-500">{user.email}</div>
                            </div>
                        </div>
                        <div className="mt-1.5 space-y-0.5">
                            <ResponsiveNavLink href={route('profile.edit')} variant={variant}>Profile</ResponsiveNavLink>
                            <ResponsiveNavLink method="post" href={route('logout')} as="button" variant={variant}>Log Out</ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {impersonation.is_active && (
                <div className="mx-auto mt-2 max-w-7xl px-3 sm:px-4 lg:px-6">
                    <div className="flash-warning flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span>Anda sedang melihat sebagai <strong>{user.name}</strong>{impersonation.impersonator?.name ? ` (asal: ${impersonation.impersonator.name})` : ''}</span>
                        <Link href={route('admin.access.impersonation.destroy')} method="post" as="button" replace className="btn-ghost shrink-0">Kembali</Link>
                    </div>
                </div>
            )}

            {flash.success && <div className="mx-auto mt-2 max-w-7xl px-3 sm:px-4 lg:px-6"><div className="flash-success">{flash.success}</div></div>}
            {flash.error && <div className="mx-auto mt-2 max-w-7xl px-3 sm:px-4 lg:px-6"><div className="flash-error">{flash.error}</div></div>}

            {header && (
                <header className="pt-4">
                    <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">{header}</div>
                </header>
            )}

            <main className="pb-6 pt-3">{children}</main>
        </div>
    );
}
