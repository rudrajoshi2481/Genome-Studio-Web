import React from 'react';
import { CheckCircle, Clock, XCircle } from "lucide-react";

export const statusConfig = {
  Completed: { color: "bg-green-500/20 text-green-600", icon: React.createElement(CheckCircle, { className: "w-3 h-3 mr-1" }) },
  Running: { color: "bg-blue-500/20 text-blue-600", icon: React.createElement(Clock, { className: "w-3 h-3 mr-1 animate-spin" }) },
  Failed: { color: "bg-red-500/20 text-red-600", icon: React.createElement(XCircle, { className: "w-3 h-3 mr-1" }) },
  Upcoming: { color: "bg-gray-500/20 text-gray-600", icon: React.createElement(Clock, { className: "w-3 h-3 mr-1" }) }
} as const;

export const DEFAULT_NODE_DIMENSIONS = {
  width: 300,
  height: 250,
  minWidth: 200,
  maxWidth: 800,
  minHeight: 40,
  maxHeight: 600,
  collapsedHeight: 40
} as const;
