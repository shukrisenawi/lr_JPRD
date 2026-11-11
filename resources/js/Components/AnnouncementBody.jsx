import DOMPurify from 'dompurify';

export const announcementContentClass = 'announcement-content break-words text-sm leading-relaxed text-slate-700 [&_p]:my-2 [&_h2]:my-3 [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-green-300 [&_blockquote]:pl-4 [&_a]:text-green-700 [&_a]:underline';

export default function AnnouncementBody({ item }) {
    if (item.body_format !== 'html') return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{item.body}</p>;
    const html = DOMPurify.sanitize(item.body || '', {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 's', 'h2', 'ul', 'ol', 'li', 'blockquote', 'a'],
        ALLOWED_ATTR: ['href', 'title'],
        ALLOW_DATA_ATTR: false,
    });
    return <div className={announcementContentClass} dangerouslySetInnerHTML={{ __html: html }} />;
}
