import { Transition } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
    const triggerRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open, setOpen]);

    return (
        <div ref={triggerRef} onClick={toggleOpen}>{children}</div>
    );
};

const Content = ({ align = 'right', contentClasses = '', widthClasses = 'w-44', children }) => {
    const { open } = useContext(DropDownContext);
    const alignmentClasses = align === 'left'
        ? 'ltr:origin-top-left rtl:origin-top-right start-0'
        : 'ltr:origin-top-right rtl:origin-top-left end-0';
    return (
        <Transition show={open} enter="transition ease-out duration-150" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="transition ease-in duration-100" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
            <div className={`absolute z-50 mt-1.5 ${alignmentClasses} ${widthClasses}`}>
                <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg ` + contentClasses}>
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
            className={'block w-full px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-700 focus:bg-green-50 focus:text-green-700 focus:outline-none ' + className}
        >
            {children}
        </Link>
    );
};

Dropdown.Trigger = Trigger;
Dropdown.Content = Content;
Dropdown.Link = DropdownLink;

export default Dropdown;
