import axios from 'axios';

// NOTE: We will update the exact payload structure once you provide the IprogSMS details!
export const sendIprogSMS = async (phoneNumbers, messageText) => {
    try {
        const IPROG_API_URL = process.env.IPROG_API_URL || "https://api.iprogsms.com/send"; // Placeholder
        const IPROG_API_KEY = process.env.IPROG_API_KEY || "YOUR_API_KEY"; // Placeholder

        // Most APIs allow comma-separated bulk sends, or we can loop through them.
        // Assuming a standard payload structure for now:
        const payload = {
            token: IPROG_API_KEY,
            numbers: phoneNumbers.join(','), // e.g., "09171112222,09183334444"
            message: messageText
        };

        const response = await axios.post(IPROG_API_URL, payload);
        return response.data;
    } catch (error) {
        console.error("IprogSMS Error:", error.response?.data || error.message);
        throw new Error("Failed to dispatch SMS via IprogSMS");
    }
};