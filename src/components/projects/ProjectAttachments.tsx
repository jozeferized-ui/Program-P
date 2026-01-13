'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Upload, Trash2, Loader2, Download, FileText, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getProjectAttachments, addAttachment, deleteAttachment, type AttachmentData } from '@/actions/attachments';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ProjectAttachmentsProps {
    projectId: number;
}

export function ProjectAttachments({ projectId }: ProjectAttachmentsProps) {
    const [attachments, setAttachments] = useState<AttachmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadAttachments();
    }, [projectId]);

    const loadAttachments = async () => {
        setLoading(true);
        const data = await getProjectAttachments(projectId);
        setAttachments(data);
        setLoading(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Plik jest za duży (max 5MB)');
            return;
        }

        setUploading(true);

        try {
            // Create FormData and upload to Vercel Blob or similar
            // For now, we'll use base64 encoding (not ideal for large files)
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;

                const result = await addAttachment(projectId, {
                    fileName: file.name,
                    fileUrl: base64, // In production, use Vercel Blob or S3
                    fileSize: file.size,
                    fileType: file.type,
                });

                if (result.success) {
                    loadAttachments();
                    toast.success('Plik dodany');
                } else {
                    toast.error(result.error);
                }
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            toast.error('Błąd przesyłania pliku');
            setUploading(false);
        }

        // Clear input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: number) => {
        const result = await deleteAttachment(id);
        if (result.success) {
            loadAttachments();
            toast.success('Załącznik usunięty');
        } else {
            toast.error(result.error);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-green-500" />;
        if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
        return <File className="w-5 h-5 text-blue-500" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Załączniki ({attachments.length})</h3>
                </div>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 mr-2" />
                        )}
                        Dodaj plik
                    </Button>
                </div>
            </div>

            {/* Attachments List */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : attachments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                    Brak załączników. Dodaj pierwszy!
                </p>
            ) : (
                <div className="space-y-2">
                    {attachments.map((attachment) => (
                        <div
                            key={attachment.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border group"
                        >
                            {getFileIcon(attachment.fileType)}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{attachment.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatFileSize(attachment.fileSize)} • {format(new Date(attachment.createdAt), 'dd MMM yyyy', { locale: pl })}
                                    {attachment.uploadedBy && ` • ${attachment.uploadedBy}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <a
                                    href={attachment.fileUrl}
                                    download={attachment.fileName}
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(attachment.id)}
                                >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
