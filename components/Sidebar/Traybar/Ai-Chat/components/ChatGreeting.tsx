"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Dna } from "lucide-react";

function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const GREETINGS = [
  "How can I help with your research today?",
  "Ready to explore your genomic data?",
  "What are you working on today?",
  "Let me know when you're ready to begin.",
  "What are your thoughts today?",
  "Where would you like to start?",
];

export const ChatGreeting = () => {
  const [greeting, setGreeting] = useState(GREETINGS[2]);

  useEffect(() => {
    const timeGreeting = getGreetingByTime();
    const words = [
      `${timeGreeting}! How can I help with your research today?`,
      ...GREETINGS,
    ];
    setGreeting(words[Math.floor(Math.random() * words.length)]);
  }, []);

  return (
    <motion.div
      key="welcome"
      className="mx-auto my-4 h-24 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-full bg-primary/10">
            <Dna className="size-4 text-primary" />
          </div>
        </div>
        <h1 className="text-sm font-medium text-muted-foreground max-w-xs">
          {greeting}
        </h1>
      </div>
    </motion.div>
  );
};

export default ChatGreeting;
