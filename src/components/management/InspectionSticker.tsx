'use client';

import React from 'react';

interface InspectionStickerProps {
    serialNumber: string;
    model: string;
    inspectionMonth: number; // 1-12
    inspectionYear: number; // 2025, 2026, 2027
    expiryMonth: number;
    expiryYear: number;
    size?: number; // default 100
}

export function InspectionSticker({
    serialNumber,
    model,
    inspectionMonth,
    inspectionYear,
    expiryMonth,
    expiryYear,
    size = 100
}: InspectionStickerProps) {
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2 - 2;
    const innerRadius = outerRadius * 0.7;
    const yearRingRadius = outerRadius * 0.85;

    // Colors - green theme
    const primaryColor = '#059669'; // emerald-600
    const darkColor = '#064e3b'; // emerald-900
    const _lightColor = '#d1fae5'; // emerald-100
    const white = '#ffffff';

    // Years to display (25, 26, 27)
    const years = [25, 26, 27];

    // Calculate month positions (12 segments)
    const monthPositions = Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180); // Start from top (-90°)
        return {
            month: i + 1,
            angle,
            x: centerX + Math.cos(angle) * (outerRadius - 8),
            y: centerY + Math.sin(angle) * (outerRadius - 8),
        };
    });

    // Calculate year positions (3 segments at bottom)
    const yearPositions = years.map((year, i) => {
        const angle = ((i - 1) * 40 + 90) * (Math.PI / 180); // Bottom area
        return {
            year,
            x: centerX + Math.cos(angle) * (yearRingRadius - 12),
            y: centerY + Math.sin(angle) * (yearRingRadius - 12),
        };
    });

    // Highlight current inspection date
    const _getMonthHighlight = (month: number) => {
        if (month === inspectionMonth) {
            return darkColor;
        }
        return 'none';
    };

    const _getYearHighlight = (year: number) => {
        const shortYear = inspectionYear % 100;
        if (year === shortYear) {
            return darkColor;
        }
        return 'none';
    };

    // Format text to fit
    const truncate = (str: string, max: number) =>
        str.length > max ? str.substring(0, max - 2) + '..' : str;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="inspection-sticker"
        >
            {/* Outer ring - green */}
            <circle
                cx={centerX}
                cy={centerY}
                r={outerRadius}
                fill={primaryColor}
                stroke={darkColor}
                strokeWidth={1}
            />

            {/* Inner white circle */}
            <circle
                cx={centerX}
                cy={centerY}
                r={innerRadius}
                fill={white}
                stroke={darkColor}
                strokeWidth={0.5}
            />

            {/* Month numbers around outer ring */}
            {monthPositions.map(({ month, x, y }) => (
                <g key={month}>
                    {/* Highlight circle for selected month */}
                    {month === inspectionMonth && (
                        <circle
                            cx={x}
                            cy={y}
                            r={size * 0.045}
                            fill={white}
                        />
                    )}
                    <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={month === inspectionMonth ? darkColor : white}
                        fontSize={size * 0.07}
                        fontWeight={month === inspectionMonth ? 'bold' : 'normal'}
                        fontFamily="Arial, sans-serif"
                    >
                        {month}
                    </text>
                </g>
            ))}

            {/* Year numbers at bottom of outer ring */}
            {yearPositions.map(({ year, x, y }) => {
                const isSelected = year === (inspectionYear % 100);
                return (
                    <g key={year}>
                        {isSelected && (
                            <circle
                                cx={x}
                                cy={y}
                                r={size * 0.05}
                                fill={white}
                            />
                        )}
                        <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={isSelected ? darkColor : white}
                            fontSize={size * 0.065}
                            fontWeight={isSelected ? 'bold' : 'normal'}
                            fontFamily="Arial, sans-serif"
                        >
                            {year}
                        </text>
                    </g>
                );
            })}

            {/* Center text */}
            <text
                x={centerX}
                y={centerY - innerRadius * 0.45}
                textAnchor="middle"
                fill={darkColor}
                fontSize={size * 0.06}
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
            >
                Skontrolowano
            </text>

            {/* Nr: serial number */}
            <text
                x={centerX}
                y={centerY - innerRadius * 0.15}
                textAnchor="middle"
                fill={darkColor}
                fontSize={size * 0.05}
                fontFamily="Arial, sans-serif"
            >
                Nr: {truncate(serialNumber, 12)}
            </text>

            {/* Naz: model/brand */}
            <text
                x={centerX}
                y={centerY + innerRadius * 0.1}
                textAnchor="middle"
                fill={darkColor}
                fontSize={size * 0.05}
                fontFamily="Arial, sans-serif"
            >
                {truncate(model, 14)}
            </text>

            {/* Next inspection line */}
            <line
                x1={centerX - innerRadius * 0.7}
                y1={centerY + innerRadius * 0.35}
                x2={centerX + innerRadius * 0.7}
                y2={centerY + innerRadius * 0.35}
                stroke={darkColor}
                strokeWidth={0.5}
            />

            {/* Nast. kontrola text */}
            <text
                x={centerX}
                y={centerY + innerRadius * 0.55}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={size * 0.045}
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
            >
                Nast. kontrola
            </text>

            {/* Expiry date */}
            <text
                x={centerX}
                y={centerY + innerRadius * 0.75}
                textAnchor="middle"
                fill={darkColor}
                fontSize={size * 0.055}
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
            >
                {String(expiryMonth).padStart(2, '0')}/{expiryYear}
            </text>
        </svg>
    );
}

// Print sheet with multiple stickers
interface StickerSheetProps {
    tools: Array<{
        serialNumber: string;
        model: string;
        brand?: string;
        inspectionMonth: number;
        inspectionYear: number;
        expiryMonth: number;
        expiryYear: number;
    }>;
    stickerSize?: number; // in mm, default 30 (3cm)
    format?: 'A4' | 'A3';
}

export function StickerSheet({ tools, stickerSize = 30, format = 'A4' }: StickerSheetProps) {
    // A4: 210x297mm, A3: 297x420mm
    const pageWidth = format === 'A4' ? 210 : 297;
    const pageHeight = format === 'A4' ? 297 : 420;
    const margin = 10; // mm

    const cols = Math.floor((pageWidth - 2 * margin) / stickerSize);
    const rows = Math.floor((pageHeight - 2 * margin) / stickerSize);
    const _stickersPerPage = cols * rows;

    // Convert mm to px (assuming 96 DPI, 1mm = 3.78px)
    const pxPerMm = 3.78;
    const stickerPx = stickerSize * pxPerMm;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="sticker-sheet-container">
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .sticker-sheet, .sticker-sheet * { visibility: visible; }
                    .sticker-sheet { 
                        position: absolute; 
                        left: 0; 
                        top: 0;
                        width: ${pageWidth}mm;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="no-print mb-4 flex gap-2">
                <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-bold"
                >
                    Drukuj naklejki
                </button>
                <span className="text-sm text-muted-foreground self-center">
                    {tools.length} naklejek, {cols}x{rows} na stronę ({format})
                </span>
            </div>

            <div
                className="sticker-sheet bg-white p-4 border rounded-lg"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${stickerPx}px)`,
                    gap: '4px',
                }}
            >
                {tools.map((tool, index) => (
                    <InspectionSticker
                        key={index}
                        serialNumber={tool.serialNumber}
                        model={tool.model || tool.brand || '-'}
                        inspectionMonth={tool.inspectionMonth}
                        inspectionYear={tool.inspectionYear}
                        expiryMonth={tool.expiryMonth}
                        expiryYear={tool.expiryYear}
                        size={stickerPx}
                    />
                ))}
            </div>
        </div>
    );
}
