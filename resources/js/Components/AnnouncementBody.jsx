import DOMPurify from 'dompurify';
import 'react-quill-new/dist/quill.snow.css';

export const announcementContentClass = 'announcement-content break-words text-sm leading-relaxed text-slate-700 [&_p]:my-2 [&_h2]:my-3 [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-green-300 [&_blockquote]:pl-4 [&_a]:text-green-700 [&_a]:underline';

export default function AnnouncementBody({ item }) {
    if (item.body_format !== 'html') return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{item.body}</p>;
    const fragment = DOMPurify.sanitize(item.body || '', {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 's', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'span', 'sub', 'sup'],
        ALLOWED_ATTR: ['href', 'title', 'class', 'style', 'data-list'],
        ALLOW_DATA_ATTR: false,
        RETURN_DOM_FRAGMENT: true,
    });
    fragment.querySelectorAll('*').forEach((node) => {
        const classes = [...node.classList].filter((name) => /^(ql-(align-(center|right|justify)|indent-[1-8]|font-(serif|monospace)|size-(small|large|huge)|ui))$/.test(name));
        node.removeAttribute('class');
        if (classes.length) node.className = classes.join(' ');
        const color = node.style.color;
        const background = node.style.backgroundColor;
        const align = node.style.textAlign;
        node.removeAttribute('style');
        if (/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i.test(color)) node.style.color = color;
        if (/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i.test(background)) node.style.backgroundColor = background;
        if (['left', 'center', 'right', 'justify'].includes(align)) node.style.textAlign = align;
    });
    const container = document.createElement('div');
    container.append(fragment);
    return <div className="announcement-rich-body ql-editor" dangerouslySetInnerHTML={{ __html: container.innerHTML }} />;
}
