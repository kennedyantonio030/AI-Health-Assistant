'use client'
import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';

const MetriportConnect = ({ userId }: { userId: string }) => {
    const [connectToken, setConnectToken] = useState(null);

    useEffect(() => {
        const fetchToken = async () => {
            const response = await fetch("/api/metriport-token", {
                method: "POST",
                body: JSON.stringify({ userId }),
                headers: {
                    "Content-Type": "application/json"
                }
            }).then(res => res.json());
            console.log(response);
            const token = response.token;
            setConnectToken(token);
        };

        fetchToken();
    }, [userId]);

    const handleClick = () => {
        window.open(`https://connect.metriport.com/?token=${connectToken}&sandbox=false&colorMode=light&providers=fitbit,garmin,withings,oura,google,whoop,cronometer,dexcom,apple", "_blank", "noopener,noreferrer"`);
    };

    return (
        <Button onClick={handleClick} disabled={!connectToken} className="w-[200px]">
            Connect your health data
        </Button>
    );
};

export default MetriportConnect;