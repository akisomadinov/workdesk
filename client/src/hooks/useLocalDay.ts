import { useEffect, useState } from "react";
import { localDate } from "@/common/models";
export default function useLocalDay() {
    const [today, setToday] = useState(localDate());
    useEffect(() => {
        const refresh = () => setToday(localDate());
        const timer = setInterval(refresh, 30000);
        window.addEventListener("focus", refresh);
        return () => {
            clearInterval(timer);
            window.removeEventListener("focus", refresh);
        };
    }, []);
    return today;
}
