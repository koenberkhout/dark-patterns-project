const TOAST = Swal.mixin({
    toast: true,
    position: 'bottom',
    showConfirmButton: false,
    showCloseButton: true,
    timer: 4000,
    timerProgressBar: false,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

function prepareUrl(url, args = []) {
    args.forEach(arg => url = url.replace(arg[0], arg[1]));
    return url + '?' + new URLSearchParams({"api_key": apiKey});
}