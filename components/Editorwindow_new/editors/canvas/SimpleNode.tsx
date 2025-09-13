import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { SimpleNodeProps } from './types';

// Simple node component for workflows
export const SimpleNode: React.FC<SimpleNodeProps> = ({ data }) => {
  return (
    <Card className="min-w-[200px] shadow-md">
      <CardHeader className="pb-2">
        <div className="text-lg font-bold">{data.label}</div>
        <div className="text-sm text-muted-foreground">{data.type}</div>
      </CardHeader>
    </Card>
  );
};
