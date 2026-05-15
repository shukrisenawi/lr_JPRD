import { Transition } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { createContext, useContext, useState } from 'react';

const DropDownContext = createContext();

const Dropdown = ({ children }) => {
    const [open, setOpen] = useState(false);
    const toggleOpen = () => setOpen((prev) => !prev);
    return (
        <DropDownContext.Provider value={{ open, setOpen, toggleOpen }}>
            <div className="relative">{children}</div>
        </DropDownContext.Provider>
    );
};

const Trigger = ({ children }) => {
    const { open, setOpen, toggleOpen } = useContext(DropDownContext);
    return (
        <>
            <div onClick={toggleOpen}>{children}</div>
            {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
        </>
    );
};

const Content = ({ align = 'right', contentClasses = 'py-1', widthClasses = 'w-44', children }) => {
    const { open, setOpen } = useContext(DropDownContext);
    const alignmentClasses = align === 'left'
        ? 'ltr:origin-top-left rtl:origin-top-right start-0'
        : 'ltr:origin-top-right rtl:origin-top-left end-0';
    return (
        <Transition show={open} enter="transition ease-out duration-150" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <div className={`absolute z-50 mt-1.5 ${alignmentClasses} ${widthClasses}`} onClick={() => setOpen(false)}>
                <div className={`overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl shadow-black/30 ` + contentClasses}>
                    {children}
                </div>
            </div>
        </Transition>
    );
};

const DropdownLink = ({ className = '', children, ...props }) => {
    return (
        <Link
            {...props}
            className={'block w-full px-3 py-2 text-left text-xs font-semibold text-slate-300 transition hover:bg-violet-500/15 hover:text-violet-300 focus:bg-violet-500/15 focus:text-violet-300 focus:outline-none ' + className}
        >
            {children}
        </Link>
    );
};

Dropdown.Trigger = Trigger;
Dropdown.Content = Content;
Dropdown.Link = DropdownLink;

export default Dropdown;
