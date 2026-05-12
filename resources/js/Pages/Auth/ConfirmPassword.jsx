import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });
    const submit = (e) => { e.preventDefault(); post(route('password.confirm'), { onFinish: () => reset('password') }); };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />
            <div className="mb-5"><p className="label-section">Sahkan</p><h2 className="mt-0.5 heading-lg">Pengesahan diperlukan</h2><p className="text-muted mt-0.5">Sila sahkan kata laluan untuk teruskan.</p></div>
            <form onSubmit={submit}>
                <div><InputLabel htmlFor="password" value="Password" /><TextInput id="password" type="password" name="password" value={data.password} className="input-field mt-1" isFocused onChange={(e) => setData('password', e.target.value)} /><InputError message={errors.password} className="mt-1.5" /></div>
                <div className="mt-5 flex justify-end"><PrimaryButton disabled={processing}>Confirm</PrimaryButton></div>
            </form>
        </GuestLayout>
    );
}
