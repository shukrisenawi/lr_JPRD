import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

function buildTelegramLink(command, identity) {
    const payload = identity ? `/${command} ${identity}` : `/${command}`;

    return `tg://resolve?domain=SSDP_Kedah_Bot&text=${encodeURIComponent(payload)}`;
}

export default function CulaanIndex({ filters, summary, udms, localities, voters }) {
    const suggestionsAbort = useRef(null);
    const [search, setSearch] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [searchError, setSearchError] = useState('');
    const [formState, setFormState] = useState({
        udm: filters.udm ?? '',
        locality: filters.locality ?? '',
        show_marked: Boolean(filters.show_marked),
    });

    useEffect(() => {
        setFormState({
            udm: filters.udm ?? '',
            locality: filters.locality ?? '',
            show_marked: Boolean(filters.show_marked),
        });
    }, [filters.locality, filters.show_marked, filters.udm]);

    const rows = useMemo(() => {
        if (search.trim().length >= 2 && suggestions.length > 0) {
            return suggestions;
        }

        if (search.trim().length >= 2 && !searching) {
            return suggestions;
        }

        return voters;
    }, [search, searching, suggestions, voters]);

    const applyFilters = (nextState) => {
        router.get(route('culaan.index'), nextState, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const updateFilter = (key, value) => {
        const nextState = {
            ...formState,
            [key]: value,
        };

        if (key === 'udm' && value !== formState.udm) {
            nextState.locality = '';
        }

        setFormState(nextState);
        applyFilters(nextState);
    };

    const handleSearchChange = async (event) => {
        const value = event.target.value;
        setSearch(value);
        setSearchError('');
        suggestionsAbort.current?.abort();

        if (value.trim().length < 2) {
            setSuggestions([]);
            setSearching(false);
            return;
        }

        const controller = new AbortController();
        suggestionsAbort.current = controller;
        setSearching(true);

        const params = new URLSearchParams({
            q: value,
            udm: formState.udm,
            locality: formState.locality,
            show_marked: formState.show_marked ? '1' : '0',
        });

        try {
            const response = await fetch(`${route('culaan.search')}?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const payload = await response.json();
            setSuggestions(payload.suggestions ?? []);
        } catch (error) {
            if (error.name !== 'AbortError') {
                setSuggestions([]);
                setSearchError('Carian tidak berjaya dimuatkan.');
            }
        } finally {
            setSearching(false);
        }
    };

    const markVoter = (voter) => {
        router.post(route('culaan.mark.store', voter.id), {}, {
            preserveScroll: true,
        });
    };

    const unmarkVoter = (voter) => {
        router.delete(route('culaan.mark.destroy', voter.id), {
            preserveScroll: true,
        });
    };

    const visibleTotal = search.trim().length >= 2 ? rows.length : summary.total;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="label-section">Culaan</p>
                    <h2 className="mt-0.5 heading-lg">Senarai kerja pemilih belum cula</h2>
                    <p className="text-muted mt-0.5">Tapis ikut UDM dan lokaliti, kemudian kemas data atau tandakan rekod yang sudah diurus.</p>
                </div>
            }
        >
            <Head title="Culaan" />

            <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 lg:px-6">
                <section className="card p-4 sm:p-5">
                    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <InputLabel htmlFor="culaan-udm" value="UDM" />
                                <select
                                    id="culaan-udm"
                                    value={formState.udm}
                                    onChange={(event) => updateFilter('udm', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua UDM</option>
                                    {udms.map((udm) => (
                                        <option key={udm} value={udm}>{udm}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <InputLabel htmlFor="culaan-locality" value="Lokaliti" />
                                <select
                                    id="culaan-locality"
                                    value={formState.locality}
                                    onChange={(event) => updateFilter('locality', event.target.value)}
                                    className="input-field mt-1.5"
                                >
                                    <option value="">Semua Lokaliti</option>
                                    {localities.map((locality) => (
                                        <option key={locality} value={locality}>{locality}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end">
                                <label className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-xs text-slate-300">
                                    <span>Dah Ditanda</span>
                                    <input
                                        type="checkbox"
                                        checked={formState.show_marked}
                                        onChange={(event) => updateFilter('show_marked', event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <div>
                                <InputLabel htmlFor="culaan-search" value="Cari Pemilih" />
                                <TextInput
                                    id="culaan-search"
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="input-field mt-1.5"
                                    placeholder="Nama, IC, telefon, UDM atau lokaliti"
                                />
                                {searchError && <InputError className="mt-1.5" message={searchError} />}
                            </div>
                            <div className="flex items-end">
                                <div className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-right">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Jumlah Paparan</p>
                                    <p className="mt-1 text-2xl font-black text-white">{visibleTotal}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700/60 text-xs">
                            <thead className="table-header">
                                <tr>
                                    <th className="px-3 py-2 text-left">Nama</th>
                                    <th className="px-3 py-2 text-left">IC</th>
                                    <th className="px-3 py-2 text-left">Telefon</th>
                                    <th className="px-3 py-2 text-left">UDM</th>
                                    <th className="px-3 py-2 text-left">Lokaliti</th>
                                    <th className="px-3 py-2 text-left">Status Cula</th>
                                    <th className="px-3 py-2 text-left">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/40 bg-slate-800/30 text-slate-300">
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-3 py-4 text-center text-slate-400">
                                            {searching ? 'Mencari...' : 'Tiada pemilih untuk paparan ini.'}
                                        </td>
                                    </tr>
                                )}

                                {rows.map((voter) => (
                                    <tr key={voter.id} className="hover:bg-slate-700/20">
                                        <td className="px-3 py-2.5 align-top">
                                            <p className="font-bold text-white">{voter.name}</p>
                                            {voter.is_marked && (
                                                <span className="mt-1 inline-flex rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-300">
                                                    Dah Ditanda
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 align-top">{voter.no_kp || voter.old_ic || '-'}</td>
                                        <td className="px-3 py-2.5 align-top">{voter.phone_mobile || voter.phone_home || '-'}</td>
                                        <td className="px-3 py-2.5 align-top">{voter.dm || '-'}</td>
                                        <td className="px-3 py-2.5 align-top">{voter.locality || '-'}</td>
                                        <td className="px-3 py-2.5 align-top">
                                            <span className="inline-flex rounded-md bg-slate-700/80 px-2 py-1 text-[10px] font-bold text-slate-200">
                                                {voter.cula_display_label || voter.cula_code || 'BELUM DICULA'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 align-top">
                                            <div className="flex flex-wrap gap-2">
                                                <a
                                                    href={buildTelegramLink('kemascula', voter.telegram_identity)}
                                                    className="btn-ghost px-2.5 py-1.5 text-[10px]"
                                                >
                                                    Kemas Cula
                                                </a>
                                                <a
                                                    href={buildTelegramLink('kemastel', voter.telegram_identity)}
                                                    className="btn-ghost px-2.5 py-1.5 text-[10px]"
                                                >
                                                    Kemas Tel
                                                </a>
                                                {voter.is_marked ? (
                                                    <button type="button" onClick={() => unmarkVoter(voter)} className="btn-danger px-2.5 py-1.5 text-[10px]">
                                                        Buka Semula
                                                    </button>
                                                ) : (
                                                    <button type="button" onClick={() => markVoter(voter)} className="rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/25">
                                                        Tanda Dah Cula
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
