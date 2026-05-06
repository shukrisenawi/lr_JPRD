window.appConfig = {
    csrfToken: document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content'),
};
