import React from 'react';

const TimeZoneWidget: React.FC = () => {
    const timeZones = [
        { country: 'Switzerland', timeZone: 'Europe/Zurich' },
        { country: 'Japan', timeZone: 'Asia/Tokyo' },
        { country: 'Greece', timeZone: 'Europe/Athens' },
        { country: 'India', timeZone: 'Asia/Kolkata' },
        { country: 'Hong Kong', timeZone: 'Asia/Hong_Kong' },
    ];

    const getTimeInTimeZone = (timeZone: string) => {
        return new Date().toLocaleString('en-US', { timeZone, hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div>
            <ul>
                {timeZones.map(({ country, timeZone }) => (
                    <li key={timeZone}>
                        {country}: {getTimeInTimeZone(timeZone)}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TimeZoneWidget;