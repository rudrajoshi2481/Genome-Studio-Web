import React from 'react';

interface NodebarProps {
  // Add props as needed
}

export const Nodebar: React.FC<NodebarProps> = () => {
  return (
    <div className="nodebar-container">
      <div className="nodebar-header h-8 w-full border-b bg-muted/20 px-4 flex items-center justify-between backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="nodebar-title flex justify-between w-full">
          <span className="font-medium">Nodebar</span>
        </div>
      </div>
      {/* Add your nodebar content here */}
    </div>
  );
};

export default Nodebar;
