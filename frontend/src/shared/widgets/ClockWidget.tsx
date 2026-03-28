import React, { useEffect, useState } from 'react';


const ClockWidget: React.FC = () => {
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return <h2 style={{ textAlign: 'center' }}>{time}</h2>;
};

export default ClockWidget;
