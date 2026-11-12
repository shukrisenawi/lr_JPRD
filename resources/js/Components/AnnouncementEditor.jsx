import ReactQuill from 'react-quill-new';
import { useEffect, useRef } from 'react';
import 'react-quill-new/dist/quill.snow.css';

const modules = {
    toolbar: [
        [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ script: 'sub' }, { script: 'super' }],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        [{ align: [] }, 'blockquote', 'link', 'clean'],
    ],
};
const formats = ['font', 'size', 'header', 'bold', 'italic', 'underline', 'strike', 'color', 'background', 'script', 'list', 'indent', 'align', 'blockquote', 'link'];

export default function AnnouncementEditor({ value, onChange, disabled = false }) {
    const ref = useRef(null);
    useEffect(() => {
        const root = ref.current?.getEditor().root;
        if (root) {
            root.setAttribute('role', 'textbox');
            root.setAttribute('aria-label', 'Mesej');
            root.setAttribute('aria-multiline', 'true');
        }
        const toolbar = ref.current?.getEditingArea()?.parentElement?.querySelector('.ql-toolbar');
        const labels = { font: 'Jenis font', size: 'Saiz font', header: 'Gaya tajuk', bold: 'Tebal', italic: 'Condong', underline: 'Garis bawah', strike: 'Garis tengah', color: 'Warna teks', background: 'Warna latar teks', align: 'Penjajaran', blockquote: 'Petikan', link: 'Pautan', clean: 'Buang format' };
        Object.entries(labels).forEach(([name, label]) => {
            const element = toolbar?.querySelector(`button.ql-${name}, .ql-${name} .ql-picker-label`);
            element?.setAttribute('aria-label', label);
            element?.setAttribute('title', label);
        });
    }, []);

    return <div className="announcement-quill mt-2 rounded-lg bg-white">
        <ReactQuill ref={ref} theme="snow" value={value} readOnly={disabled} modules={modules} formats={formats}
            placeholder="Tulis mesej pengumuman di sini…"
            onChange={(html, delta, source, editor) => onChange(editor.getText().trim() ? html : '')} />
        <div className="flex justify-between gap-3 rounded-b-lg border border-t-0 border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500"><span>Quill · Editor teks berformat</span><span>Pilih teks untuk format</span></div>
    </div>;
}
