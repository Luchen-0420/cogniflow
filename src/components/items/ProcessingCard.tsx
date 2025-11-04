import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ProcessingCardProps {
  text: string;
}

export default function ProcessingCard({ text }: ProcessingCardProps) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-foreground">
              {text}
            </p>
            <p className="text-xs text-primary mt-2">
              AI正在处理中...
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse w-2/3"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
