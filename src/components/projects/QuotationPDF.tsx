import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { QuotationItem } from '@/types';

// Register font for Polish characters
Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
    fontWeight: 'normal'
});

Font.register({
    family: 'Roboto-Bold',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
    fontWeight: 'bold'
});

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Roboto',
        fontSize: 10,
        color: '#000000'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        alignItems: 'center'
    },
    logoPlaceholder: {
        width: 100,
        height: 50,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        border: '1pt solid #CCCCCC'
    },
    logoText: {
        color: '#999999',
        fontSize: 12
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        fontFamily: 'Roboto-Bold',
        marginBottom: 5
    },
    subtitle: {
        fontSize: 12
    },
    dateContainer: {
        width: 100,
        alignItems: 'flex-end'
    },
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderColor: '#D9D9D9'
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row'
    },
    tableCol: {
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#D9D9D9',
        padding: 5
    },
    // Column widths
    colDesc: { width: '40%' },
    colQty: { width: '10%', textAlign: 'right' },
    colUnit: { width: '10%', textAlign: 'center' },
    colPrice: { width: '13%', textAlign: 'right' },
    colPriceGross: { width: '13%', textAlign: 'right' },
    colTotal: { width: '14%', textAlign: 'right' },

    // Header Styles
    tableHeader: {
        backgroundColor: '#4472C4',
        color: '#FFFFFF',
        fontFamily: 'Roboto-Bold'
    },

    // Section Header
    sectionHeader: {
        backgroundColor: '#70AD47',
        color: '#FFFFFF',
        fontFamily: 'Roboto-Bold',
        paddingLeft: 10
    },

    // Subtotal
    subtotalRow: {
        backgroundColor: '#D9E1F2',
        fontFamily: 'Roboto-Bold'
    },

    // Grand Total
    grandTotalRow: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center'
    },
    grandTotalLabel: {
        fontSize: 12,
        fontFamily: 'Roboto-Bold',
        marginRight: 10
    },
    grandTotalValue: {
        fontSize: 12,
        fontFamily: 'Roboto-Bold',
        backgroundColor: '#4472C4',
        color: '#FFFFFF',
        padding: 8,
        minWidth: 100,
        textAlign: 'center'
    }
});

interface QuotationPDFProps {
    items: QuotationItem[];
    projectId: number;
    quotationTitle: string;
}

export const QuotationPDF: React.FC<QuotationPDFProps> = ({ items, projectId, quotationTitle }) => {
    // Group items by section
    const groupedItems: Record<string, QuotationItem[]> = {};
    items.forEach(item => {
        const section = item.section || 'Inne';
        if (!groupedItems[section]) {
            groupedItems[section] = [];
        }
        groupedItems[section].push(item);
    });

    const sections = Object.keys(groupedItems).sort((a, b) => {
        if (a === 'Inne') return 1;
        if (b === 'Inne') return -1;
        return a.localeCompare(b);
    });

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoText}>LOGO</Text>
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>WYCENA PROJEKTU</Text>
                        <Text style={styles.subtitle}>{quotationTitle || `Projekt #${projectId}`}</Text>
                    </View>
                    <View style={styles.dateContainer}>
                        <Text>Data: {new Date().toLocaleDateString('pl-PL')}</Text>
                    </View>
                </View>

                {/* Table Header */}
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={[styles.tableCol, styles.colDesc]}><Text>Opis</Text></View>
                        <View style={[styles.tableCol, styles.colQty]}><Text>Ilość</Text></View>
                        <View style={[styles.tableCol, styles.colUnit]}><Text>Jm</Text></View>
                        <View style={[styles.tableCol, styles.colPrice]}><Text>Cena netto</Text></View>
                        <View style={[styles.tableCol, styles.colPriceGross]}><Text>Cena z marżą</Text></View>
                        <View style={[styles.tableCol, styles.colTotal]}><Text>Wartość</Text></View>
                    </View>

                    {sections.map((section) => {
                        const sectionItems = groupedItems[section];
                        const sectionTotal = sectionItems.reduce((sum, item) => sum + item.total, 0);

                        return (
                            <React.Fragment key={section}>
                                {/* Section Header */}
                                <View style={[styles.tableRow, styles.sectionHeader]}>
                                    <View style={[styles.tableCol, { width: '100%' }]}><Text>{section}</Text></View>
                                </View>

                                {/* Items */}
                                {sectionItems.map((item, index) => {
                                    const priceWithMargin = item.unitPrice * (1 + (item.margin || 0) / 100);
                                    const isEven = index % 2 === 0;
                                    const rowStyle = { backgroundColor: isEven ? '#E2EFDA' : '#FFFFFF' };

                                    return (
                                        <View key={item.id} style={[styles.tableRow, rowStyle]}>
                                            <View style={[styles.tableCol, styles.colDesc]}><Text>{item.description}</Text></View>
                                            <View style={[styles.tableCol, styles.colQty]}><Text>{item.quantity}</Text></View>
                                            <View style={[styles.tableCol, styles.colUnit]}><Text>{item.unit}</Text></View>
                                            <View style={[styles.tableCol, styles.colPrice]}><Text>{item.unitPrice.toFixed(2)} zł</Text></View>
                                            <View style={[styles.tableCol, styles.colPriceGross]}><Text>{priceWithMargin.toFixed(2)} zł</Text></View>
                                            <View style={[styles.tableCol, styles.colTotal]}><Text>{item.total.toFixed(2)} zł</Text></View>
                                        </View>
                                    );
                                })}

                                {/* Section Subtotal */}
                                <View style={[styles.tableRow, styles.subtotalRow]}>
                                    <View style={[styles.tableCol, { width: '86%', textAlign: 'right' }]}><Text>Suma {section}:</Text></View>
                                    <View style={[styles.tableCol, styles.colTotal]}><Text>{sectionTotal.toFixed(2)} zł</Text></View>
                                </View>
                            </React.Fragment>
                        );
                    })}
                </View>

                {/* Grand Total */}
                <View style={styles.grandTotalRow}>
                    <Text style={styles.grandTotalLabel}>SUMA CAŁKOWITA:</Text>
                    <Text style={styles.grandTotalValue}>{totalAmount.toFixed(2)} PLN</Text>
                </View>
            </Page>
        </Document>
    );
};
