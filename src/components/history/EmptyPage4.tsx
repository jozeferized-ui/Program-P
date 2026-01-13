import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EmptyPage4() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Dodatkowa strona 4</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Ta strona jest pusta.</p>
            </CardContent>
        </Card>
    );
}
