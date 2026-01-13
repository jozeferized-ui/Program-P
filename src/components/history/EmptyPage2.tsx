import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EmptyPage2() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Dodatkowa strona 2</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Ta strona jest pusta.</p>
            </CardContent>
        </Card>
    );
}
