import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const userInitial = user.name.charAt(0).toUpperCase();
    const allowedModules = user.allowed_modules ?? [];
    const canAccess = (module) => allowedModules.includes(module);
    const isMasterAdmin = user.role?.is_master_admin === true;

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)]">
            <nav className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex items-center gap-8">
                            <div className="flex shrink-0 items-center">
                                <Link href={route('dashboard')} className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/30">
                                        <ApplicationLogo className="block h-5 w-5 fill-current text-white" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">LR JPRD</div>
                                        <div className="text-xs text-slate-500">Panel Semakan Cula</div>
                                    </div>
                                </Link>
                            </div>

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                {canAccess('dashboard') && (
                                    <NavLink
                                        href={route('dashboard')}
                                        active={route().current('dashboard')}
                                    >
                                        Dashboard
                                    </NavLink>
                                )}
                                {canAccess('laporan') && (
                                    <NavLink
                                        href={route('laporan.index')}
                                        active={route().current('laporan.*')}
                                    >
                                        Laporan
                                    </NavLink>
                                )}
                                {canAccess('carian-pemilih') && (
                                    <NavLink
                                        href={route('carian-pemilih.index')}
                                        active={route().current('carian-pemilih.*')}
                                    >
                                        Carian Pemilih
                                    </NavLink>
                                )}
                                {canAccess('program') && (
                                    <NavLink
                                        href={route('program.index')}
                                        active={route().current('program.*')}
                                    >
                                        Program
                                    </NavLink>
                                )}
                                {canAccess('settings') && (
                                    <NavLink
                                        href={route('settings.edit')}
                                        active={route().current('settings.edit')}
                                    >
                                        Settings
                                    </NavLink>
                                )}
                                {isMasterAdmin && (
                                    <NavLink
                                        href={route('admin.access.index')}
                                        active={route().current('admin.access.*')}
                                    >
                                        Akses Pengguna
                                    </NavLink>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center">
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-4 text-slate-600 transition hover:border-cyan-200 hover:text-slate-900 focus:outline-none"
                                            >
                                                {user.avatar_url ? (
                                                    <img
                                                        src={user.avatar_url}
                                                        alt={user.name}
                                                        className="h-9 w-9 rounded-xl object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-sm font-semibold text-white">
                                                        {userInitial}
                                                    </div>
                                                )}

                                                {user.name}

                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link
                                            href={route('profile.edit')}
                                        >
                                            Profile
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={
                        (showingNavigationDropdown ? 'block' : 'hidden') +
                        ' sm:hidden'
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        {canAccess('dashboard') && (
                            <ResponsiveNavLink
                                href={route('dashboard')}
                                active={route().current('dashboard')}
                            >
                                Dashboard
                            </ResponsiveNavLink>
                        )}
                        {canAccess('laporan') && (
                            <ResponsiveNavLink
                                href={route('laporan.index')}
                                active={route().current('laporan.*')}
                            >
                                Laporan
                            </ResponsiveNavLink>
                        )}
                        {canAccess('carian-pemilih') && (
                            <ResponsiveNavLink
                                href={route('carian-pemilih.index')}
                                active={route().current('carian-pemilih.*')}
                            >
                                Carian Pemilih
                            </ResponsiveNavLink>
                        )}
                        {canAccess('program') && (
                            <ResponsiveNavLink
                                href={route('program.index')}
                                active={route().current('program.*')}
                            >
                                Program
                            </ResponsiveNavLink>
                        )}
                        {canAccess('settings') && (
                            <ResponsiveNavLink
                                href={route('settings.edit')}
                                active={route().current('settings.edit')}
                            >
                                Settings
                            </ResponsiveNavLink>
                        )}
                        {isMasterAdmin && (
                            <ResponsiveNavLink
                                href={route('admin.access.index')}
                                active={route().current('admin.access.*')}
                            >
                                Akses Pengguna
                            </ResponsiveNavLink>
                        )}
                    </div>

                    <div className="border-t border-gray-200 pb-1 pt-4">
                        <div className="flex items-center gap-3 px-4">
                            {user.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.name}
                                    className="h-12 w-12 rounded-2xl object-cover"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-base font-semibold text-white">
                                    {userInitial}
                                </div>
                            )}

                            <div>
                                <div className="text-base font-medium text-gray-800">
                                    {user.name}
                                </div>
                                <div className="text-sm font-medium text-gray-500">
                                    {user.email}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>
                                Profile
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route('logout')}
                                as="button"
                            >
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {flash.success && (
                <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
                        {flash.success}
                    </div>
                </div>
            )}

            {flash.error && (
                <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm">
                        {flash.error}
                    </div>
                </div>
            )}

            {header && (
                <header className="pt-6">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className="pb-10">{children}</main>
        </div>
    );
}
