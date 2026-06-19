import logoUrl from '../../../public/images/logo.png';

export default function ApplicationLogo({ className = '', alt = 'Logo', ...props }) {
    return (
        <img
            {...props}
            src={logoUrl}
            alt={alt}
            className={className}
        />
    );
}
