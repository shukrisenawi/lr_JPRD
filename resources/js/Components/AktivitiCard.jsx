function Icon({ name, className = 'h-4 w-4' }) {
    const paths = {
        calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
        location: <><path d="M20 10c0 4.5-8 11-8 11S4 14.5 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
        trash: <><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    };

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

export default function AktivitiCard({ activity, isPast = false, onEdit, onDelete, headingLevel = 'h3' }) {
    const hasActions = typeof onEdit === 'function' || typeof onDelete === 'function';
    const Heading = headingLevel === 'h2' ? 'h2' : 'h3';

    return (
        <article className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isPast ? 'border-slate-200' : 'border-green-100'}`}>
            <div className={`absolute inset-y-0 left-0 w-1 ${isPast ? 'bg-slate-300' : 'bg-green-500'}`} aria-hidden="true" />
            <div className="flex gap-3 p-4 pl-5 sm:gap-4 sm:p-5 sm:pl-6">
                <div className={`flex h-[4.25rem] w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-2xl border ${isPast ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-green-100 bg-green-50 text-green-700'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em]">{activity.tarikh_bulan || '---'}</span>
                    <span className="mt-0.5 text-2xl font-black leading-none">{activity.tarikh_hari || '--'}</span>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {activity.kategori && <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${isPast ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-700'}`}>{activity.kategori}</span>}
                        {activity.peringkat?.map((peringkat) => <span key={peringkat} className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-sky-700">{peringkat}</span>)}
                        {isPast && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Selesai</span>}
                    </div>
                    <Heading className="mt-1.5 break-words text-base font-black leading-tight text-slate-900 sm:text-lg">{activity.tajuk}</Heading>
                    <p className="mt-1 flex items-start gap-1.5 text-xs font-semibold text-slate-500">
                        <Icon name="calendar" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                        <span>{activity.tarikh_label}</span>
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-600">
                        {activity.masa && <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-3.5 w-3.5 text-green-600" />{activity.masa}</span>}
                        {activity.tempat && <span className="inline-flex items-center gap-1.5"><Icon name="location" className="h-3.5 w-3.5 text-green-600" />{activity.tempat}</span>}
                    </div>

                    {activity.catatan && <p className="mt-2 whitespace-pre-line break-words text-xs leading-relaxed text-slate-500">{activity.catatan}</p>}

                    {hasActions && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                            {onEdit && <button type="button" onClick={() => onEdit(activity)} className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-white px-2.5 py-1.5 text-xs font-bold text-green-700 transition hover:bg-green-50 active:scale-[0.98]"><Icon name="edit" className="h-3.5 w-3.5" />Ubah</button>}
                            {onDelete && <button type="button" onClick={() => onDelete(activity)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98]"><Icon name="trash" className="h-3.5 w-3.5" />Padam</button>}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}
