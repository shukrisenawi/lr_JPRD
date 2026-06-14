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

    const navHref = (item) => {
        if (item.params) return route(item.href, item.params);
        return route(item.href);
    };

    const navGroups = [
        { key: 'laporan', href: 'laporan.index', routePattern: 'laporan.*', label: 'Laporan', icon: '▤' },
        {
            label: 'Pemilih',
            icon: '⊕',
            items: [
                { key: 'carian-pemilih', href: 'carian-pemilih.index', routePattern: 'carian-pemilih.*', label: 'Carian Pemilih' },
                { key: 'tambah-pemilih', href: 'tambah-pemilih.index', routePattern: 'tambah-pemilih.*', label: 'Tambah Pemilih' },
                { key: 'group-pemilih', href: 'group-pemilih.index', routePattern: 'group-pemilih.*', label: 'Group Pemilih' },
            ],
        },
        {
            label: 'Program',
            icon: '⌘',
            items: [
                { key: 'dashboard', href: 'dashboard', routePattern: 'dashboard', label: 'Cula Manual' },
                { key: 'program', href: 'program.index', routePattern: 'program.*', label: 'Program' },
                { key: 'culaan', href: 'culaan.index', routePattern: 'culaan.*', label: 'Culaan' },
                { key: 'vcc', href: 'vcc.index', routePattern: 'vcc.*', label: 'VCC' },
            ],
        },
        {
            label: 'Pentadbiran',
            icon: '⚙',
            items: [
                { key: 'jawatankuasa', href: 'jawatankuasa.index', routePattern: 'jawatankuasa.*', label: 'Jawatankuasa' },
                { key: 'jawatankuasa.laporan', href: 'jawatankuasa.index', params: { laporan: 1 }, routePattern: 'jawatankuasa.*', label: 'Senarai AJK' },
                { key: 'settings', href: 'settings.edit', routePattern: 'settings.edit', label: 'Settings' },
                ...(isMasterAdmin ? [{ key: 'akses', href: 'admin.access.index', routePattern: 'admin.access.*', label: 'Akses' }] : []),
            ],
        },
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
                                {navGroups.map((item) => {
                                    if (item.items) {
                                        const accessibleItems = item.items.filter(i => canAccess(i.key) || i.key === 'akses');
                                        if (accessibleItems.length === 0) return null;
                                        if (accessibleItems.length === 1) {
                                            const sub = accessibleItems[0];
                                            return (
                                                <NavLink key={sub.key} href={navHref(sub)} active={route().current(sub.routePattern)} variant={variant}>
                                                    <NavIcon>{item.icon}</NavIcon>
                                                    <span>{sub.label}</span>
                                                </NavLink>
                                            );
                                        }
                                        return (
                                            <Dropdown key={item.label}>
                                                <Dropdown.Trigger>
                                                    <button type="button" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition mx-[2px] text-slate-600 hover:bg-green-100 hover:text-green-700">
                                                        <NavIcon>{item.icon}</NavIcon>
                                                        <span>{item.label}</span>
                                                        <HeaderIcon name="down" className="h-3 w-3" />
                                                    </button>
                                                </Dropdown.Trigger>
                                                <Dropdown.Content align="left" widthClasses="w-52">
                                                    {accessibleItems.map(sub => (
                                                        <Dropdown.Link key={sub.key} href={navHref(sub)}>
                                                            {sub.label}
                                                        </Dropdown.Link>
                                                    ))}
                                                </Dropdown.Content>
                                            </Dropdown>
                                        );
                                    }
                                    if (!canAccess(item.key)) return null;
                                    return (
                                    <NavLink key={item.key} href={navHref(item)} active={route().current(item.routePattern)} variant={variant}>
                                        <NavIcon>{item.icon}</NavIcon>
                                        <span>{item.label}</span>
                                    </NavLink>
                                    );
                                })}
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
                        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Laporan</div>
                        {canAccess('laporan') && <ResponsiveNavLink href={route('laporan.index')} active={route().current('laporan.*')} variant={variant}>Laporan</ResponsiveNavLink>}
                        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Pemilih</div>
                        {canAccess('carian-pemilih') && <ResponsiveNavLink href={route('carian-pemilih.index')} active={route().current('carian-pemilih.*')} variant={variant}>Carian Pemilih</ResponsiveNavLink>}
                        {canAccess('tambah-pemilih') && <ResponsiveNavLink href={route('tambah-pemilih.index')} active={route().current('tambah-pemilih.*')} variant={variant}>Tambah Pemilih</ResponsiveNavLink>}
                        {canAccess('group-pemilih') && <ResponsiveNavLink href={route('group-pemilih.index')} active={route().current('group-pemilih.*')} variant={variant}>Group Pemilih</ResponsiveNavLink>}
                        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Program</div>
                        {canAccess('dashboard') && <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')} variant={variant}>Cula Manual</ResponsiveNavLink>}
                        {canAccess('program') && <ResponsiveNavLink href={route('program.index')} active={route().current('program.*')} variant={variant}>Program</ResponsiveNavLink>}
                        {canAccess('culaan') && <ResponsiveNavLink href={route('culaan.index')} active={route().current('culaan.*')} variant={variant}>Culaan</ResponsiveNavLink>}
                        {canAccess('vcc') && <ResponsiveNavLink href={route('vcc.index')} active={route().current('vcc.*')} variant={variant}>VCC</ResponsiveNavLink>}
                        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Pentadbiran</div>
                        {canAccess('jawatankuasa') && <ResponsiveNavLink href={route('jawatankuasa.index')} active={route().current('jawatankuasa.*')} variant={variant}>Jawatankuasa</ResponsiveNavLink>}
                        {canAccess('jawatankuasa') && <ResponsiveNavLink href={route('jawatankuasa.index', { laporan: 1 })} active={route().current('jawatankuasa.*')} variant={variant}>Senarai AJK</ResponsiveNavLink>}
                        {canAccess('settings') && <ResponsiveNavLink href={route('settings.edit')} active={route().current('settings.edit')} variant={variant}>Settings</ResponsiveNavLink>}
                        {isMasterAdmin && <ResponsiveNavLink href={route('admin.access.index')} active={route().current('admin.access.*')} variant={variant}>Akses Pengguna</ResponsiveNavLink>}
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
            {flash.warning && <div className="mx-auto mt-2 max-w-7xl px-3 sm:px-4 lg:px-6"><div className="flash-warning">{flash.warning}</div></div>}
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
