export default function ApplicationLogo({ className = '', alt = 'Logo PAS Sik', ...props }) {
    return (
        <img
            {...props}
            src="/images/logo-pas-sik.png"
            alt={alt}
            className={className}
        />
    );
}
