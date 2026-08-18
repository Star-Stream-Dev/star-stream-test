import { useState, useEffect } from 'react';

export function TypewriterEffect() {
  const [text, setText] = useState('');
  const fullText = 'STAR STREAM';

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, []);

  return (
    <h1 className="text-6xl md:text-8xl font-bold mb-6 text-gradient">
      {text}
      <span className="animate-pulse text-primary">|</span>
    </h1>
  );
}
