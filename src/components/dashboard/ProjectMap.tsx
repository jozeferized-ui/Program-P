'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Project } from '@/types';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ProjectMapProps {
    projects: Project[];
}

export default function ProjectMap({ projects }: ProjectMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="h-[500px] w-full bg-muted animate-pulse rounded-md" />;
    }

    const projectsWithLocation = projects.filter(p => p.lat && p.lng);
    const center: [number, number] = projectsWithLocation.length > 0
        ? [projectsWithLocation[0].lat!, projectsWithLocation[0].lng!]
        : [52.237049, 21.017532]; // Default to Warsaw

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-800';
            case 'Completed': return 'bg-red-100 text-red-800';
            case 'On Hold': return 'bg-orange-100 text-orange-800';
            case 'To Quote': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'Active': return 'Aktywny';
            case 'Completed': return 'Zakończony';
            case 'On Hold': return 'Wstrzymany';
            case 'To Quote': return 'Do Wyceny';
            default: return status;
        }
    };

    return (
        <div className="h-[500px] w-full rounded-md overflow-hidden border z-0 relative">
            <MapContainer
                center={center}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {projectsWithLocation.map(project => (
                    <Marker
                        key={project.id}
                        position={[project.lat!, project.lng!]}
                    >
                        <Popup>
                            <div className="p-2">
                                <h3 className="font-bold text-sm">{project.name}</h3>
                                <p className="text-xs text-muted-foreground">{project.address}</p>
                                <div className="mt-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                                        {getStatusLabel(project.status)}
                                    </span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
