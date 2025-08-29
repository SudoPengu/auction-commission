
import React from 'react';

type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y';

interface TimeFrameSelectorProps {
  timeFrame: TimeFrame;
  setTimeFrame: (time: TimeFrame) => void;
}

const TimeFrameSelector: React.FC<TimeFrameSelectorProps> = ({ timeFrame, setTimeFrame }) => {
  return (
    <div className="flex space-x-2 mb-6">
      {(['1D', '1W', '1M', '3M', '1Y'] as TimeFrame[]).map(time => (
        <button
          key={time}
          className={`px-3 py-1 rounded ${timeFrame === time ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          onClick={() => setTimeFrame(time)}
        >
          {time}
        </button>
      ))}
    </div>
  );
};

export default TimeFrameSelector;
