import { MainLayout } from '@/components/layout/main-layout';

export default function Home() {
  return (
    <MainLayout>
     
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        Select a file or create a new flow
      </div>
    </MainLayout>
  );
}
