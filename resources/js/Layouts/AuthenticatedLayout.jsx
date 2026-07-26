import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

function NavIcon({ children }) {
    return <span className="flex items-center leading-none">{children}</span>;
}

function Badge({ count }) {
    if (!count || count <= 0) return null;
    const display = typeof count === 'number' ? count : (parseInt(count, 10) || 0);
    return (
        <span className="ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {display}
        </span>
    );
}

function GlowingDot() {
    return (
        <span className="relative ml-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        </span>
    );
}

function HeaderIcon({ name, className = 'h-5 w-5' }) {
    const paths = {
        user: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>,
        logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
        chevron: <path d="m9 18 6-6-6-6" />,
        down: <path d="m6 9 6 6 6-6" />,
        gear: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>,
        fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    };

    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

export default function AuthenticatedLayout({ header, children, variant = 'light' }) {
    const { auth, flash, badgeCounts } = usePage().props;
    const user = auth.user;
    const userInitial = user.name.charAt(0).toUpperCase();
    const allowedModules = user.allowed_modules ?? [];
    const canAccess = (module) => allowedModules.includes(module);
    const isMasterAdmin = user.role?.is_master_admin === true;
    const impersonation = auth.impersonation ?? { is_active: false, impersonator: null };
    const mustChangePassword = user.must_change_password ?? false;
    const pusatKhidmatBelumSemak = badgeCounts?.pusatKhidmatBelumSemak ?? 0;
    const belumDicula = badgeCounts?.belumDicula ?? 0;

    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const isLight = variant === 'light';

    const navHref = (item) => {
        if (item.params) return route(item.href, item.params);
        return route(item.href);
    };

    const navGroups = [
        { key: 'laporan', href: 'laporan.index', routePattern: 'laporan.*', label: 'Laporan', icon: <HeaderIcon name="fileText" className="h-4 w-4" /> },
        {
            label: 'Pemilih',
            icon: <HeaderIcon name="users" className="h-4 w-4" />,
            items: [
                { key: 'carian-pemilih', href: 'carian-pemilih.index', routePattern: 'carian-pemilih.*', label: 'Carian Pemilih' },
                { key: 'tambah-pemilih', href: 'tambah-pemilih.index', routePattern: 'tambah-pemilih.*', label: 'Tambah Pemilih' },
                { key: 'group-pemilih', href: 'group-pemilih.index', routePattern: 'group-pemilih.*', label: 'Group Pemilih' },
            ],
        },
        {
            label: 'Operasi',
            icon: <HeaderIcon name="calendar" className="h-4 w-4" />,
            items: [
                { key: 'dashboard', href: 'dashboard', routePattern: 'dashboard', label: 'Cula Manual' },
                { key: 'program', href: 'program.index', routePattern: 'program.*', label: 'Program' },
                { key: 'culaan', href: 'culaan.index', routePattern: 'culaan.*', label: 'Culaan', badge: belumDicula },
                { key: 'culaan-bot', href: 'culaan-bot.index', routePattern: 'culaan-bot.*', label: 'Culaan Bot' },
                { key: 'vcc', href: 'vcc.index', routePattern: 'vcc.*', label: 'VCC' },
                { key: 'kad-ten', href: 'kad-ten.index', routePattern: 'kad-ten.*', label: 'Kad 10' },
                { key: 'pusat-khidmat', href: 'pusat-khidmat.index', routePattern: 'pusat-khidmat.*', label: 'Data Pusat Khidmat', badge: pusatKhidmatBelumSemak },
            ],
        },
        {
            label: 'Pentadbiran',
            icon: <HeaderIcon name="gear" className="h-4 w-4" />,
            items: [
                { key: 'jawatankuasa', href: 'jawatankuasa.index', routePattern: 'jawatankuasa.*', label: 'Jawatankuasa' },
                { key: 'jawatankuasa.laporan', href: 'jawatankuasa.laporan', routePattern: 'jawatankuasa.laporan', label: 'Senarai AJK' },
                ...(user.access_level === 'udm' ? [{ key: 'jawatankuasa.senarai-udm', href: 'jawatankuasa.senarai-ajk-udm', routePattern: 'jawatankuasa.senarai-ajk-udm', label: 'Senarai AJK UDM' }] : []),
                { key: 'settings', href: 'settings.edit', routePattern: 'settings.edit', label: 'Settings' },
                ...(isMasterAdmin ? [{ key: 'akses', href: 'admin.access.index', routePattern: 'admin.access.*', label: 'Akses' }] : []),
                ...(isMasterAdmin ? [{ key: 'api-keys', href: 'admin.api-keys.index', routePattern: 'admin.api-keys.*', label: 'Create API' }] : []),
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
                                <span className="text-sm font-bold text-green-800">JPrD Jeneri</span>
                            </Link>

                            {!mustChangePassword && (
                            <div className="ml-2 hidden items-stretch sm:flex">
                                {navGroups.map((item) => {
                                    if (item.items) {
                                        const accessibleItems = item.items.filter(i => canAccess(i.key) || i.key === 'akses');
                                        if (accessibleItems.length === 0) return null;
                                        const hasSubBadge = accessibleItems.some(sub => sub.badge > 0);
                                        if (accessibleItems.length === 1) {
                                            const sub = accessibleItems[0];
                                            return (
                                                <NavLink key={sub.key} href={navHref(sub)} active={route().current(sub.routePattern)} variant={variant}>
                                                    <NavIcon>{item.icon}</NavIcon>
                                                    <span>{sub.label}</span>
                                                    {sub.badge > 0 && <Badge count={sub.badge} />}
                                                </NavLink>
                                            );
                                        }
                                        return (
                                            <Dropdown key={item.label}>
                                                <Dropdown.Trigger>
                                                    <button type="button" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition mx-[2px] text-slate-600 hover:bg-green-100 hover:text-green-700">
                                                        <NavIcon>{item.icon}</NavIcon>
                                                        <span>{item.label}</span>
                                                        {hasSubBadge && <GlowingDot />}
                                                        <HeaderIcon name="down" className="h-3 w-3" />
                                                    </button>
                                                </Dropdown.Trigger>
                                                <Dropdown.Content align="left" widthClasses="w-52">
                                                    {accessibleItems.map(sub => (
                                                        <Dropdown.Link key={sub.key} href={navHref(sub)} badge={sub.badge}>
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
                                        {item.badge !== undefined && <Badge count={item.badge} />}
                                    </NavLink>
                                    );
                                })}
                            </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="hidden sm:block">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button type="button" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800 shadow-sm transition hover:border-green-300 hover:bg-green-100">
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

                            <button type="button" onClick={() => setShowingNavigationDropdown((prev) => !prev)}
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
                    {!mustChangePassword && (
                    <div className="space-y-0.5 px-2 py-2">
                        {(() => {
                            const groups = [
                                { label: 'Laporan', items: [
                                    canAccess('laporan') && { href: route('laporan.index'), active: route().current('laporan.*'), label: 'Laporan' },
                                ].filter(Boolean) },
                                { label: 'Pemilih', items: [
                                    canAccess('carian-pemilih') && { href: route('carian-pemilih.index'), active: route().current('carian-pemilih.*'), label: 'Carian Pemilih' },
                                    canAccess('tambah-pemilih') && { href: route('tambah-pemilih.index'), active: route().current('tambah-pemilih.*'), label: 'Tambah Pemilih' },
                                    canAccess('group-pemilih') && { href: route('group-pemilih.index'), active: route().current('group-pemilih.*'), label: 'Group Pemilih' },
                                ].filter(Boolean) },
                                { label: 'Operasi', items: [
                                    canAccess('dashboard') && { href: route('dashboard'), active: route().current('dashboard'), label: 'Cula Manual' },
                                    canAccess('program') && { href: route('program.index'), active: route().current('program.*'), label: 'Program' },
                                    canAccess('culaan') && { href: route('culaan.index'), active: route().current('culaan.*'), label: 'Culaan', badge: belumDicula },
                                    canAccess('culaan-bot') && { href: route('culaan-bot.index'), active: route().current('culaan-bot.*'), label: 'Culaan Bot' },
                                    canAccess('vcc') && { href: route('vcc.index'), active: route().current('vcc.*'), label: 'VCC' },
                                    canAccess('kad-ten') && { href: route('kad-ten.index'), active: route().current('kad-ten.*'), label: 'Kad 10' },
                                    canAccess('pusat-khidmat') && { href: route('pusat-khidmat.index'), active: route().current('pusat-khidmat.*'), label: 'Data Pusat Khidmat', badge: pusatKhidmatBelumSemak },
                                ].filter(Boolean) },
                                { label: 'Pentadbiran', items: [
                                    canAccess('jawatankuasa') && { href: route('jawatankuasa.index'), active: route().current('jawatankuasa.*'), label: 'Jawatankuasa' },
                                    canAccess('jawatankuasa.laporan') && { href: route('jawatankuasa.laporan'), active: route().current('jawatankuasa.laporan'), label: 'Senarai AJK' },
                                    canAccess('jawatankuasa.senarai-udm') && user.access_level === 'udm' && { href: route('jawatankuasa.senarai-ajk-udm'), active: route().current('jawatankuasa.senarai-ajk-udm'), label: 'Senarai AJK UDM' },
                                    canAccess('settings') && { href: route('settings.edit'), active: route().current('settings.edit'), label: 'Settings' },
                                    isMasterAdmin && { href: route('admin.access.index'), active: route().current('admin.access.*'), label: 'Akses Pengguna' },
                                    isMasterAdmin && { href: route('admin.api-keys.index'), active: route().current('admin.api-keys.*'), label: 'Create API' },
                                ].filter(Boolean) },
                            ];
                            return groups.map(g => {
                                if (g.items.length === 0) return null;
                                const hasSubBadge = g.items.some(sub => sub.badge > 0);
                                if (g.items.length === 1) {
                                    const sub = g.items[0];
                                    return <ResponsiveNavLink key={g.label} href={sub.href} active={sub.active} variant={variant} badge={sub.badge}>{sub.label}</ResponsiveNavLink>;
                                }
                                return (
                                    <div key={g.label}>
                                        <div className="flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            <span>{g.label}</span>
                                            {hasSubBadge && <GlowingDot />}
                                        </div>
                                        {g.items.map(sub => (
                                            <ResponsiveNavLink key={sub.label} href={sub.href} active={sub.active} variant={variant} badge={sub.badge}>{sub.label}</ResponsiveNavLink>
                                        ))}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                    )}
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
