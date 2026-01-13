import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EmptyPage1() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Dodatkowa strona 1</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Ta strona jest pusta.</p>
            </CardContent>
        </Card>
    );
}
