'use client';

export function PrintStyles() {
    return (
        <style jsx global>{`
            /* Aggressive Global scroll fix for public pages */
            html {
                overflow-x: hidden !important;
                overflow-y: auto !important;
                height: auto !important;
                -webkit-overflow-scrolling: touch;
            }
            
            body {
                overflow-x: hidden !important;
                overflow-y: auto !important;
                height: auto !important;
                min-height: 100vh !important;
                position: relative !important;
                margin: 0;
                padding: 0;
            }

            /* Fix for Next.js app router wrappers */
            main, section, article {
                overflow: visible !important;
            }

            /* Ensure No element captures scroll inappropriately */
            .fixed.inset-0:not(.pointer-events-none) {
                /* Warning: this might affect legitimate fixed overlays, but we don't have many on public pages */
            }

            @media print {
                .bg-slate-100, .bg-slate-50 { background: white !important; }
                .px-4, .pt-6, .pb-4 { display: none !important; }
                .shadow-2xl { box-shadow: none !important; }
                .scale-[0.8], .scale-75, .scale-[0.7] { transform: none !important; }
                .origin-top { transform: none !important; }
                .min-h-screen { min-height: 0 !important; }
                .overflow-x-auto { overflow: visible !important; }
                body { margin: 0; padding: 0; overflow: visible !important; }
            }

            /* Mobile-specific document scaling */
            @media (max-width: 640px) {
                .doc-scale-container {
                    transform-origin: top center;
                    display: flex;
                    justify-content: center;
                }
                .document-wrapper {
                    padding: 0 !important;
                }
            }
        `}</style>
    );
}
