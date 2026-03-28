import React, { useEffect, useState } from 'react';

const quotes = [
  'Simplicity is the soul of efficiency. – Austin Freeman',
  'Code is like humor. When you have to explain it, it’s bad. – Cory House',
  'Any sufficiently advanced technology is indistinguishable from magic. – Arthur C. Clarke',
  "Code is like humor. When you have to explain it, it’s bad.",
  "Optimism is an engineer’s best debugger.",
"In the world of bytes and bits, persistence always wins.",
"Every bug you fix is a lesson learned.",
"Innovation thrives where curiosity meets code.",
"Great software is built one iteration at a time.",
"Behind every line of code is a human story.",
"Dream in data, build with code, change the world.",
"The best way to predict the future is to program it.",
"Keep calm and refactor on.",
"Simplicity is the ultimate sophistication—in code and design.",
"A ship in port is safe, but that’s not what ships are built for; neither is code.",
"Your code speaks for you—make sure it’s saying something worth hearing.",
"Computers are fast; programmers are patient.",
"Embrace the compiler’s complaints—they’re telling you how to improve.",
"Where there’s a will, there’s a way—and the right algorithm.",
"Great teams debug together.",
"Failure is just a stack trace away from success.",
"Think like a proton—always positive in your programming.",
"In IT, every problem is an opportunity to automate.",
"Be the developer who makes other developers’ lives easier.",
"Coding is the closest thing we have to a superpower.",
"Your password is the fortress of your identity—guard it wisely.",
"A line of code today can solve a million problems tomorrow.",
"The only constant in technology is change—embrace it.",
"Great UX begins with empathy.",
"Data-driven decisions build data-driven futures.",
"Keep your code DRY, but your mind always open.",
"Behind every responsive UI is an even more responsive team.",
"Release early, release often, and iterate toward excellence."
];

const QuoteWidget: React.FC = () => {
  const [quote, setQuote] = useState<string>('');

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  return <blockquote style={{ padding: '4px' }}>{quote}</blockquote>;
};

export default QuoteWidget;
