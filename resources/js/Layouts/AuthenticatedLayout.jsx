import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

function NavIcon({ children }) {
    return <span className="text-sm leading-none">{children}</span>;
}

function HeaderIcon({ name, className = 'h-5 w-5' }) {
    const paths = {
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
        chevron: <path d="m9 18 6-6-6-6" />,
        down: <path d="m6 9 6 6 6-6" />,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
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
        { key: 'jawatankuasa', href: 'jawatankuasa.index', routePattern: 'jawatankuasa.*', label: 'AJK', icon: '♙' },
        { key: 'group-pemilih', href: 'group-pemilih.index', routePattern: 'group-pemilih.*', label: 'Group', icon: '☰' },
        { key: 'culaan', href: 'culaan.index', routePattern: 'culaan.*', label: 'Culaan', icon: '⊙' },
        { key: 'tambah-pemilih', href: 'tambah-pemilih.index', routePattern: 'tambah-pemilih.*', label: 'Pemilih', icon: '⊕' },
        { key: 'settings', href: 'settings.edit', routePattern: 'settings.edit', label: 'Settings', icon: '⚙' },
    ];

    return (
        <div className="min-h-screen bg-green-50/60 text-slate-800">
            <nav className="sticky top-0 z-30 border-b border-green-200 bg-white/95 shadow-sm backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
                    <div className="flex h-14 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Link href={route('dashboard')} className="flex shrink-0 items-center gap-2">
                                <ApplicationLogo className="block h-9 w-9 object-contain" />
                                <span className="hidden text-sm font-bold text-green-800 sm:inline">PAS Sik</span>
                            </Link>

                            <div className="ml-2 hidden items-stretch sm:flex">
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
                                        <button className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800 shadow-sm transition hover:border-green-300 hover:bg-green-100">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.name} className="h-6 w-6 rounded-md object-cover" />
                                            ) : (
                                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-600 text-xs font-bold text-white">{userInitial}</div>
                                            )}
                                            <span className="hidden lg:inline">{user.name}</span>
                                            <HeaderIcon name="down" className="h-3 w-3 text-green-600" />
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content widthClasses="w-72">
                                        <div className="border-b border-green-100 bg-green-50 px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.name} className="h-10 w-10 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-base font-bold text-white">{userInitial}</div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                                                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-2 py-2">
                                            <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-green-50 focus:bg-green-50">
                                                <HeaderIcon name="user" className="h-4 w-4 shrink-0 text-green-600" />
                                                <span>Profile</span>
                                                <span className="ml-auto text-xs text-slate-400">Lihat & kemas kini profil</span>
                                            </Dropdown.Link>
                                            <div className="my-1 border-t border-green-100" />
                                            <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-green-50 focus:bg-green-50">
                                                <HeaderIcon name="logout" className="h-4 w-4 shrink-0 text-green-600" />
                                                <span>Log Out</span>
                                                <span className="ml-auto text-xs text-slate-400">Keluar dari sistem</span>
                                            </Dropdown.Link>
                                        </div>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>

                            <button onClick={() => setShowingNavigationDropdown((prev) => !prev)}
                                className="inline-flex items-center justify-center rounded-lg p-1.5 text-green-700 transition hover:bg-green-100 sm:hidden">
                                <svg className="h-5 w-5" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    <path className={showingNavigationDropdown ? 'inline-flex' : 'hidden'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' border-t border-green-200 bg-white sm:hidden'}>
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
                    <div className="border-t border-green-100 px-3 py-2">
                        <div className="flex items-center gap-2.5">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.name} className="h-7 w-7 rounded-md object-cover" />
                            ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-600 text-xs font-bold text-white">{userInitial}</div>
                            )}
                            <div>
                                <div className="text-xs font-semibold text-slate-900">{user.name}</div>
                                <div className="text-xs text-slate-500">{user.email}</div>
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
