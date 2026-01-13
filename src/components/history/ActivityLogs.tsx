import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ActivityLogs() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Logi aktywności</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Tu będą wyświetlane ostatnie aktywności w systemie.</p>
            </CardContent>
        </Card>
    );
}
