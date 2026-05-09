import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

function ProgramCard({ program, isActive, onSelect }) {
    return (
        <button
            type="button"
            onClick={() => onSelect(program.id)}
            className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                isActive
                    ? 'border-cyan-300 bg-cyan-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/60'
            }`}
        >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                {program.tarikh} • {program.masa}
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">{program.tajuk}</h3>
            <p className="mt-1 text-sm text-slate-500">{program.tempat}</p>
            <p className="mt-3 text-xs font-medium text-slate-500">
                {program.attendees_count} pemilih direkod hadir
            </p>
        </button>
    );
}

function VoterDetailCard({ voter, onAdd, adding }) {
    if (!voter) {
        return null;
    }

    const fields = [
        ['Nama', voter.name],
        ['No. IC Baru', voter.no_kp || '-'],
        ['No. IC Lama', voter.old_ic || '-'],
        ['Tel. Bimbit', voter.phone_mobile || '-'],
        ['Tel. Rumah', voter.phone_home || '-'],
        ['UDM', voter.dm || '-'],
        ['Lokaliti', voter.locality || '-'],
        ['Jantina', voter.gender || '-'],
        ['Bangsa', voter.race || '-'],
        ['Status Culaan', voter.cula_display_label || voter.cula_code || '-'],
        ['Alamat', voter.address || '-'],
    ];

    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                        Pemilih Dipilih
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">{voter.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Semak maklumat pemilih dan tekan butang di bawah untuk tandakan kehadiran ke program semasa.
                    </p>
                </div>

                <PrimaryButton
                    type="button"
                    onClick={() => onAdd(voter)}
                    disabled={adding}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700"
                >
                    {adding ? 'Menyimpan...' : 'Tambah ke Program'}
                </PrimaryButton>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {fields.map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {label}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function SearchVoterPanel({ selectedProgram }) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedVoter, setSelectedVoter] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [adding, setAdding] = useState(false);
    const abortControllerRef = useRef(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        abortControllerRef.current?.abort();
        setQuery('');
        setSuggestions([]);
        setSelectedVoter(null);
        setSearching(false);
        setErrorMessage('');
    }, [selectedProgram?.id]);

    useEffect(() => () => abortControllerRef.current?.abort(), []);

    const handleChange = async (event) => {
        const nextQuery = event.target.value;

        setQuery(nextQuery);
        setSelectedVoter(null);
        setErrorMessage('');
        abortControllerRef.current?.abort();

        if (!selectedProgram) {
            setSuggestions([]);
            setSearching(false);
            return;
        }

        if (nextQuery.trim().length < 2) {
            setSuggestions([]);
            setSearching(false);
            return;
        }

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setSearching(true);

        try {
            const response = await fetch(
                `${route('program.search', selectedProgram.id)}?q=${encodeURIComponent(nextQuery)}`,
                {
                    headers: {
                        Accept: 'application/json',
                    },
                    signal: controller.signal,
                },
            );

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message || 'Carian program gagal dimuatkan.');
            }

            if (requestIdRef.current === requestId) {
                setSuggestions(payload.suggestions ?? []);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                setSuggestions([]);
                setErrorMessage('Carian pemilih gagal dimuatkan. Sila cuba semula.');
            }
        } finally {
            if (requestIdRef.current === requestId) {
                setSearching(false);
            }
        }
    };

    const handleAddVoter = async (voter) => {
        if (!selectedProgram) {
            return;
        }

        setAdding(true);

        router.post(route('program.attendees.store', selectedProgram.id), voter, {
            preserveScroll: true,
            onSuccess: () => {
                setQuery('');
                setSuggestions([]);
                setSelectedVoter(null);
                setErrorMessage('');
            },
            onError: () => {
                setErrorMessage('Pemilih tidak berjaya direkodkan. Sila cuba semula.');
            },
            onFinish: () => setAdding(false),
        });
    };

    if (!selectedProgram) {
        return (
            <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">Belum ada program dipilih</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                    Tambah program baru dahulu untuk mula merekod kehadiran pemilih.
                </p>
            </section>
        );
    }

    return (
        <div className="space-y-6">
            <section className="relative rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
                <div className="flex flex-col gap-3">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                            Carian Pemilih Untuk Program
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">
                            {selectedProgram.tajuk}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Cari pemilih seperti menu Carian Pemilih, kemudian tambah ke program ini sebagai kehadiran.
                        </p>
                    </div>

                    <input
                        type="search"
                        value={query}
                        onChange={handleChange}
                        placeholder="Contoh: Ali, 900101025555, 0123456789"
                        className="w-full rounded-2xl border-slate-200 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />

                    {errorMessage && (
                        <p className="text-sm font-medium text-rose-600">{errorMessage}</p>
                    )}
                </div>

                {(searching || suggestions.length > 0) && (
                    <div className="absolute left-5 right-5 top-[10.5rem] z-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                        {searching ? (
                            <div className="px-4 py-3 text-sm text-slate-500">Mencari...</div>
                        ) : (
                            suggestions.map((voter) => (
                                <button
                                    key={voter.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedVoter(voter);
                                        setSuggestions([]);
                                        setQuery(voter.name ?? '');
                                    }}
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

            <VoterDetailCard voter={selectedVoter} onAdd={handleAddVoter} adding={adding} />
        </div>
    );
}

export default function ProgramIndex({ programs, selectedProgram }) {
    const [activeTab, setActiveTab] = useState('tambah-program');
    const defaultTempat = 'Kompleks PAS Sg PAU';
    const programForm = useForm({
        tajuk: '',
        tempat: defaultTempat,
        tarikh: '',
        masa: '',
    });

    const submitProgram = (event) => {
        event.preventDefault();
        programForm.post(route('program.store'), {
            preserveScroll: true,
            onSuccess: () => {
                programForm.reset('tajuk', 'tarikh', 'masa');
                programForm.setData('tempat', defaultTempat);
            },
        });
    };

    const selectProgram = (programId) => {
        router.get(
            route('program.index'),
            { program: programId },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const tabs = [
        {
            key: 'tambah-program',
            label: 'Tambah Program',
            description: 'Daftar program baru dengan tajuk, tempat, tarikh, dan masa.',
        },
        {
            key: 'senarai-program',
            label: 'Senarai Program',
            description: 'Pilih program yang mahu diurus dan semak jumlah kehadiran.',
        },
        {
            key: 'kehadiran-program',
            label: 'Kehadiran Program',
            description: 'Cari pemilih dan tandakan kehadiran untuk program dipilih.',
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                            Program
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-slate-900">
                            Pengurusan program dan kehadiran pemilih
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Cipta program, cari pemilih seperti modul carian, dan rekodkan kehadiran mereka untuk setiap program.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Program" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-3 shadow-panel backdrop-blur sm:p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.key;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`rounded-3xl border px-5 py-4 text-left transition ${
                                        isActive
                                            ? 'border-cyan-300 bg-cyan-50 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/60'
                                    }`}
                                >
                                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
                                        {tab.label}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {tab.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {activeTab === 'tambah-program' && (
                    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                        <form
                            onSubmit={submitProgram}
                            className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur sm:p-8"
                        >
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                                Tambah Program
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900">
                                Maklumat program baru
                            </h3>

                            <div className="mt-6 grid gap-5">
                                <div>
                                    <InputLabel htmlFor="tajuk" value="Tajuk" />
                                    <TextInput
                                        id="tajuk"
                                        value={programForm.data.tajuk}
                                        onChange={(event) => programForm.setData('tajuk', event.target.value)}
                                        className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                    />
                                    <InputError className="mt-2" message={programForm.errors.tajuk} />
                                </div>

                                <div>
                                    <InputLabel htmlFor="tempat" value="Tempat" />
                                    <TextInput
                                        id="tempat"
                                        value={programForm.data.tempat}
                                        onChange={(event) => programForm.setData('tempat', event.target.value)}
                                        className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                    />
                                    <InputError className="mt-2" message={programForm.errors.tempat} />
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <InputLabel htmlFor="tarikh" value="Tarikh" />
                                        <TextInput
                                            id="tarikh"
                                            type="date"
                                            value={programForm.data.tarikh}
                                            onChange={(event) => programForm.setData('tarikh', event.target.value)}
                                            className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                        />
                                        <InputError className="mt-2" message={programForm.errors.tarikh} />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="masa" value="Masa" />
                                        <TextInput
                                            id="masa"
                                            type="time"
                                            value={programForm.data.masa}
                                            onChange={(event) => programForm.setData('masa', event.target.value)}
                                            className="mt-2 block w-full rounded-2xl border-slate-200 px-4 py-3 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                                        />
                                        <InputError className="mt-2" message={programForm.errors.masa} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <PrimaryButton
                                    className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/30 transition hover:bg-cyan-700"
                                    disabled={programForm.processing}
                                >
                                    {programForm.processing ? 'Menyimpan...' : 'Simpan Program'}
                                </PrimaryButton>
                            </div>
                        </form>

                        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur sm:p-8">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                                Ringkasan Program
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900">
                                {programs.length} program telah direkod
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Selepas simpan, buka tab senarai atau kehadiran untuk pilih program dan mula rekod pemilih yang hadir.
                            </p>
                        </section>
                    </section>
                )}

                {activeTab === 'senarai-program' && (
                    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur sm:p-8">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                            Senarai Program
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">
                            Program yang telah direkod
                        </h3>

                        <div className="mt-6 space-y-3">
                            {programs.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                    Belum ada program. Tambah program pertama anda di tab Tambah Program.
                                </div>
                            ) : (
                                programs.map((program) => (
                                    <ProgramCard
                                        key={program.id}
                                        program={program}
                                        isActive={selectedProgram?.id === program.id}
                                        onSelect={selectProgram}
                                    />
                                ))
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'kehadiran-program' && (
                    <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                        <SearchVoterPanel selectedProgram={selectedProgram} />

                        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-panel backdrop-blur sm:p-8">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                                Kehadiran Program
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900">
                                {selectedProgram ? selectedProgram.tajuk : 'Belum dipilih'}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Senarai pemilih yang telah ditandakan hadir untuk program semasa.
                            </p>

                            <div className="mt-6 space-y-3">
                                {!selectedProgram ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                        Pilih program pada tab Senarai Program untuk lihat dan rekod kehadiran.
                                    </div>
                                ) : selectedProgram.attendees.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                        Belum ada pemilih direkod hadir untuk program ini.
                                    </div>
                                ) : (
                                    selectedProgram.attendees.map((attendee, index) => (
                                        <div
                                            key={attendee.id}
                                            className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                                        >
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                                                        Kehadiran #{index + 1}
                                                    </p>
                                                    <h4 className="mt-1 text-base font-bold text-slate-900">
                                                        {attendee.name}
                                                    </h4>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        IC: {attendee.no_kp || '-'} • HP: {attendee.phone_mobile || '-'}
                                                    </p>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {attendee.dm || '-'} • {attendee.locality || '-'}
                                                    </p>
                                                </div>

                                                <div className="rounded-2xl bg-white px-3 py-2 text-xs font-medium text-slate-500">
                                                    Direkod: {attendee.attended_at || '-'}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
