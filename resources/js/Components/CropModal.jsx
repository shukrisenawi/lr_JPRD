import { useEffect, useRef } from 'react';
import 'cropperjs/dist/cropper.css';
import Cropper from 'cropperjs';

export default function CropModal({ file, onCrop, onClose }) {
    const imgRef = useRef(null);
    const cropperRef = useRef(null);

    useEffect(() => {
        if (!imgRef.current) return;
        cropperRef.current = new Cropper(imgRef.current, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: 'move',
            cropBoxMovable: true,
            cropBoxResizable: true,
            guides: true,
            center: true,
            responsive: true,
            background: false,
        });
        return () => cropperRef.current?.destroy();
    }, [file]);

    const handleCrop = () => {
        const cropper = cropperRef.current;
        if (!cropper) return;
        cropper.getCroppedCanvas({
            width: 500,
            height: 500,
            imageSmoothingQuality: 'high',
        }).toBlob((blob) => {
            if (!blob) return;
            const croppedFile = new File([blob], file.name, { type: file.type });
            onCrop(croppedFile);
        }, file.type, 0.92);
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
                    <p className="text-sm font-bold text-slate-800">Potong Gambar</p>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-4">
                    <div className="overflow-hidden rounded-lg bg-slate-100">
                        <img ref={imgRef} src={URL.createObjectURL(file)} alt="" className="max-w-full" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Batal</button>
                    <button type="button" onClick={handleCrop} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-500">Potong & Muat Naik</button>
                </div>
            </div>
        </div>
    );
}