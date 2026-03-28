import React, { useState } from 'react';

const CounterWidget: React.FC = () => {
  const [count, setCount] = useState<number>(0);
  return (
    <div className="counter-widget" style={{ textAlign: 'center' }}>
      <h2>{count}</h2>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
};

export default CounterWidget;
