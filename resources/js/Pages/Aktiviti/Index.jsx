import AktivitiCard from '@/Components/AktivitiCard';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const emptyActivity = () => ({
    tajuk: '',
    kategori: '',
    peringkat: [],
    tarikh: '',
    masa: '',
    tempat: '',
    catatan: '',
});

function Icon({ name, className = 'h-5 w-5' }) {
    const paths = {
        calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
        link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" /></>,
        lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
        copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
        plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
        eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    };

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

function ActivityFormModal({ show, editing, form, peringkatOptions, onClose, onSubmit }) {
    if (!show) return null;

    const field = (name) => ({
        value: form.data[name],
        onChange: (event) => form.setData(name, event.target.value),
    });

    const togglePeringkat = (peringkat) => {
        const current = Array.isArray(form.data.peringkat) ? form.data.peringkat : [];
        form.setData('peringkat', current.includes(peringkat)
            ? current.filter((value) => value !== peringkat)
            : [...current, peringkat]);
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg" title={editing ? 'Ubah aktiviti' : 'Tambah aktiviti'}>
            <div className="bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Jadual Aktiviti</p>
                        <h2 className="mt-1 text-lg font-black text-slate-900">{editing ? 'Ubah aktiviti' : 'Aktiviti baharu'}</h2>
                        <p className="mt-1 text-xs text-slate-500">Isi maklumat yang akan dipaparkan kepada ahli luar.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Tutup modal">x</button>
                </div>

                <form onSubmit={onSubmit} className="mt-5 space-y-4">
                    <div>
                        <InputLabel htmlFor="aktiviti-tajuk" value="Tajuk aktiviti" />
                        <input id="aktiviti-tajuk" type="text" className="input-field mt-1.5" placeholder="Contoh: Mesyuarat JPRD" {...field('tajuk')} />
                        <InputError message={form.errors.tajuk} className="mt-1" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="aktiviti-kategori" value="Kategori (pilihan)" />
                            <input id="aktiviti-kategori" type="text" list="aktiviti-kategori-list" className="input-field mt-1.5" placeholder="Mesyuarat, taklimat..." {...field('kategori')} />
                            <datalist id="aktiviti-kategori-list">
                                <option value="Mesyuarat" />
                                <option value="Taklimat" />
                                <option value="Program" />
                                <option value="Lawatan" />
                                <option value="Lain-lain" />
                            </datalist>
                            <InputError message={form.errors.kategori} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="aktiviti-tempat" value="Tempat (pilihan)" />
                            <input id="aktiviti-tempat" type="text" className="input-field mt-1.5" placeholder="Contoh: Bilik Mesyuarat JPRD" {...field('tempat')} />
                            <InputError message={form.errors.tempat} className="mt-1" />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="aktiviti-tarikh" value="Tarikh" />
                            <input id="aktiviti-tarikh" type="date" className="input-field mt-1.5" {...field('tarikh')} />
                            <InputError message={form.errors.tarikh} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="aktiviti-masa" value="Masa" />
                            <input id="aktiviti-masa" type="time" className="input-field mt-1.5" {...field('masa')} />
                            <InputError message={form.errors.masa} className="mt-1" />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Peringkat aktiviti" />
                        <p className="mt-1 text-[11px] text-slate-500">Pilih satu atau lebih peringkat yang terlibat.</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                            {peringkatOptions.map((peringkat) => {
                                const checked = Array.isArray(form.data.peringkat) && form.data.peringkat.includes(peringkat);
                                return (
                                    <label key={peringkat} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${checked ? 'border-green-300 bg-green-50 text-green-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                        <input type="checkbox" checked={checked} onChange={() => togglePeringkat(peringkat)} className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                                        <span>{peringkat}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <InputError message={form.errors.peringkat || form.errors['peringkat.0']} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="aktiviti-catatan" value="Catatan (pilihan)" />
                        <textarea id="aktiviti-catatan" rows="3" className="input-field mt-1.5 resize-y" placeholder="Maklumat ringkas untuk ahli luar..." {...field('catatan')} />
                        <InputError message={form.errors.catatan} className="mt-1" />
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} className="btn-outline w-full sm:w-auto">Batal</button>
                        <button type="submit" disabled={form.processing} className="btn-primary-lg w-full sm:w-auto">{form.processing ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Tambah aktiviti'}</button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

function PublicAccessPanel({ publicLink, hasPublicPassword, passwordEnabled }) {
    const form = useForm({ password: '', password_confirmation: '' });
    const [copied, setCopied] = useState(false);
    const [toggling, setToggling] = useState(false);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicLink);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };

    const submit = (event) => {
        event.preventDefault();
        form.put(route('aktiviti.public-password.update'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const togglePassword = () => {
        setToggling(true);
        router.put(route('aktiviti.public-password.status.update'), { enabled: !passwordEnabled }, {
            preserveScroll: true,
            onFinish: () => setToggling(false),
        });
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-green-800 to-emerald-700 p-5 text-white sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-100">Akses ahli luar</p>
                        <h2 className="mt-1 text-lg font-black">Pautan jadual awam</h2>
                    </div>
                    <div className="rounded-xl bg-white/10 p-2.5"><Icon name="link" className="h-5 w-5" /></div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-green-50">Kongsi satu pautan untuk memaparkan aktiviti akan datang kepada ahli luar.</p>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
                <div>
                    <InputLabel htmlFor="public-link" value="Pautan awam" />
                    <div className="mt-1.5 flex gap-2">
                        <input id="public-link" type="text" readOnly value={publicLink} className="input-field min-w-0 flex-1 bg-slate-50 text-[11px]" />
                        <button type="button" onClick={copyLink} className="btn-outline shrink-0 px-2.5" title="Salin pautan" aria-label="Salin pautan"><Icon name="copy" className="h-4 w-4" /> <span className="hidden sm:inline">{copied ? 'Disalin' : 'Salin'}</span></button>
                    </div>
                    <p className="mt-1.5 break-words text-[11px] text-slate-500">Pautan kekal sama walaupun password ditukar.</p>
                </div>

                <div className="border-t border-slate-100 pt-5">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <Icon name="lock" className={`h-4 w-4 ${passwordEnabled ? 'text-green-700' : 'text-slate-400'}`} />
                                <h3 className="text-sm font-black text-slate-900">Password {passwordEnabled ? 'ON' : 'OFF'}</h3>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{passwordEnabled ? 'Ahli luar perlu memasukkan password.' : hasPublicPassword ? 'Pautan boleh dibuka terus tanpa password.' : 'Cipta password dahulu untuk menghidupkan perlindungan.'}</p>
                        </div>
                        <button type="button" role="switch" aria-checked={passwordEnabled} aria-label="Hidupkan atau matikan password pautan awam" disabled={!hasPublicPassword || toggling} onClick={togglePassword} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${passwordEnabled ? 'bg-green-600' : 'bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-50`}>
                            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${passwordEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                        <Icon name="lock" className="h-4 w-4 text-green-700" />
                        <h3 className="text-sm font-black text-slate-900">{hasPublicPassword ? 'Tukar password' : 'Cipta password'}</h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{hasPublicPassword ? 'Masukkan password baharu hanya apabila perlu menukarnya.' : 'Password ini digunakan oleh semua ahli luar untuk pautan yang sama.'}</p>

                    <form onSubmit={submit} className="mt-4 space-y-3">
                        <div>
                            <InputLabel htmlFor="public-password" value="Password" />
                            <input id="public-password" type="password" autoComplete="new-password" className="input-field mt-1.5" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} placeholder="Sekurang-kurangnya 6 aksara" />
                            <InputError message={form.errors.password} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="public-password-confirmation" value="Sahkan password" />
                            <input id="public-password-confirmation" type="password" autoComplete="new-password" className="input-field mt-1.5" value={form.data.password_confirmation} onChange={(event) => form.setData('password_confirmation', event.target.value)} />
                            <InputError message={form.errors.password_confirmation} className="mt-1" />
                        </div>
                        <button type="submit" disabled={form.processing} className="btn-primary w-full">{form.processing ? 'Menyimpan...' : hasPublicPassword ? 'Simpan password baharu' : 'Aktifkan pautan'}</button>
                    </form>
                </div>
            </div>
        </section>
    );
}

function EmptyState({ past = false }) {
    return (
        <div className="rounded-2xl border-2 border-dashed border-green-200 bg-green-50/50 px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-green-600 shadow-sm"><Icon name="calendar" className="h-6 w-6" /></div>
            <h3 className="mt-3 text-sm font-black text-slate-800">{past ? 'Belum ada rekod lepas' : 'Belum ada aktiviti akan datang'}</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{past ? 'Aktiviti yang telah berlalu akan muncul di sini untuk rujukan dan pengurusan.' : 'Tambah aktiviti pertama supaya jadual boleh dikongsi kepada ahli luar.'}</p>
        </div>
    );
}

export default function Index({ upcomingActivities = [], pastActivities = [], peringkatOptions = ['JPRD', 'UDM', 'CAWANGAN'], publicLink, hasPublicPassword, passwordEnabled }) {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [showPast, setShowPast] = useState(false);
    const form = useForm(emptyActivity());

    const openCreate = () => {
        setEditing(null);
        form.clearErrors();
        form.setData(emptyActivity());
        setShowForm(true);
    };

    const openEdit = (activity) => {
        setEditing(activity);
        form.clearErrors();
        form.setData({
            tajuk: activity.tajuk ?? '',
            kategori: activity.kategori ?? '',
            peringkat: activity.peringkat ?? [],
            tarikh: activity.tarikh ?? '',
            masa: activity.masa ?? '',
            tempat: activity.tempat ?? '',
            catatan: activity.catatan ?? '',
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditing(null);
        form.reset();
        form.clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: closeForm,
        };

        if (editing) {
            form.put(route('aktiviti.update', editing.id), options);
        } else {
            form.post(route('aktiviti.store'), options);
        }
    };

    const deleteActivity = (activity) => {
        if (!window.confirm(`Padam aktiviti "${activity.tajuk}"?`)) return;
        router.delete(route('aktiviti.destroy', activity.id), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Aktiviti" />

            <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
                <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-green-800 via-green-700 to-emerald-700 p-5 text-white shadow-lg shadow-green-900/10 sm:p-7">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-100">Jadual organisasi</p>
                            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Aktiviti</h1>
                            <p className="mt-2 max-w-xl text-sm leading-relaxed text-green-50">Simpan aktiviti akan datang dan kongsi jadual yang kemas kepada ahli luar melalui satu pautan berpassword.</p>
                        </div>
                        <button type="button" onClick={openCreate} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-green-800 shadow-sm transition hover:bg-green-50 active:scale-[0.98] sm:w-auto"><Icon name="plus" className="h-4 w-4" />Tambah aktiviti</button>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-100">Akan datang</p><p className="mt-0.5 text-lg font-black">{upcomingActivities.length}</p></div>
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-100">Rekod lepas</p><p className="mt-0.5 text-lg font-black">{pastActivities.length}</p></div>
                    </div>
                </section>

                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,23rem)] lg:items-start">
                    <section className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-green-700">Paparan pengurusan</p>
                                <h2 className="mt-1 text-xl font-black text-slate-900">Aktiviti akan datang</h2>
                                <p className="mt-1 text-xs text-slate-500">Susunan bermula daripada tarikh dan masa yang paling dekat.</p>
                            </div>
                            {pastActivities.length > 0 && <button type="button" onClick={() => setShowPast((value) => !value)} className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:self-auto"><Icon name="eye" className="h-3.5 w-3.5" />{showPast ? 'Sembunyikan rekod lepas' : `Lihat rekod lepas (${pastActivities.length})`}</button>}
                        </div>

                        <div className="mt-4 space-y-3">
                            {upcomingActivities.length === 0 ? <EmptyState /> : upcomingActivities.map((activity) => <AktivitiCard key={activity.id} activity={activity} onEdit={openEdit} onDelete={deleteActivity} />)}
                        </div>

                        {showPast && (
                            <div className="mt-6 border-t border-slate-100 pt-5">
                                <div className="mb-3 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400" /><h3 className="text-sm font-black text-slate-700">Aktiviti yang telah lepas</h3></div>
                                <div className="space-y-3">{pastActivities.length === 0 ? <EmptyState past /> : pastActivities.map((activity) => <AktivitiCard key={activity.id} activity={activity} isPast onEdit={openEdit} onDelete={deleteActivity} />)}</div>
                            </div>
                        )}
                    </section>

                    <PublicAccessPanel publicLink={publicLink} hasPublicPassword={hasPublicPassword} passwordEnabled={passwordEnabled} />
                </div>
            </div>

            <ActivityFormModal show={showForm} editing={editing} form={form} peringkatOptions={peringkatOptions} onClose={closeForm} onSubmit={submit} />
        </AuthenticatedLayout>
    );
}
