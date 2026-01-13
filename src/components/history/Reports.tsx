import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Reports() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Raporty</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Tu będą generowane raporty i podsumowania.</p>
            </CardContent>
        </Card>
    );
}
