import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const telegramBotUsername = 'SSDP_Kedah_Bot';

function buildTelegramCommand(voter, commandPrefix) {
    const identityNumber = voter?.no_kp || voter?.old_ic || '';

    return identityNumber ? `/${commandPrefix} ${identityNumber}` : '';
}

function buildKemasCulaCommand(voter) {
    return buildTelegramCommand(voter, 'kemascula');
}

function buildKemasTelCommand(voter) {
    return buildTelegramCommand(voter, 'kemastel');
}

function SearchResultCard({ voter, onClear, onOpenTelegram, telegramReady }) {
    if (!voter) {
        return null;
    }

    const fields = [
        ['Nama', voter.name],
        ['No. IC Baru', voter.no_kp || '-'],
        ['No. IC Lama', voter.old_ic || '-'],
        ['Tel. Bimbit', voter.phone_mobile || '-'],
        ['Tel. Rumah', voter.phone_home || '-'],
        ['UDM', voter.dm],
        ['Lokaliti', voter.locality],
        ['Jantina', voter.gender],
        ['Bangsa', voter.race],
        ['Status Culaan', voter.cula_display_label || voter.cula_code],
        ['Alamat', voter.address],
    ];

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Detail Pemilih</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900">{voter.name}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Maklumat penuh pemilih yang dipilih daripada cadangan carian.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenTelegram(voter, 'kemascula')}
                        disabled={!telegramReady}
                        className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Kemas Cula
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenTelegram(voter, 'kemastel')}
                        disabled={!telegramReady}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Kemaskini Tel
                    </button>
                    <button
                        type="button"
                        onClick={onClear}
                        className="rounded-xl bg-gray-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-600"
                    >
                        Buang Pilihan
                    </button>
                </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {fields.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
                    </div>
                ))}
            </div>

        </section>
    );
}

function SearchPanel() {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedVoter, setSelectedVoter] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [openingTelegram, setOpeningTelegram] = useState(false);
    const abortControllerRef = useRef(null);
    const requestIdRef = useRef(0);

    useEffect(() => (
        () => {
            abortControllerRef.current?.abort();
        }
    ), []);

    const handleChange = async (event) => {
        const nextQuery = event.target.value;
        setQuery(nextQuery);
        setSelectedVoter(null);
        setErrorMessage('');

        abortControllerRef.current?.abort();

        if (nextQuery.trim().length < 2) {
            setSuggestions([]);
            setSearching(false);
            setErrorMessage('');
            return;
        }

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setSearching(true);

        try {
            const response = await fetch(`${route('carian-pemilih.search')}?q=${encodeURIComponent(nextQuery)}`, {
                headers: {
                    Accept: 'application/json',
                },
                signal: controller.signal,
            });
            const contentType = response.headers.get('content-type') ?? '';

            if (response.redirected || !response.ok || !contentType.includes('application/json')) {
                throw new Error('invalid-search-response');
            }

            const payload = await response.json();
            if (requestIdRef.current === requestId) {
                setSuggestions(payload.suggestions ?? []);
                setErrorMessage('');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                setSuggestions([]);
                setErrorMessage('Carian tidak dapat dimuatkan. Sila pastikan anda masih log masuk dan cuba lagi.');
            }
        } finally {
            if (requestIdRef.current === requestId) {
                setSearching(false);
            }
        }
    };

    const handleSelectVoter = (voter) => {
        abortControllerRef.current?.abort();
        requestIdRef.current += 1;
        setSearching(false);
        setSuggestions([]);
        setQuery(voter.name ?? '');
        setSelectedVoter(voter);
    };

    const handleOpenTelegram = async (voter, commandPrefix) => {
        const command = buildTelegramCommand(voter, commandPrefix);

        if (!command) {
            setErrorMessage('No. IC pemilih tidak tersedia untuk arahan Telegram ini.');
            return;
        }

        const telegramWindow = window.open('about:blank', '_blank');
        const telegramDeepLink = `tg://resolve?domain=${telegramBotUsername}&text=${encodeURIComponent(command)}`;

        setOpeningTelegram(true);
        try {
            telegramWindow?.location.replace(telegramDeepLink);
        } catch (error) {
            telegramWindow?.close();
            setErrorMessage('Telegram tidak dapat dibuka. Sila cuba semula.');
        } finally {
            setOpeningTelegram(false);
        }
    };

    return (
        <>
            <section className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
                <div className="flex flex-col gap-3">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Carian Pemilih</p>
                        <p className="mt-1 text-sm text-slate-500">Cari mengikut nama, nombor IC, atau nombor telefon dan paparkan detail di bawah carian.</p>
                    </div>
                    <input
                        type="search"
                        value={query}
                        onChange={handleChange}
                        placeholder="Contoh: Ali, 900101025555, 0123456789"
                        className="w-full rounded-2xl border-slate-200 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />
                    {errorMessage && (
                        <p className="text-sm font-medium text-red-600">{errorMessage}</p>
                    )}
                </div>

                {(searching || suggestions.length > 0) && (
                    <div className="absolute left-5 right-5 top-[9rem] z-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                        {searching ? (
                            <div className="px-4 py-3 text-sm text-slate-500">Mencari...</div>
                        ) : (
                            suggestions.map((voter) => (
                                <button
                                    key={voter.id}
                                    type="button"
                                    onClick={() => handleSelectVoter(voter)}
                                    className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-cyan-50 last:border-b-0"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{voter.name}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            IC: {voter.no_kp || '-'} | HP: {voter.phone_mobile || '-'}
                                        </p>
                                    </div>
                                    <div className="text-right text-xs text-slate-500">
                                        <p>{voter.dm}</p>
                                        <p className="mt-1">{voter.locality}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </section>

            <SearchResultCard
                voter={selectedVoter}
                onOpenTelegram={handleOpenTelegram}
                onClear={() => {
                    setSelectedVoter(null);
                    setQuery('');
                    setSuggestions([]);
                    setSearching(false);
                    setOpeningTelegram(false);
                }}
                telegramReady={!openingTelegram && Boolean(buildKemasCulaCommand(selectedVoter))}
            />
        </>
    );
}

export default function CarianPemilih() {
    return (
        <AuthenticatedLayout
            header={(
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                            Carian Pemilih
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-slate-900">
                            Semak detail pemilih dengan pantas
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Guna carian ini untuk semak maklumat pemilih tanpa mengganggu halaman laporan graf.
                        </p>
                    </div>
                </div>
            )}
        >
            <Head title="Carian Pemilih" />

            <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
                <SearchPanel />
            </div>
        </AuthenticatedLayout>
    );
}
