'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Smartphone, Globe, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ToolScan {
    id: number;
    scannedAt: string;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    ipAddress: string | null;
    userAgent: string | null;
    country: string | null;
    city: string | null;
}

interface ScanHistoryDialogProps {
    toolId: number;
    toolName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ScanHistoryDialog({ toolId, toolName, isOpen, onClose }: ScanHistoryDialogProps) {
    const [scans, setScans] = useState<ToolScan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadScans();
        }
    }, [isOpen, toolId]);

    const loadScans = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/scans?toolId=${toolId}`);
            const data = await res.json();
            setScans(data.scans || []);
        } catch (error) {
            console.error('Failed to load scans:', error);
        }
        setLoading(false);
    };

    const parseUserAgent = (ua: string | null) => {
        if (!ua) return 'Nieznane urządzenie';
        if (ua.includes('iPhone')) return 'iPhone';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iPad')) return 'iPad';
        if (ua.includes('Mac')) return 'Mac';
        if (ua.includes('Windows')) return 'Windows';
        return 'Przeglądarka';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Historia skanowań: {toolName}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : scans.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Brak zarejestrowanych skanów</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {scans.map((scan) => (
                            <div
                                key={scan.id}
                                className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border"
                            >
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <span className="font-medium">
                                            {format(new Date(scan.scannedAt), 'dd MMM yyyy, HH:mm', { locale: pl })}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Smartphone className="w-3 h-3" />
                                            {parseUserAgent(scan.userAgent)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Globe className="w-3 h-3" />
                                            {scan.ipAddress || 'Brak IP'}
                                        </div>
                                    </div>

                                    {scan.latitude && scan.longitude && (
                                        <div className="mt-2">
                                            <a
                                                href={`https://www.google.com/maps?q=${scan.latitude},${scan.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                            >
                                                <MapPin className="w-3 h-3" />
                                                Zobacz na mapie ({scan.accuracy ? `±${Math.round(scan.accuracy)}m` : 'GPS'})
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
