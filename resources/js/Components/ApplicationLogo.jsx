import logoUrl from '../../../public/images/logo-pas-sik.png';

export default function ApplicationLogo({ className = '', alt = 'Logo PAS Sik', ...props }) {
    return (
        <img
            {...props}
            src={logoUrl}
            alt={alt}
            className={className}
        />
    );
}
