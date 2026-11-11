import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { announcementContentClass } from './AnnouncementBody';

export default function AnnouncementEditor({ value, onChange, disabled = false }) {
    const [link, setLink] = useState('');
    const [showLink, setShowLink] = useState(false);
    const editor = useEditor({
        extensions: [StarterKit.configure({ heading: { levels: [2] }, link: { openOnClick: false }, codeBlock: false, code: false, horizontalRule: false })],
        content: value,
        editable: !disabled,
        shouldRerenderOnTransaction: true,
        editorProps: { attributes: { role: 'textbox', 'aria-label': 'Mesej', 'aria-multiline': 'true', class: `${announcementContentClass} min-h-40 max-h-72 overflow-y-auto p-4 outline-none` } },
        onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    });
    useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false }); }, [editor, value]);
    useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
    if (!editor) return null;
    const controls = [
        ['Tebal', 'bold', () => editor.chain().focus().toggleBold().run()],
        ['Condong', 'italic', () => editor.chain().focus().toggleItalic().run()],
        ['Garis tengah', 'strike', () => editor.chain().focus().toggleStrike().run()],
        ['Tajuk', 'heading', () => editor.chain().focus().toggleHeading({ level: 2 }).run()],
        ['Senarai', 'bulletList', () => editor.chain().focus().toggleBulletList().run()],
        ['Bernombor', 'orderedList', () => editor.chain().focus().toggleOrderedList().run()],
    ];
    return <div className="mt-1 overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-green-600 focus-within:ring-1 focus-within:ring-green-600">
        <div role="toolbar" aria-label="Format mesej" className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
            {controls.map(([label, mark, action]) => <button key={mark} type="button" disabled={disabled} aria-pressed={editor.isActive(mark)} onClick={action} className={`rounded px-2 py-1.5 text-xs font-semibold ${editor.isActive(mark) ? 'bg-green-100 text-green-900' : 'text-slate-700 hover:bg-slate-200'}`}>{label}</button>)}
            <button type="button" disabled={disabled} onClick={() => { setLink(editor.getAttributes('link').href || ''); setShowLink(!showLink); }} className="rounded px-2 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100">Pautan</button>
            <button type="button" disabled={disabled} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} className="rounded px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-200">Buang format</button>
        </div>
        {showLink && <div className="space-y-2 border-b border-slate-200 p-3"><label className="block text-xs font-medium text-slate-700">URL pautan<input type="url" placeholder="https://contoh.com" value={link} onChange={(e) => setLink(e.target.value)} className="mt-1 w-full rounded border-slate-300 text-sm" /></label><div className="flex gap-3"><button type="button" disabled={disabled || !/^https?:\/\//i.test(link)} onClick={() => { editor.chain().focus().extendMarkRange('link').setLink({ href: link }).run(); setShowLink(false); }} className="text-xs font-semibold text-green-800">Simpan pautan</button><button type="button" disabled={disabled} onClick={() => { editor.chain().focus().unsetLink().run(); setShowLink(false); }} className="text-xs text-slate-600">Buang pautan</button></div></div>}
        <EditorContent editor={editor} />
    </div>;
}
